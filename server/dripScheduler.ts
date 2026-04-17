/**
 * Drip Scheduler
 * Runs every 5 minutes, finds due enrollments, sends the next step SMS,
 * then advances or completes the enrollment.
 */
import { getLeadById } from "./db";
import {
  advanceEnrollmentWithDelay,
  completeEnrollment,
  getDueEnrollments,
  getDripSequenceById,
  getDripStepByNumber,
  listDripSteps,
  stopEnrollment,
} from "./dripDb";
import { getOrgTwilioConfig } from "./orgDb";
import { isTwilioConfigured, renderTemplate, sendSms, sendSmsWithConfig } from "./twilio";
import { createMessage } from "./db";

const SCHEDULER_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2000; // 2s, 4s, 8s

/** Returns true if the error looks like a transient DB connection reset */
function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const cause = (err as { cause?: Error })?.cause;
  const causeMsg = cause instanceof Error ? cause.message : String(cause ?? "");
  return /ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up/i.test(msg + causeMsg);
}

/** Retry a DB operation with exponential backoff on transient errors */
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === MAX_RETRIES) throw err;
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[DripScheduler] Transient error in ${label}, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

export async function runDripSchedulerTick(): Promise<void> {
  try {
    const dueEnrollments = await withRetry(() => getDueEnrollments(), "getDueEnrollments");
    if (dueEnrollments.length === 0) return;

    console.log(`[DripScheduler] Processing ${dueEnrollments.length} due enrollment(s)`);

    for (const enrollment of dueEnrollments) {
      try {
        await processDripEnrollment(enrollment.id, enrollment.leadId, enrollment.orgId, enrollment.sequenceId, enrollment.currentStep);
      } catch (err) {
        console.error(`[DripScheduler] Error processing enrollment ${enrollment.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[DripScheduler] Tick error:", err);
  }
}

async function processDripEnrollment(
  enrollmentId: number,
  leadId: number,
  orgId: number,
  sequenceId: number,
  currentStep: number
): Promise<void> {
  const lead = await getLeadById(leadId);
  if (!lead) {
    console.warn(`[DripScheduler] Lead ${leadId} not found, skipping`);
    return;
  }

  // Skip opted-out leads
  if ((lead as any).optedOut) {
    console.log(`[DripScheduler] Lead ${leadId} has opted out, stopping enrollment`);
    await stopEnrollment(leadId, "unsubscribed");
    return;
  }

  // Skip Do Not Contact leads
  if ((lead as any).doNotContact) {
    console.log(`[DripScheduler] Lead ${leadId} is marked Do Not Contact, stopping enrollment`);
    await stopEnrollment(leadId, "do_not_contact");
    return;
  }

  // Quiet hours check (TCPA compliance) - defer if outside allowed window
  try {
    const { getBotConfig } = await import("./db");
    const botConfig = await getBotConfig(orgId);
    if (botConfig?.quietHoursEnabled) {
      const tz = (botConfig as any).quietHoursTimezone ?? "America/New_York";
      const nowHour = parseInt(new Date().toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false }), 10);
      const qStart = (botConfig as any).quietHoursStart ?? 8;
      const qEnd = (botConfig as any).quietHoursEnd ?? 21;
      if (nowHour < qStart || nowHour >= qEnd) {
        console.log(`[DripScheduler] Quiet hours active (${nowHour}h in ${tz}, window ${qStart}-${qEnd}h) - deferring drip step for lead ${leadId}`);
        return; // skip this tick; will retry on next scheduler run
      }
    }
  } catch (qhErr) {
    console.warn("[DripScheduler] Quiet hours check failed (non-fatal):", qhErr);
  }

  const sequence = await getDripSequenceById(sequenceId);
  if (!sequence || !sequence.isActive) {
    console.warn(`[DripScheduler] Sequence ${sequenceId} inactive or not found, skipping`);
    return;
  }

  const step = await getDripStepByNumber(sequenceId, currentStep);
  if (!step) {
    // No more steps - sequence is complete
    await completeEnrollment(enrollmentId);
    console.log(`[DripScheduler] Enrollment ${enrollmentId} completed (no step ${currentStep})`);
    return;
  }

  // Render and send the message
  const body = renderTemplate(step.body, {
    name: lead.name,
    company: lead.company,
    link: undefined,
  });

  const orgConfig = await getOrgTwilioConfig(orgId);
  let twilioSid: string | null = null;
  let twilioStatus = "simulated";

  if (orgConfig?.accountSid) {
    const result = await sendSmsWithConfig(
      lead.phone,
      body,
      orgConfig.accountSid,
      orgConfig.authToken,
      orgConfig.phoneNumber
    );
    twilioSid = result.sid ?? null;
    twilioStatus = result.status ?? "sent";
  } else if (isTwilioConfigured()) {
    const result = await sendSms(lead.phone, body);
    twilioSid = result.sid ?? null;
    twilioStatus = result.status ?? "sent";
  }

  await createMessage({
    orgId,
    leadId,
    direction: "outbound",
    body,
    twilioSid,
    twilioStatus,
  });

  console.log(
    `[DripScheduler] Sent step ${currentStep} of sequence "${sequence.name}" to lead ${lead.name} (${twilioStatus})`
  );

  // Advance to next step
  const allSteps = await listDripSteps(sequenceId);
  const nextStep = allSteps.find((s) => s.stepNumber === currentStep + 1);

  if (nextStep) {
    const unit = nextStep.delayUnit ?? "days";
    const amount = nextStep.delayAmount ?? nextStep.delayDays ?? 3;
    await advanceEnrollmentWithDelay(enrollmentId, nextStep.stepNumber, amount, unit);
    console.log(
      `[DripScheduler] Enrollment ${enrollmentId} advanced to step ${nextStep.stepNumber} (in ${amount} ${unit})`
    );
  } else {
    await completeEnrollment(enrollmentId);
    console.log(`[DripScheduler] Enrollment ${enrollmentId} completed all steps`);
  }
}

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

export function startDripScheduler(): void {
  if (schedulerTimer) return;
  console.log("[DripScheduler] Starting (interval: 5 min)");
  // Run once immediately, then on interval
  runDripSchedulerTick();
  schedulerTimer = setInterval(runDripSchedulerTick, SCHEDULER_INTERVAL_MS);
}

export function stopDripScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[DripScheduler] Stopped");
  }
}
