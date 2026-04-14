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

// ─── Default template bodies per category ────────────────────────────────────

const DEFAULT_TEMPLATES: Record<ReplyCategory, { name: string; body: string }> = {
  Interested: {
    name: "Interested — Schedule Call",
    body: `Hi {{firstName}}, awesome — so glad to hear that!

Let's get something on the calendar. You can grab a time that works best for you right here: {{link}}

Looking forward to connecting with you soon!`,
  },
  "Not Interested": {
    name: "Not Interested — Graceful Exit",
    body: `Hi {{firstName}}, totally understood — no pressure at all!

If your situation changes or you'd ever like to revisit, don't hesitate to reach out. Wishing you all the best!`,
  },
  "Wants More Info": {
    name: "Wants More Info — Send Details",
    body: `Hi {{firstName}}, happy to share more!

Here's a quick overview of what we offer and how it could benefit {{company}}. Would a short call work to go over the details? You can book a time here: {{link}}

Let me know what questions you have!`,
  },
  "Already a Customer": {
    name: "Already a Customer — Acknowledge",
    body: `Hi {{firstName}}, wonderful — glad to have you on board already!

If there's anything I can help you with or if you'd like to explore additional options, feel free to reach out anytime. We're here for you!`,
  },
  Unsubscribe: {
    name: "Unsubscribe — Opt-Out Confirmation",
    body: `You've been removed from our list and will receive no further messages. Reply START anytime if you'd like to reconnect. Take care!`,
  },
  Other: {
    name: "Other — General Follow-Up",
    body: `Hi {{firstName}}, thanks for getting back to me!

I'd love to connect and learn more about what you're looking for. Would a quick call work? You can book a time here: {{link}}

Looking forward to hearing from you!`,
  },
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

/** Ensure all 6 categories have a default flow rule row for the given org */
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

/** Seed default templates for any category that has no templates yet for the given org */
export async function seedDefaultTemplates(orgId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await listFlowTemplates(orgId, category);
    if (existing.length === 0) {
      const { name, body } = DEFAULT_TEMPLATES[category];
      const inserted = await createFlowTemplate({ orgId, name, category, body, isActive: 1 });
      if (inserted) {
        const autoSend = AUTO_SEND_DEFAULTS[category] ?? false;
        await upsertFlowRule(orgId, { category, templateId: inserted.id, autoSend });
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

  const priorityCategories: ReplyCategory[] = ["Interested", "Not Interested", "Unsubscribe"];
  for (const category of priorityCategories) {
    const { name: defaultName, body: defaultBody } = DEFAULT_TEMPLATES[category];
    const templates = await listFlowTemplates(orgId, category);
    for (const t of templates) {
      if (t.name === defaultName) {
        await db
          .update(flowTemplates)
          .set({ body: defaultBody })
          .where(eq(flowTemplates.id, t.id));
      }
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
