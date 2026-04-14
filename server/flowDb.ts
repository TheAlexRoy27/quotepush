import { and, eq } from "drizzle-orm";
import {
  FlowRule,
  FlowTemplate,
  InsertFlowRule,
  InsertFlowTemplate,
  InsertMessageClassification,
  REPLY_CATEGORIES,
  ReplyCategory,
  flowRules,
  flowTemplates,
  messageClassifications,
} from "../drizzle/schema";
import { getDb } from "./db";

// ─── Default template bodies per category (multiple per category) ─────────────

const DEFAULT_TEMPLATES: Record<ReplyCategory, Array<{ name: string; body: string; isPrimary?: boolean }>> = {
  Interested: [
    {
      name: "Interested — Schedule a Call",
      isPrimary: true,
      body: `Hi {{firstName}}, awesome — so glad to hear that! 🎉

Let's get something on the calendar. You can grab a time that works best for you right here: {{link}}

Looking forward to connecting with you soon!`,
    },
    {
      name: "Interested — Send Quote Now",
      body: `Hi {{firstName}}, great news — I'll put together a custom quote for {{company}} right away.

Give me a few minutes and I'll have it over to you. In the meantime, feel free to check out what others are saying: {{link}}

Talk soon!`,
    },
    {
      name: "Interested — Warm Follow-Up",
      body: `Hi {{firstName}}, that's fantastic! I'd love to show you exactly how we can help {{company}}.

Can we hop on a quick 15-minute call this week? Just pick a time here: {{link}}

No pressure — just a friendly chat!`,
    },
  ],
  "Not Interested": [
    {
      name: "Not Interested — Graceful Exit",
      isPrimary: true,
      body: `Hi {{firstName}}, totally understood — no pressure at all!

If your situation changes or you'd ever like to revisit, don't hesitate to reach out. Wishing you all the best!`,
    },
    {
      name: "Not Interested — Leave the Door Open",
      body: `Hi {{firstName}}, no worries at all — I completely understand timing isn't always right.

I'll check back in a few months in case things change. In the meantime, feel free to reach out anytime. Take care!`,
    },
    {
      name: "Not Interested — Ask for Referral",
      body: `Hi {{firstName}}, thanks for letting me know — I really appreciate your honesty!

If you ever know someone who might benefit from what we offer, I'd love an introduction. Have a great day!`,
    },
  ],
  "Wants More Info": [
    {
      name: "Wants More Info — Send Details",
      isPrimary: true,
      body: `Hi {{firstName}}, happy to share more!

Here's a quick overview of what we offer and how it could benefit {{company}}. Would a short call work to go over the details? You can book a time here: {{link}}

Let me know what questions you have!`,
    },
    {
      name: "Wants More Info — Video Overview",
      body: `Hi {{firstName}}, great question — I put together a short 2-minute overview that explains everything clearly.

Check it out here: {{link}}

After watching, let me know if you'd like to chat — happy to answer any questions!`,
    },
    {
      name: "Wants More Info — Case Study",
      body: `Hi {{firstName}}, I'd love to share how we helped a company similar to {{company}} recently.

Here's a quick case study: {{link}}

Would love to show you how we could do the same for you. Want to set up a quick call?`,
    },
  ],
  Unsubscribe: [
    {
      name: "Unsubscribe — Opt-Out Confirmation",
      isPrimary: true,
      body: `You've been removed from our list and will receive no further messages. Reply START anytime if you'd like to reconnect. Take care!`,
    },
    {
      name: "Unsubscribe — Soft Opt-Out",
      body: `Got it — I've removed you from our outreach list. No more messages from us!

If you ever change your mind, just reply START and we'll be happy to reconnect. Wishing you all the best!`,
    },
  ],
};

// Categories that should have auto-send ON by default
const AUTO_SEND_DEFAULTS: Partial<Record<ReplyCategory, boolean>> = {
  Interested: true,
  "Not Interested": true,
  Unsubscribe: true,
};

// ─── Flow Templates ───────────────────────────────────────────────────────────

