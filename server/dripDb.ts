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
