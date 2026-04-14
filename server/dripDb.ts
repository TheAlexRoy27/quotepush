import { and, eq, lte } from "drizzle-orm";
import {
  DripDelayUnit,
  DripEnrollmentStatus,
  DripSequence,
  DripStep,
  DripTriggerCategory,
  InsertDripSequence,
  InsertDripStep,
  InsertLeadDripEnrollment,
  LeadDripEnrollment,
  dripSequences,
  dripSteps,
  leadDripEnrollments,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Sequences ────────────────────────────────────────────────────────────────

export async function listDripSequences(orgId: number): Promise<DripSequence[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripSequences).where(eq(dripSequences.orgId, orgId));
}

export async function getDripSequenceById(id: number): Promise<DripSequence | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dripSequences).where(eq(dripSequences.id, id)).limit(1);
  return result[0];
}

export async function getActiveDripSequenceByCategory(
  orgId: number,
  category: DripTriggerCategory
): Promise<DripSequence | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dripSequences)
    .where(
      and(
        eq(dripSequences.orgId, orgId),
        eq(dripSequences.triggerCategory, category),
        eq(dripSequences.isActive, 1)
      )
    )
    .limit(1);
  return result[0];
}

export async function createDripSequence(
  data: InsertDripSequence
): Promise<DripSequence | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dripSequences).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getDripSequenceById(insertId);
}

export async function updateDripSequence(
  id: number,
  data: Partial<InsertDripSequence>
): Promise<DripSequence | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dripSequences).set(data).where(eq(dripSequences.id, id));
  return getDripSequenceById(id);
}

export async function deleteDripSequence(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Stop all active enrollments for this sequence
  await db
    .update(leadDripEnrollments)
    .set({ status: "stopped", stoppedReason: "sequence_deleted" })
    .where(
      and(eq(leadDripEnrollments.sequenceId, id), eq(leadDripEnrollments.status, "active"))
    );
  await db.delete(dripSteps).where(eq(dripSteps.sequenceId, id));
  await db.delete(dripSequences).where(eq(dripSequences.id, id));
  return { success: true };
}

// ─── Steps ────────────────────────────────────────────────────────────────────

export async function listDripSteps(sequenceId: number): Promise<DripStep[]> {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select()
    .from(dripSteps)
    .where(eq(dripSteps.sequenceId, sequenceId));
  return results.sort((a, b) => a.stepNumber - b.stepNumber);
}

export async function getDripStepByNumber(
  sequenceId: number,
  stepNumber: number
): Promise<DripStep | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(dripSteps)
    .where(and(eq(dripSteps.sequenceId, sequenceId), eq(dripSteps.stepNumber, stepNumber)))
    .limit(1);
  return result[0];
}

/** Compute milliseconds from a delay amount + unit */
export function delayToMs(amount: number, unit: DripDelayUnit): number {
  if (unit === "minutes") return amount * 60 * 1000;
  return amount * 24 * 60 * 60 * 1000; // days
}

export async function upsertDripStep(data: InsertDripStep): Promise<DripStep | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDripStepByNumber(data.sequenceId, data.stepNumber);
  if (existing) {
    await db.update(dripSteps).set(data).where(eq(dripSteps.id, existing.id));
    return getDripStepByNumber(data.sequenceId, data.stepNumber);
  }
  const result = await db.insert(dripSteps).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  const rows = await db.select().from(dripSteps).where(eq(dripSteps.id, insertId)).limit(1);
  return rows[0];
}

/** Advance an enrollment to the next step, computing nextSendAt from delayAmount + delayUnit */
export async function advanceEnrollmentWithDelay(
  enrollmentId: number,
  nextStepNumber: number,
  delayAmount: number,
  delayUnit: DripDelayUnit
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const delayMs = delayToMs(delayAmount, delayUnit);
  const nextSendAt = new Date(Date.now() + delayMs);
  await db
    .update(leadDripEnrollments)
    .set({ currentStep: nextStepNumber, nextSendAt, lastSentAt: new Date() })
    .where(eq(leadDripEnrollments.id, enrollmentId));
}

export async function deleteDripStep(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dripSteps).where(eq(dripSteps.id, id));
  return { success: true };
}