export async function listFlowTemplates(orgId: number, category?: ReplyCategory): Promise<FlowTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(flowTemplates.orgId, orgId)];
  if (category) conditions.push(eq(flowTemplates.category, category));
  return db.select().from(flowTemplates).where(and(...conditions));
}

export async function getFlowTemplateById(id: number): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(flowTemplates).where(eq(flowTemplates.id, id)).limit(1);
  return result[0];
}

export async function createFlowTemplate(data: InsertFlowTemplate): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(flowTemplates).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getFlowTemplateById(insertId);
}

export async function updateFlowTemplate(
  id: number,
  data: Partial<InsertFlowTemplate>
): Promise<FlowTemplate | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flowTemplates).set(data).where(eq(flowTemplates.id, id));
  return getFlowTemplateById(id);
}

export async function deleteFlowTemplate(id: number): Promise<{ success: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(flowRules).set({ templateId: null }).where(eq(flowRules.templateId, id));
  await db.delete(flowTemplates).where(eq(flowTemplates.id, id));
  return { success: true };
}

// ─── Flow Rules ───────────────────────────────────────────────────────────────

export async function listFlowRules(orgId: number): Promise<FlowRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowRules).where(eq(flowRules.orgId, orgId));
}

export async function getFlowRuleByCategory(orgId: number, category: ReplyCategory): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(flowRules)
    .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, category)))
    .limit(1);
  return result[0];
}

export async function upsertFlowRule(orgId: number, data: {
  category: ReplyCategory;
  templateId?: number | null;
  autoSend?: boolean;
}): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFlowRuleByCategory(orgId, data.category);
  const values: InsertFlowRule = {
    orgId,
    category: data.category,
    templateId: data.templateId ?? null,
    autoSend: data.autoSend ? 1 : 0,
  };

  if (existing) {
    await db
      .update(flowRules)
      .set(values)
      .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, data.category)));
  } else {
    await db.insert(flowRules).values(values);
  }
  return getFlowRuleByCategory(orgId, data.category);
}

/** Ensure all categories have a default flow rule row for the given org */
export async function seedFlowRules(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await getFlowRuleByCategory(orgId, category);
    if (!existing) {
      const autoSend = AUTO_SEND_DEFAULTS[category] ? 1 : 0;
      await db.insert(flowRules).values({ orgId, category, templateId: null, autoSend });
    }
  }
}

/** Seed multiple default templates per category and assign the primary one to the flow rule */
export async function seedDefaultTemplates(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await listFlowTemplates(orgId, category);
    if (existing.length === 0) {
      const templates = DEFAULT_TEMPLATES[category];
      let primaryId: number | undefined;

      for (const tpl of templates) {
        const inserted = await createFlowTemplate({ orgId, name: tpl.name, category, body: tpl.body, isActive: 1 });
        if (inserted && tpl.isPrimary) {
          primaryId = inserted.id;
        }
      }

      // Assign the primary template to the flow rule
      if (primaryId !== undefined) {
        const autoSend = AUTO_SEND_DEFAULTS[category] ?? false;
        await upsertFlowRule(orgId, { category, templateId: primaryId, autoSend });
      }
    }
  }
}

/** Reconcile existing flow rules and templates to match current defaults (idempotent) */
export async function reconcileFlowDefaults(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const [category, shouldAutoSend] of Object.entries(AUTO_SEND_DEFAULTS)) {
    if (!shouldAutoSend) continue;
    const rule = await getFlowRuleByCategory(orgId, category as ReplyCategory);
    if (rule && rule.autoSend !== 1 && rule.templateId) {
      await db
        .update(flowRules)
        .set({ autoSend: 1 })
        .where(and(eq(flowRules.orgId, orgId), eq(flowRules.category, category as ReplyCategory)));
    }
  }
}

// Export for testing purposes
export { DEFAULT_TEMPLATES as DEFAULT_TEMPLATE_BODIES, AUTO_SEND_DEFAULTS };

// ─── Message Classifications ──────────────────────────────────────────────────

export async function createMessageClassification(data: InsertMessageClassification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messageClassifications).values(data);
}

export async function getClassificationByMessageId(messageId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(messageClassifications)
    .where(eq(messageClassifications.messageId, messageId))
    .limit(1);
  return result[0];
}
