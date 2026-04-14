import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertLead,
  InsertMessage,
  InsertSmsTemplate,
  Lead,
  leads,
  messageClassifications,
  messages,
  smsTemplates,
  users,
} from "../drizzle/schema";
import type { InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function listLeads(orgId: number, opts?: {
  search?: string;
  status?: Lead["status"];
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(leads.orgId, orgId)];

  if (opts?.status) {
    conditions.push(eq(leads.status, opts.status));
  }

  if (opts?.search) {
    const pattern = `%${opts.search}%`;
    conditions.push(
      or(
        like(leads.name, pattern),
        like(leads.company, pattern),
        like(leads.email, pattern),
        like(leads.phone, pattern)
      )!
    );
  }

  return db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leads).values(data);
  const insertId = (result as unknown as [{ insertId: number }])[0]?.insertId;
  return getLeadById(insertId);
}

export async function getExistingPhones(orgId: number): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db.select({ phone: leads.phone }).from(leads).where(eq(leads.orgId, orgId));
  return new Set(rows.map(r => r.phone.replace(/\D/g, "")));
}

export async function bulkCreateLeads(orgId: number, data: InsertLead[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return [];
  const withOrg = data.map((d) => ({ ...d, orgId }));
  await db.insert(leads).values(withOrg);
  return listLeads(orgId);
}

export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
  return getLeadById(id);
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(messages).where(eq(messages.leadId, id));
  await db.delete(leads).where(eq(leads.id, id));
  return { success: true };
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: messages.id,
      orgId: messages.orgId,
      leadId: messages.leadId,
      direction: messages.direction,
      body: messages.body,
      twilioSid: messages.twilioSid,
      twilioStatus: messages.twilioStatus,
      sentAt: messages.sentAt,
      classification: messageClassifications.category,
    })
    .from(messages)
    .leftJoin(messageClassifications, eq(messageClassifications.messageId, messages.id))
    .where(eq(messages.leadId, leadId))
    .orderBy(messages.sentAt);
  return rows;
}

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.leadId, data.leadId))
    .orderBy(desc(messages.sentAt))
    .limit(1);
  return result[0];
}

export async function getMessageByTwilioSid(twilioSid: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.twilioSid, twilioSid))
    .limit(1);
  return result[0];
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE_BODY = `Hi {{name}}, I came across {{company}} and wanted to reach out personally.

I'd love to schedule a quick 15-minute call to explore how we might be able to help you. Feel free to grab a time that works for you here: {{link}}

Looking forward to connecting!`;

export async function getDefaultTemplate(orgId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(smsTemplates)
    .where(eq(smsTemplates.orgId, orgId))
    .limit(1);

  if (result.length === 0) {
    await db.insert(smsTemplates).values({
      orgId,
      name: "Default Outreach",
      body: DEFAULT_TEMPLATE_BODY,
    });
    const created = await db
      .select()
      .from(smsTemplates)
      .where(eq(smsTemplates.orgId, orgId))
      .limit(1);
    return created[0] ?? null;
  }

  return result[0];
}

export async function updateTemplate(id: number, data: Partial<InsertSmsTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(smsTemplates).set(data).where(eq(smsTemplates.id, id));
  const result = await db.select().from(smsTemplates).where(eq(smsTemplates.id, id)).limit(1);
  return result[0];
}

export async function getLeadStats(orgId: number) {
  const db = await getDb();
  if (!db) return { total: 0, pending: 0, sent: 0, replied: 0, scheduled: 0 };

  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)` })
    .from(leads)
    .where(eq(leads.orgId, orgId))
    .groupBy(leads.status);

  const stats = { total: 0, pending: 0, sent: 0, replied: 0, scheduled: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "Pending") stats.pending = count;
    if (row.status === "Sent") stats.sent = count;
    if (row.status === "Replied") stats.replied = count;
    if (row.status === "Scheduled") stats.scheduled = count;
  }
  return stats;
}