// ─── Enrollments ──────────────────────────────────────────────────────────────

export async function getActiveEnrollmentForLead(
  leadId: number
): Promise<LeadDripEnrollment | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(leadDripEnrollments)
    .where(
      and(eq(leadDripEnrollments.leadId, leadId), eq(leadDripEnrollments.status, "active"))
    )
    .limit(1);
  return result[0];
}

export async function listEnrollmentsForLead(leadId: number): Promise<LeadDripEnrollment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadDripEnrollments).where(eq(leadDripEnrollments.leadId, leadId));
}

export async function listEnrollmentsForOrg(orgId: number): Promise<LeadDripEnrollment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leadDripEnrollments).where(eq(leadDripEnrollments.orgId, orgId));
}

export async function enrollLeadInSequence(
  leadId: number,
  orgId: number,
  sequenceId: number,
  firstStepDelayAmount: number = 0,
  firstStepDelayUnit: DripDelayUnit = "days"
): Promise<LeadDripEnrollment | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Stop any existing active enrollment for this lead
  await db
    .update(leadDripEnrollments)
    .set({ status: "stopped", stoppedReason: "re-enrolled" })
    .where(
      and(eq(leadDripEnrollments.leadId, leadId), eq(leadDripEnrollments.status, "active"))
    );

  const delayMs = delayToMs(firstStepDelayAmount, firstStepDelayUnit);
  const nextSendAt = new Date(Date.now() + delayMs);

  const values: InsertLeadDripEnrollment = {
    leadId,
    orgId,
    sequenceId,
    currentStep: 1,
    status: "active",
    enrolledAt: new Date(),
    nextSendAt,
  };

  const result = await db.insert(leadDripEnrollments).values(values);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  const rows = await db
    .select()
    .from(leadDripEnrollments)
    .where(eq(leadDripEnrollments.id, insertId))
    .limit(1);
  return rows[0];
}

export async function stopEnrollment(
  leadId: number,
  reason: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leadDripEnrollments)
    .set({ status: "stopped", stoppedReason: reason })
    .where(
      and(
        eq(leadDripEnrollments.leadId, leadId),
        eq(leadDripEnrollments.status, "active")
      )
    );
  // Also stop paused enrollments
  await db
    .update(leadDripEnrollments)
    .set({ status: "stopped", stoppedReason: reason })
    .where(
      and(
        eq(leadDripEnrollments.leadId, leadId),
        eq(leadDripEnrollments.status, "paused")
      )
    );
}

export async function pauseEnrollment(leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leadDripEnrollments)
    .set({ status: "paused" })
    .where(
      and(eq(leadDripEnrollments.leadId, leadId), eq(leadDripEnrollments.status, "active"))
    );
}

export async function resumeEnrollment(leadId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leadDripEnrollments)
    .set({ status: "active" })
    .where(
      and(eq(leadDripEnrollments.leadId, leadId), eq(leadDripEnrollments.status, "paused"))
    );
}

export async function advanceEnrollment(
  enrollmentId: number,
  nextStepNumber: number,
  delayDays: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const nextSendAt = new Date();
  nextSendAt.setDate(nextSendAt.getDate() + delayDays);
  await db
    .update(leadDripEnrollments)
    .set({ currentStep: nextStepNumber, nextSendAt, lastSentAt: new Date() })
    .where(eq(leadDripEnrollments.id, enrollmentId));
}

export async function completeEnrollment(enrollmentId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leadDripEnrollments)
    .set({ status: "completed", stoppedReason: "completed", lastSentAt: new Date() })
    .where(eq(leadDripEnrollments.id, enrollmentId));
}

/** Find all active enrollments whose nextSendAt is <= now */
export async function getDueEnrollments(): Promise<LeadDripEnrollment[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(leadDripEnrollments)
    .where(
      and(eq(leadDripEnrollments.status, "active"), lte(leadDripEnrollments.nextSendAt, now))
    );
}

// ─── Default Drip Sequences Seeder ───────────────────────────────────────────

