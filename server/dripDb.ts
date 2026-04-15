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

export async function getDripStepById(id: number): Promise<DripStep | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(dripSteps).where(eq(dripSteps.id, id)).limit(1);
  return result[0];
}

/** Get all branch child steps for a given parent step id */
export async function getBranchStepsForParent(parentStepId: number): Promise<DripStep[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dripSteps).where(eq(dripSteps.parentStepId, parentStepId));
}

export async function upsertDripStep(data: InsertDripStep): Promise<DripStep | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // If updating an existing step by id
  if (data.id) {
    await db.update(dripSteps).set(data).where(eq(dripSteps.id, data.id));
    return getDripStepById(data.id);
  }
  // Branch steps share stepNumber with parent — match by parentStepId + branchType instead
  if (data.parentStepId && data.branchType) {
    const existing = await db
      .select()
      .from(dripSteps)
      .where(
        and(
          eq(dripSteps.sequenceId, data.sequenceId),
          eq(dripSteps.parentStepId, data.parentStepId),
          eq(dripSteps.branchType, data.branchType)
        )
      )
      .limit(1);
    if (existing[0]) {
      await db.update(dripSteps).set(data).where(eq(dripSteps.id, existing[0].id));
      return getDripStepById(existing[0].id);
    }
    const result = await db.insert(dripSteps).values(data);
    const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
    return getDripStepById(insertId);
  }
  // Linear step — match by sequenceId + stepNumber
  const existing = await getDripStepByNumber(data.sequenceId, data.stepNumber);
  if (existing) {
    await db.update(dripSteps).set(data).where(eq(dripSteps.id, existing.id));
    return getDripStepByNumber(data.sequenceId, data.stepNumber);
  }
  const result = await db.insert(dripSteps).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getDripStepById(insertId);
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

type BranchStep = { name: string; delayAmount: number; delayUnit: DripDelayUnit; body: string; branchType: "positive" | "negative"; };
type LinearStep = { name: string; delayAmount: number; delayUnit: DripDelayUnit; body: string; branches?: [BranchStep, BranchStep]; };

const DEFAULT_DRIP_SEQUENCES: Array<{
  name: string;
  triggerCategory: DripTriggerCategory;
  steps: LinearStep[];
}> = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign 1: Insurance Agent — Form Lead Follow-Up (A/B branching)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "🛡️ Insurance Agent — Form Lead Follow-Up",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Step 1 — Thank You + Monday Check-In (send immediately)",
        delayAmount: 1,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, thank you so much for filling out the form! I'm {{agentName}} and I'd love to help you find the right coverage.

Would Monday be a good time to connect for a quick 10-minute call? Just reply Yes or No — totally no pressure!`,
        branches: [
          {
            branchType: "positive",
            name: "Branch A — Positive Reply: Send Cal Link",
            delayAmount: 2,
            delayUnit: "minutes",
            body: `That's great, {{firstName}}! Here's my calendar link to lock in a time that works best for you: {{link}}

Looking forward to chatting and helping you find the best coverage. See you soon!`,
          },
          {
            branchType: "negative",
            name: "Branch B — Negative Reply: Kind Exit + Cal Link",
            delayAmount: 2,
            delayUnit: "minutes",
            body: `Totally understand, {{firstName}} — no worries at all! Life gets busy and timing matters.

If anything opens up or you'd like to revisit, I'm always here. You can book a free 10-minute call anytime at your convenience: {{link}}

Wishing you all the best!`,
          },
        ],
      },
      {
        name: "Step 2 — Day 3 Soft Follow-Up",
        delayAmount: 3,
        delayUnit: "days",
        body: `Hi {{firstName}}, just checking in! I know things get busy.

