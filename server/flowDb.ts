import { eq } from "drizzle-orm";
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
    body: `Hi {{name}}, awesome — so glad to hear that! 🎉

Let's get something on the calendar. You can grab a time that works best for you right here: {{link}}

Looking forward to connecting with you soon!`,
  },
  "Not Interested": {
    name: "Not Interested — Graceful Exit",
    body: `Hi {{name}}, totally understood — no pressure at all!

If your situation changes or you'd ever like to revisit, don't hesitate to reach out. Wishing you all the best!`,
  },
  "Wants More Info": {
    name: "Wants More Info — Send Details",
    body: `Hi {{name}}, happy to share more!

Here's a quick overview of what we offer and how it could benefit {{company}}. Would a short call work to go over the details? You can book a time here: {{link}}

Let me know what questions you have!`,
  },
  "Already a Customer": {
    name: "Already a Customer — Acknowledge",
    body: `Hi {{name}}, wonderful — glad to have you on board already!

If there's anything I can help you with or if you'd like to explore additional options, feel free to reach out anytime. We're here for you!`,
  },
  Unsubscribe: {
    name: "Unsubscribe — Opt-Out Confirmation",
    body: `You've been removed from our list and will receive no further messages. Reply START anytime if you'd like to reconnect. Take care!`,
  },
  Other: {
    name: "Other — General Follow-Up",
    body: `Hi {{name}}, thanks for getting back to me!

I'd love to connect and learn more about what you're looking for. Would a quick call work? You can book a time here: {{link}}

Looking forward to hearing from you!`,
  },
};

// ─── Flow Templates ───────────────────────────────────────────────────────────

export async function listFlowTemplates(category?: ReplyCategory): Promise<FlowTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(flowTemplates).where(eq(flowTemplates.category, category));
  }
  return db.select().from(flowTemplates);
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
  // Unlink from any flow rules first
  await db
    .update(flowRules)
    .set({ templateId: null })
    .where(eq(flowRules.templateId, id));
  await db.delete(flowTemplates).where(eq(flowTemplates.id, id));
  return { success: true };
}

// ─── Flow Rules ───────────────────────────────────────────────────────────────

export async function listFlowRules(): Promise<FlowRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(flowRules);
}

export async function getFlowRuleByCategory(category: ReplyCategory): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(flowRules)
    .where(eq(flowRules.category, category))
    .limit(1);
  return result[0];
}

export async function upsertFlowRule(data: {
  category: ReplyCategory;
  templateId?: number | null;
  autoSend?: boolean;
}): Promise<FlowRule | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getFlowRuleByCategory(data.category);
  const values: InsertFlowRule = {
    category: data.category,
    templateId: data.templateId ?? null,
    autoSend: data.autoSend ? 1 : 0,
  };

  if (existing) {
    await db.update(flowRules).set(values).where(eq(flowRules.category, data.category));
  } else {
    await db.insert(flowRules).values(values);
  }
  return getFlowRuleByCategory(data.category);
}

// Categories that should have auto-send ON by default
const AUTO_SEND_DEFAULTS: Partial<Record<ReplyCategory, boolean>> = {
  Interested: true,
  "Not Interested": true,
  Unsubscribe: true,
};

/** Ensure all 6 categories have a default flow rule row */
export async function seedFlowRules(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await getFlowRuleByCategory(category);
    if (!existing) {
      const autoSend = AUTO_SEND_DEFAULTS[category] ? 1 : 0;
      await db.insert(flowRules).values({ category, templateId: null, autoSend });
    }
  }
}

/** Seed default templates for any category that has no templates yet */
export async function seedDefaultTemplates(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await listFlowTemplates(category);
    if (existing.length === 0) {
      const { name, body } = DEFAULT_TEMPLATES[category];
      const inserted = await createFlowTemplate({ name, category, body, isActive: 1 });
      // Auto-assign to the flow rule and enable auto-send for priority categories
      if (inserted) {
        const autoSend = AUTO_SEND_DEFAULTS[category] ?? false;
        await upsertFlowRule({ category, templateId: inserted.id, autoSend });
      }
    }
  }
}

// Export for testing purposes
export { DEFAULT_TEMPLATES as DEFAULT_TEMPLATE_BODIES, AUTO_SEND_DEFAULTS };

// ─── Message Classifications ──────────────────────────────────────────────────

export async function createMessageClassification(
  data: InsertMessageClassification
) {
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