const DEFAULT_DRIP_SEQUENCES: Array<{
  name: string;
  triggerCategory: DripTriggerCategory;
  steps: Array<{ name: string; delayAmount: number; delayUnit: DripDelayUnit; body: string }>;
}> = [
  {
    name: "Interested — 5-Step Nurture",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Immediate Follow-Up",
        delayAmount: 5,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, just following up on my last message! I'd love to learn more about {{company}} and see how we can help.

Would a quick 15-min call work this week? Book here: {{link}}`,
      },
      {
        name: "Day 2 — Value Reminder",
        delayAmount: 2,
        delayUnit: "days",
        body: `Hi {{firstName}}, just wanted to make sure my last message didn't get buried!

Our clients typically see results within the first 30 days. I'd love to show you how. Still interested in a quick chat? {{link}}`,
      },
      {
        name: "Day 5 — Social Proof",
        delayAmount: 5,
        delayUnit: "days",
        body: `Hi {{firstName}}, I wanted to share a quick win — one of our clients similar to {{company}} saw a 40% increase in conversions within 60 days.

Happy to share the full story on a call: {{link}}`,
      },
      {
        name: "Day 10 — Soft Check-In",
        delayAmount: 10,
        delayUnit: "days",
        body: `Hi {{firstName}}, checking in one more time! I know things get busy.

If now isn't the right time, just let me know and I'll follow up next quarter. Otherwise, grab a time here: {{link}}`,
      },
      {
        name: "Day 21 — Final Nudge",
        delayAmount: 21,
        delayUnit: "days",
        body: `Hi {{firstName}}, this will be my last follow-up — I don't want to be a bother!

If you ever want to revisit, I'm always here. Just reply anytime or book a call: {{link}}

Wishing you and {{company}} all the best!`,
      },
    ],
  },
  {
    name: "Wants More Info — 3-Step Education",
    triggerCategory: "Wants More Info",
    steps: [
      {
        name: "Immediate Info Drop",
        delayAmount: 3,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, great — here's a quick overview of how we work and what makes us different: {{link}}

Let me know if you have questions — happy to walk you through it personally!`,
      },
      {
        name: "Day 3 — Case Study",
        delayAmount: 3,
        delayUnit: "days",
        body: `Hi {{firstName}}, following up with a real example!

Here's how we helped a company similar to {{company}} solve the same challenge you're facing: {{link}}

Would love to show you how we can do the same for you. Want to jump on a quick call?`,
      },
      {
        name: "Day 7 — Decision Nudge",
        delayAmount: 7,
        delayUnit: "days",
        body: `Hi {{firstName}}, just circling back one more time!

I know you were looking for more info — did you get a chance to review what I sent? Happy to answer any questions or set up a quick demo: {{link}}`,
      },
    ],
  },
  {
    name: "Quick 3-Minute Blitz",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Minute 1 — Confirm Interest",
        delayAmount: 1,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, awesome — glad you're interested! Just confirming — are you looking for a quote for {{company}} specifically, or something broader?

Reply back and I'll get you exactly what you need!`,
      },
      {
        name: "Minute 3 — Book the Call",
        delayAmount: 3,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, while I'm putting together your info — the fastest way to get you an accurate quote is a quick 10-min call.

Grab a time here (totally free, no obligation): {{link}}`,
      },
      {
        name: "Minute 10 — Final Push",
        delayAmount: 10,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, just making sure this didn't get lost!

I have a few slots open today if you want to lock in a time: {{link}}

Otherwise, just reply and I'll work around your schedule!`,
      },
    ],
  },
];

/** Seed default drip sequences for a new org (idempotent — skips if sequences already exist) */
export async function seedDefaultDripSequences(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await listDripSequences(orgId);
  if (existing.length > 0) return; // Already seeded

  for (const seqDef of DEFAULT_DRIP_SEQUENCES) {
    const seq = await createDripSequence({
      orgId,
      name: seqDef.name,
      triggerCategory: seqDef.triggerCategory,
      isActive: 1,
    });
    if (!seq) continue;

    for (let i = 0; i < seqDef.steps.length; i++) {
      const step = seqDef.steps[i];
      await upsertDripStep({
        sequenceId: seq.id,
        stepNumber: i + 1,
        name: step.name,
        delayAmount: step.delayAmount,
        delayUnit: step.delayUnit,
        body: step.body,
      });
    }
  }
}