I have a few open slots this week if you'd like to chat about your coverage options. No commitment — just a quick conversation: {{link}}`,
      },
      {
        name: "Step 3 — Day 7 Value Add",
        delayAmount: 7,
        delayUnit: "days",
        body: `Hi {{firstName}}, one thing I always tell my clients: reviewing your coverage takes less than 10 minutes and could save you hundreds per year.

Happy to do a quick review at no cost. Grab a time here: {{link}}`,
      },
      {
        name: "Step 4 — Day 14 Final Nudge",
        delayAmount: 14,
        delayUnit: "days",
        body: `Hi {{firstName}}, this will be my last follow-up — I don't want to crowd your inbox!

If you ever want to revisit your coverage, I'm just a message away. You can always book a call here: {{link}}

Take care and stay protected!`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign 2: Real Estate Agent — New Listing Interest (A/B branching)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "🏠 Real Estate — New Listing Interest",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Step 1 — Immediate Listing Response",
        delayAmount: 2,
        delayUnit: "minutes",
        body: `Hi {{firstName}}! Thanks for your interest in the listing. I'm {{agentName}}, your local agent.

Are you available for a quick showing this week? Reply Yes and I'll get you scheduled right away!`,
        branches: [
          {
            branchType: "positive",
            name: "Branch A — Ready to View: Book Showing",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `Wonderful, {{firstName}}! Let's get you in to see the property.

Here's my scheduling link to pick a time that works for you: {{link}}

Can't wait to show you around — it's a great home!`,
          },
          {
            branchType: "negative",
            name: "Branch B — Not Ready Yet: Stay in Touch",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `No problem at all, {{firstName}}! The right time makes all the difference in real estate.

When you're ready, I'd love to help you find your perfect home. Feel free to book a no-pressure call anytime: {{link}}

I'll keep an eye out for listings that match what you're looking for!`,
          },
        ],
      },
      {
        name: "Step 2 — Day 2 Market Update",
        delayAmount: 2,
        delayUnit: "days",
        body: `Hi {{firstName}}, just a heads up — this listing is getting a lot of attention and may not last long!

If you'd like to schedule a showing before it's gone, here's my calendar: {{link}}`,
      },
      {
        name: "Step 3 — Day 5 Similar Listings",
        delayAmount: 5,
        delayUnit: "days",
        body: `Hi {{firstName}}, I've been keeping an eye on the market for you. There are a few new listings in your area that might be a great fit.

Want me to send you the details? Or let's jump on a quick call: {{link}}`,
      },
      {
        name: "Step 4 — Day 10 Final Check-In",
        delayAmount: 10,
        delayUnit: "days",
        body: `Hi {{firstName}}, last check-in from me — I don't want to be a bother!

If you're still in the market or just want to explore your options, I'm here to help. Book a free consultation: {{link}}

Wishing you all the best in your home search!`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign 3: Solar Sales — Free Quote Follow-Up (A/B branching)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "☀️ Solar Sales — Free Quote Follow-Up",
    triggerCategory: "Wants More Info",
    steps: [
      {
        name: "Step 1 — Immediate Quote Intro",
        delayAmount: 3,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, thanks for requesting a solar quote! I'm {{agentName}} and I'd love to help you start saving on your energy bill.

To give you an accurate quote, I just need 10 minutes. Would this week work for a quick call? Reply Yes or No!`,
        branches: [
          {
            branchType: "positive",
            name: "Branch A — Ready for Quote: Book Call",
            delayAmount: 2,
            delayUnit: "minutes",
            body: `Awesome, {{firstName}}! Let's get your savings estimate locked in.

Here's my calendar to pick a time: {{link}}

Most homeowners in your area are saving $100–$200/month — excited to show you what's possible!`,
          },
          {
            branchType: "negative",
            name: "Branch B — Not Ready: Leave Door Open",
            delayAmount: 2,
            delayUnit: "minutes",
            body: `Totally understand, {{firstName}}! Solar is a big decision and timing matters.

When you're ready to explore your savings, I'm just a message away. You can also book a free no-obligation call anytime: {{link}}

Hope to connect when the time is right!`,
          },
        ],
      },
      {
        name: "Step 2 — Day 3 Savings Stat",
        delayAmount: 3,
        delayUnit: "days",
        body: `Hi {{firstName}}, did you know the average homeowner who goes solar saves $25,000+ over 25 years?

I'd love to show you what that looks like for your home specifically. Quick 10-min call: {{link}}`,
      },
      {
        name: "Step 3 — Day 7 Incentive Reminder",
        delayAmount: 7,
        delayUnit: "days",
        body: `Hi {{firstName}}, just a reminder — the 30% federal tax credit for solar is still available, but incentives can change.

Let's make sure you don't miss out. Grab a time to review your options: {{link}}`,
      },
      {
        name: "Step 4 — Day 14 Final Follow-Up",
        delayAmount: 14,
        delayUnit: "days",
        body: `Hi {{firstName}}, last message from me — I promise!

If solar ever makes sense for you down the road, I'd love to be your go-to resource. Book a free consultation anytime: {{link}}

Take care and enjoy the sunshine!`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign 4: Mortgage Broker — Rate Check Follow-Up (A/B branching)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "🏦 Mortgage Broker — Rate Check Follow-Up",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Step 1 — Immediate Rate Response",
        delayAmount: 2,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, thanks for checking in on rates! I'm {{agentName}} and I can help you find the best mortgage for your situation.

Are you currently looking to buy, refinance, or just exploring? Reply and let me know — happy to help!`,
        branches: [
          {
            branchType: "positive",
            name: "Branch A — Ready to Proceed: Book Consult",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `That's great, {{firstName}}! Let's find you the best rate available.

Here's my calendar to schedule a free 15-minute mortgage review: {{link}}

I'll come prepared with options tailored to your situation — no commitment required!`,
          },
          {
            branchType: "negative",
            name: "Branch B — Just Exploring: Nurture Reply",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `Totally makes sense, {{firstName}} — it's smart to explore your options early!

When you're ready to take the next step, I'd love to help you lock in a great rate. Book a free no-pressure consultation anytime: {{link}}

I'll be here when the timing is right!`,
          },
        ],
      },
      {
        name: "Step 2 — Day 3 Rate Alert",
        delayAmount: 3,
        delayUnit: "days",
        body: `Hi {{firstName}}, rates have been moving lately and I wanted to make sure you have the latest info.

A quick 15-min call could save you thousands over the life of your loan. Want to connect? {{link}}`,
      },
      {
        name: "Step 3 — Day 7 Pre-Approval Nudge",
        delayAmount: 7,
        delayUnit: "days",
        body: `Hi {{firstName}}, one thing that gives buyers a major advantage right now is a pre-approval letter.

It's free, takes about 20 minutes, and puts you in a much stronger position. Want to get started? {{link}}`,
      },
      {
        name: "Step 4 — Day 14 Final Check-In",
        delayAmount: 14,
        delayUnit: "days",
        body: `Hi {{firstName}}, last follow-up from me!

Whenever you're ready to move forward on a purchase or refinance, I'm here to make the process as smooth as possible. Book a free consult: {{link}}

Wishing you all the best!`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Campaign 5: Auto Sales — Test Drive Follow-Up (A/B branching)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "🚗 Auto Sales — Test Drive Follow-Up",
    triggerCategory: "Interested",
    steps: [
      {
        name: "Step 1 — Immediate Test Drive Invite",
        delayAmount: 5,
        delayUnit: "minutes",
        body: `Hi {{firstName}}, thanks for your interest! I'm {{agentName}} at {{company}}.

We'd love to get you behind the wheel for a test drive. Would this weekend work for you? Reply Yes and I'll get you set up!`,
        branches: [
          {
            branchType: "positive",
            name: "Branch A — Ready to Drive: Book Appointment",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `Fantastic, {{firstName}}! Let's get you in for that test drive.

Here's my scheduling link to pick a time that works: {{link}}

We'll have the vehicle ready and waiting for you — can't wait to see you!`,
          },
          {
            branchType: "negative",
            name: "Branch B — Not Ready: Stay Connected",
            delayAmount: 3,
            delayUnit: "minutes",
            body: `No worries at all, {{firstName}}! There's no rush — the right car is worth waiting for.

When you're ready to come in or just want to ask questions, I'm here. You can also book a time at your convenience: {{link}}

Hope to see you soon!`,
          },
        ],
      },
      {
        name: "Step 2 — Day 2 Vehicle Highlight",
        delayAmount: 2,
        delayUnit: "days",
        body: `Hi {{firstName}}, just wanted to share — this vehicle has been getting a lot of attention and inventory is limited.

Want to lock in your test drive before it's gone? Here's my calendar: {{link}}`,
      },
      {
        name: "Step 3 — Day 5 Financing Offer",
        delayAmount: 5,
        delayUnit: "days",
        body: `Hi {{firstName}}, great news — we have some excellent financing options available right now that could make your monthly payment very comfortable.

Want to explore what you qualify for? Let's chat: {{link}}`,
      },
      {
        name: "Step 4 — Day 10 Final Outreach",
        delayAmount: 10,
        delayUnit: "days",
        body: `Hi {{firstName}}, last message from me — I don't want to be a bother!

If you ever decide you're ready to explore your options, I'd love to help you find the perfect vehicle. Reach out anytime or book a visit: {{link}}

Drive safe and take care!`,
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
      const inserted = await upsertDripStep({
        sequenceId: seq.id,
        stepNumber: i + 1,
        name: step.name,
        delayAmount: step.delayAmount,
        delayUnit: step.delayUnit,
        body: step.body,
      });

      // Insert A/B branch steps if defined
      if (inserted && step.branches) {
        for (const branch of step.branches) {
          await upsertDripStep({
            sequenceId: seq.id,
            stepNumber: i + 1, // same step number as parent
            name: branch.name,
            delayAmount: branch.delayAmount,
            delayUnit: branch.delayUnit,
            body: branch.body,
            branchType: branch.branchType,
            parentStepId: inserted.id,
          });
        }
      }
    }
  }
}
