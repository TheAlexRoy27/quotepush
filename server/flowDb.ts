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
    body: `Hi {{name}}, that's great to hear! I'd love to set up a quick call to walk you through everything.

Feel free to grab a time that works for you here: {{link}}

Looking forward to speaking with you!`,
  },
  "Not Interested": {
    name: "Not Interested — Graceful Exit",
    body: `Hi {{name}}, no worries at all — I completely understand!

If anything changes down the road or you'd like to revisit, don't hesitate to reach out. Wishing you all the best!`,
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
    body: `Hi {{name}}, you've been removed from our outreach list and won't receive any further messages from us.

If you ever change your mind, feel free to get back in touch. Take care!`,
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

/** Ensure all 6 categories have a default flow rule row */
export async function seedFlowRules(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  for (const category of REPLY_CATEGORIES) {
    const existing = await getFlowRuleByCategory(category);
    if (!existing) {
      await db.insert(flowRules).values({ category, templateId: null, autoSend: 0 });
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
      // Auto-assign to the flow rule for this category
      if (inserted) {
        await upsertFlowRule({ category, templateId: inserted.id, autoSend: false });
      }
    }
  }
}

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
