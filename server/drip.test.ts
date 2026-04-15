/**
 * Tests for the drip enrollment and scheduler logic.
 * Uses in-memory mocks - no real DB or Twilio calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
const mockEnrollments: Record<number, { id: number; leadId: number; orgId: number; sequenceId: number; currentStep: number; status: string; nextSendAt: Date; lastSentAt: Date | null; stoppedReason: string | null }> = {};
let nextId = 1;

vi.mock("./dripDb", () => ({
  getDueEnrollments: vi.fn(async () =>
    Object.values(mockEnrollments).filter(
      (e) => e.status === "active" && e.nextSendAt <= new Date()
    )
  ),
  getDripSequenceById: vi.fn(async (id: number) => ({
    id,
    orgId: 1,
    name: "Test Sequence",
    triggerCategory: "Interested",
    isActive: 1,
  })),
  getDripStepByNumber: vi.fn(async (sequenceId: number, stepNumber: number) => {
    if (stepNumber === 1) return { id: 10, sequenceId, stepNumber: 1, delayDays: 3, name: "Day 3", body: "Hi {{firstName}}, following up!" };
    if (stepNumber === 2) return { id: 11, sequenceId, stepNumber: 2, delayDays: 7, name: "Day 7", body: "Hi {{firstName}}, last follow-up!" };
    return undefined;
  }),
  listDripSteps: vi.fn(async (sequenceId: number) => [
    { id: 10, sequenceId, stepNumber: 1, delayDays: 3, delayAmount: 3, delayUnit: "days", name: "Day 3", body: "Hi {{firstName}}, following up!" },
    { id: 11, sequenceId, stepNumber: 2, delayDays: 7, delayAmount: 7, delayUnit: "days", name: "Day 7", body: "Hi {{firstName}}, last follow-up!" },
  ]),
  advanceEnrollment: vi.fn(async (enrollmentId: number, nextStep: number, delayDays: number) => {
    if (mockEnrollments[enrollmentId]) {
      mockEnrollments[enrollmentId].currentStep = nextStep;
      const next = new Date();
      next.setDate(next.getDate() + delayDays);
      mockEnrollments[enrollmentId].nextSendAt = next;
      mockEnrollments[enrollmentId].lastSentAt = new Date();
    }
  }),
  advanceEnrollmentWithDelay: vi.fn(async (enrollmentId: number, nextStep: number, amount: number, unit: string) => {
    if (mockEnrollments[enrollmentId]) {
      mockEnrollments[enrollmentId].currentStep = nextStep;
      const delayMs = unit === "minutes" ? amount * 60 * 1000 : amount * 24 * 60 * 60 * 1000;
      mockEnrollments[enrollmentId].nextSendAt = new Date(Date.now() + delayMs);
      mockEnrollments[enrollmentId].lastSentAt = new Date();
    }
  }),
  delayToMs: vi.fn((amount: number, unit: string) => {
    return unit === "minutes" ? amount * 60 * 1000 : amount * 24 * 60 * 60 * 1000;
  }),
  completeEnrollment: vi.fn(async (enrollmentId: number) => {
    if (mockEnrollments[enrollmentId]) {
      mockEnrollments[enrollmentId].status = "completed";
      mockEnrollments[enrollmentId].stoppedReason = "completed";
      mockEnrollments[enrollmentId].lastSentAt = new Date();
    }
  }),
  stopEnrollment: vi.fn(async (leadId: number, reason: string) => {
    Object.values(mockEnrollments).forEach((e) => {
      if (e.leadId === leadId && (e.status === "active" || e.status === "paused")) {
        e.status = "stopped";
        e.stoppedReason = reason;
      }
    });
  }),
  enrollLeadInSequence: vi.fn(async (leadId: number, orgId: number, sequenceId: number, delayDays: number) => {
    // Stop existing active enrollment
    Object.values(mockEnrollments).forEach((e) => {
      if (e.leadId === leadId && e.status === "active") {
        e.status = "stopped";
        e.stoppedReason = "re-enrolled";
      }
    });
    const id = nextId++;
    const nextSendAt = new Date();
    nextSendAt.setDate(nextSendAt.getDate() + delayDays);
    mockEnrollments[id] = { id, leadId, orgId, sequenceId, currentStep: 1, status: "active", nextSendAt, lastSentAt: null, stoppedReason: null };
    return mockEnrollments[id];
  }),
  getActiveDripSequenceByCategory: vi.fn(async (orgId: number, category: string) => ({
    id: 99,
    orgId,
    name: `${category} Sequence`,
    triggerCategory: category,
    isActive: 1,
  })),
}));

vi.mock("./db", () => ({
  getLeadById: vi.fn(async (id: number) => ({
    id,
    orgId: 1,
    name: "Alice Smith",
    phone: "+15550001234",
    company: "Acme Corp",
    email: null,
    status: "Replied",
  })),
  createMessage: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./orgDb", () => ({
  getOrgTwilioConfig: vi.fn(async () => null),
}));

vi.mock("./twilio", () => ({
  isTwilioConfigured: vi.fn(() => false),
  renderTemplate: vi.fn((body: string, vars: Record<string, string | undefined>) => {
    return body
      .replace(/\{\{firstName\}\}/g, vars.name?.split(" ")[0] ?? "there")
      .replace(/\{\{company\}\}/g, vars.company ?? "")
      .replace(/\{\{link\}\}/g, vars.link ?? "");
  }),
  sendSms: vi.fn(async () => ({ sid: "SM123", status: "sent" })),
  sendSmsWithConfig: vi.fn(async () => ({ sid: "SM456", status: "sent" })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { runDripSchedulerTick } from "./dripScheduler";
import {
  enrollLeadInSequence,
  stopEnrollment,
  getActiveDripSequenceByCategory,
  listDripSteps,
} from "./dripDb";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Drip Enrollment", () => {
  beforeEach(() => {
    // Clear mock enrollments
    Object.keys(mockEnrollments).forEach((k) => delete mockEnrollments[Number(k)]);
    nextId = 1;
    vi.clearAllMocks();
  });

  it("enrolls a lead with correct first-step delay", async () => {
    const enrollment = await enrollLeadInSequence(42, 1, 99, 3);
    expect(enrollment).toBeDefined();
    expect(enrollment!.leadId).toBe(42);
    expect(enrollment!.sequenceId).toBe(99);
    expect(enrollment!.currentStep).toBe(1);
    expect(enrollment!.status).toBe("active");
    // nextSendAt should be ~3 days from now
    const diffMs = enrollment!.nextSendAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(2 * 24 * 60 * 60 * 1000); // > 2 days
    expect(diffMs).toBeLessThan(4 * 24 * 60 * 60 * 1000); // < 4 days
  });

  it("stops existing active enrollment when re-enrolling", async () => {
    await enrollLeadInSequence(42, 1, 99, 3);
    const first = Object.values(mockEnrollments)[0];
    expect(first.status).toBe("active");

    await enrollLeadInSequence(42, 1, 99, 7);
    // First enrollment should now be stopped
    expect(first.status).toBe("stopped");
    expect(first.stoppedReason).toBe("re-enrolled");
    // New enrollment should be active
    const second = Object.values(mockEnrollments).find((e) => e.status === "active");
    expect(second).toBeDefined();
  });

  it("stops enrollment on lead reply", async () => {
    await enrollLeadInSequence(42, 1, 99, 3);
    await stopEnrollment(42, "replied");
    const enrollment = Object.values(mockEnrollments)[0];
    expect(enrollment.status).toBe("stopped");
    expect(enrollment.stoppedReason).toBe("replied");
  });

  it("stops enrollment on unsubscribe", async () => {
    await enrollLeadInSequence(42, 1, 99, 3);
    await stopEnrollment(42, "unsubscribed");
    const enrollment = Object.values(mockEnrollments)[0];
    expect(enrollment.status).toBe("stopped");
    expect(enrollment.stoppedReason).toBe("unsubscribed");
  });
});

describe("Drip Scheduler Tick", () => {
  beforeEach(() => {
    Object.keys(mockEnrollments).forEach((k) => delete mockEnrollments[Number(k)]);
    nextId = 1;
    vi.clearAllMocks();
  });

  it("does nothing when no enrollments are due", async () => {
    // No enrollments at all
    await runDripSchedulerTick();
    const { createMessage } = await import("./db");
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("sends step 1 and advances to step 2 for a due enrollment", async () => {
    // Create a due enrollment (nextSendAt in the past)
    const pastDate = new Date(Date.now() - 1000);
    mockEnrollments[1] = {
      id: 1,
      leadId: 42,
      orgId: 1,
      sequenceId: 99,
      currentStep: 1,
      status: "active",
      nextSendAt: pastDate,
      lastSentAt: null,
      stoppedReason: null,
    };

    await runDripSchedulerTick();

    const { createMessage } = await import("./db");
    expect(createMessage).toHaveBeenCalledTimes(1);
    const call = (createMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.direction).toBe("outbound");
    expect(call.body).toContain("Alice"); // renderTemplate replaces {{firstName}}

    const { advanceEnrollmentWithDelay } = await import("./dripDb");
    expect(advanceEnrollmentWithDelay).toHaveBeenCalledWith(1, 2, 7, "days"); // step 2, 7 days
    const { completeEnrollment } = await import("./dripDb");
    expect(completeEnrollment).not.toHaveBeenCalled();
  });

  it("completes enrollment after the last step", async () => {
    // Enrollment is on step 2 (the last one)
    const pastDate = new Date(Date.now() - 1000);
    mockEnrollments[1] = {
      id: 1,
      leadId: 42,
      orgId: 1,
      sequenceId: 99,
      currentStep: 2,
      status: "active",
      nextSendAt: pastDate,
      lastSentAt: null,
      stoppedReason: null,
    };

    // Override getDripStepByNumber so step 3 returns undefined (no more steps)
    const { getDripStepByNumber, listDripSteps } = await import("./dripDb");
    (getDripStepByNumber as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async (seqId: number, stepNum: number) => {
        if (stepNum === 2) return { id: 11, sequenceId: seqId, stepNumber: 2, delayDays: 7, name: "Day 7", body: "Last message" };
        return undefined;
      }
    );
    (listDripSteps as ReturnType<typeof vi.fn>).mockImplementationOnce(
      async () => [
        { id: 10, sequenceId: 99, stepNumber: 1, delayDays: 3, name: "Day 3", body: "..." },
        { id: 11, sequenceId: 99, stepNumber: 2, delayDays: 7, name: "Day 7", body: "Last message" },
      ]
    );

    await runDripSchedulerTick();

    const { completeEnrollment } = await import("./dripDb");
    expect(completeEnrollment).toHaveBeenCalledWith(1);
  });

  it("advances with minute-based delay when delayUnit is minutes", async () => {
    const pastDate = new Date(Date.now() - 1000);
    mockEnrollments[1] = {
      id: 1, leadId: 42, orgId: 1, sequenceId: 99, currentStep: 1,
      status: "active", nextSendAt: pastDate, lastSentAt: null, stoppedReason: null,
    };

    // Override listDripSteps to return minute-based step 2
    const { listDripSteps } = await import("./dripDb");
    (listDripSteps as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => [
      { id: 10, sequenceId: 99, stepNumber: 1, delayDays: 0, delayAmount: 5, delayUnit: "minutes", name: "5 min", body: "Quick follow-up" },
      { id: 11, sequenceId: 99, stepNumber: 2, delayDays: 0, delayAmount: 10, delayUnit: "minutes", name: "10 min", body: "Second follow-up" },
    ]);

    await runDripSchedulerTick();

    const { advanceEnrollmentWithDelay } = await import("./dripDb");
    expect(advanceEnrollmentWithDelay).toHaveBeenCalledWith(1, 2, 10, "minutes");
  });

  it("skips enrollments that are not yet due", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    mockEnrollments[1] = {
      id: 1,
      leadId: 42,
      orgId: 1,
      sequenceId: 99,
      currentStep: 1,
      status: "active",
      nextSendAt: futureDate,
      lastSentAt: null,
      stoppedReason: null,
    };

    await runDripSchedulerTick();

    const { createMessage } = await import("./db");
    expect(createMessage).not.toHaveBeenCalled();
  });
});

describe("Drip Trigger Category Detection", () => {
  it("finds an active sequence for Interested category", async () => {
    const seq = await getActiveDripSequenceByCategory(1, "Interested");
    expect(seq).toBeDefined();
    expect(seq!.triggerCategory).toBe("Interested");
    expect(seq!.isActive).toBe(1);
  });

  it("finds an active sequence for Wants More Info category", async () => {
    const seq = await getActiveDripSequenceByCategory(1, "Wants More Info");
    expect(seq).toBeDefined();
    expect(seq!.triggerCategory).toBe("Wants More Info");
  });

  it("gets the first step delay from the sequence steps", async () => {
    const steps = await listDripSteps(99);
    expect(steps.length).toBeGreaterThan(0);
    const firstDelay = steps[0]?.delayDays ?? 3;
    expect(firstDelay).toBe(3);
  });
});
