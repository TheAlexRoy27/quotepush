import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertLead,
  InsertMessage,
  InsertSmsTemplate,
  InsertKeywordPromotionRule,
  InsertReferral,
  Lead,
  botConfigs,
  BotConfig,
  InsertBotConfig,
  keywordPromotionRules,
  leads,
  messageClassifications,
  messages,
  referralCodes,
  referrals,
  smsTemplates,
  users,
  appointments,
  InsertAppointment,
  Appointment,
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
  optedOut?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(leads.orgId, orgId)];

  if (opts?.status) {
    conditions.push(eq(leads.status, opts.status));
  }

  if (opts?.optedOut !== undefined) {
    conditions.push(eq(leads.optedOut, opts.optedOut));
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

  const rows = await db
    .select({
      id: leads.id,
      orgId: leads.orgId,
      name: leads.name,
      phone: leads.phone,
      email: leads.email,
      company: leads.company,
      status: leads.status,
      notes: leads.notes,
      consentUrl: leads.consentUrl,
      consentConfirmed: leads.consentConfirmed,
      optedOut: leads.optedOut,
      doNotContact: leads.doNotContact,
      source: leads.source,
      age: leads.age,
      state: leads.state,
      productType: leads.productType,
      assignedToId: leads.assignedToId,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
      doNotContactAt: leads.doNotContactAt,
      optedOutAt: leads.optedOutAt,
      dncFlagged: leads.dncFlagged,
      dncCheckedAt: leads.dncCheckedAt,
      assignedToName: sql<string | null>`(SELECT u.name FROM users u WHERE u.id = ${leads.assignedToId})`,
      assignedToColor: sql<string | null>`(SELECT u.accentColor FROM users u WHERE u.id = ${leads.assignedToId})`,
    })
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.createdAt));
  return rows;
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

export async function getUnreadReplies(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      messageId: messages.id,
      leadId: messages.leadId,
      body: messages.body,
      sentAt: messages.sentAt,
      leadName: leads.name,
    })
    .from(messages)
    .innerJoin(leads, eq(leads.id, messages.leadId))
    .where(
      and(
        eq(messages.orgId, orgId),
        eq(messages.direction, "inbound"),
        eq(messages.isRead, false)
      )
    )
    .orderBy(desc(messages.sentAt))
    .limit(20);
  return rows;
}

export async function markMessagesReadForLead(leadId: number, orgId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.leadId, leadId),
        eq(messages.orgId, orgId),
        eq(messages.direction, "inbound")
      )
    );
}

// ─── SMS Templates ────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE_BODY = `Hi {{firstName}}, I came across {{company}} and wanted to reach out personally.

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
  if (!db) return { total: 0, pending: 0, sent: 0, replied: 0, scheduled: 0, xDated: 0 };

  const rows = await db
    .select({ status: leads.status, count: sql<number>`count(*)` })
    .from(leads)
    .where(eq(leads.orgId, orgId))
    .groupBy(leads.status);

  const stats = { total: 0, pending: 0, sent: 0, replied: 0, scheduled: 0, xDated: 0 };
  for (const row of rows) {
    const count = Number(row.count);
    stats.total += count;
    if (row.status === "Pending") stats.pending = count;
    if (row.status === "Sent") stats.sent = count;
    if (row.status === "Replied") stats.replied = count;
    if (row.status === "Scheduled") stats.scheduled = count;
    if (row.status === "X-Dated") stats.xDated = count;
  }
  return stats;
}

// ─── Keyword Promotion Rules ─────────────────────────────────────────────────
export async function listKeywordRules(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keywordPromotionRules).where(eq(keywordPromotionRules.orgId, orgId));
}

export async function createKeywordRule(data: InsertKeywordPromotionRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(keywordPromotionRules).values(data);
  const rows = await db.select().from(keywordPromotionRules).where(eq(keywordPromotionRules.id, (result as any).insertId)).limit(1);
  return rows[0];
}

export async function updateKeywordRule(id: number, data: Partial<InsertKeywordPromotionRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(keywordPromotionRules).set(data).where(eq(keywordPromotionRules.id, id));
  const rows = await db.select().from(keywordPromotionRules).where(eq(keywordPromotionRules.id, id)).limit(1);
  return rows[0];
}

export async function deleteKeywordRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(keywordPromotionRules).where(eq(keywordPromotionRules.id, id));
}

export async function getActiveKeywordRules(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keywordPromotionRules).where(
    and(eq(keywordPromotionRules.orgId, orgId), eq(keywordPromotionRules.isActive, 1))
  );
}

// ─── Referral Codes ──────────────────────────────────────────────────────────
export async function getOrCreateReferralCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing[0]) return existing[0].code;
  const code = Math.random().toString(36).slice(2, 10).toUpperCase() + userId.toString(36).toUpperCase();
  await db.insert(referralCodes).values({ userId, code });
  return code;
}

export async function getReferralCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(referralCodes).where(eq(referralCodes.code, code)).limit(1);
  return rows[0] ?? null;
}

export async function createReferral(data: InsertReferral) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(referrals).values(data);
}

export async function listReferrals(referrerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: referrals.id,
    referredId: referrals.referredId,
    convertedAt: referrals.convertedAt,
    createdAt: referrals.createdAt,
    referredName: users.name,
    referredEmail: users.email,
    referredPhone: users.phone,
  })
    .from(referrals)
    .leftJoin(users, eq(referrals.referredId, users.id))
    .where(eq(referrals.referrerId, referrerId));
}

export async function markReferralConverted(referredId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(referrals).set({ convertedAt: new Date() }).where(eq(referrals.referredId, referredId));
}

// ─── Bot Config ───────────────────────────────────────────────────────────────

export async function getBotConfig(orgId: number): Promise<BotConfig | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(botConfigs).where(eq(botConfigs.orgId, orgId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertBotConfig(orgId: number, data: Partial<Omit<InsertBotConfig, "id" | "orgId" | "createdAt" | "updatedAt">>): Promise<BotConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await getBotConfig(orgId);
  if (existing) {
    await db.update(botConfigs).set(data).where(eq(botConfigs.orgId, orgId));
  } else {
    await db.insert(botConfigs).values({ orgId, ...data } as InsertBotConfig);
  }
  const updated = await getBotConfig(orgId);
  return updated!;
}

export async function countBotReplies(leadId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.leadId, leadId), eq(messages.isBot, true)));
  return Number(rows[0]?.count ?? 0);
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function createAppointment(data: InsertAppointment): Promise<Appointment> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(appointments).values(data);
  const insertId = (result as any).insertId;
  const rows = await db.select().from(appointments).where(eq(appointments.id, insertId)).limit(1);
  return rows[0];
}

export async function getAppointmentByToken(token: string): Promise<Appointment | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(appointments).where(eq(appointments.token, token)).limit(1);
  return rows[0] ?? null;
}

export async function getAppointmentsByOrg(orgId: number): Promise<Appointment[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appointments).where(eq(appointments.orgId, orgId)).orderBy(desc(appointments.createdAt));
}

export async function updateAppointment(id: number, data: Partial<InsertAppointment>): Promise<Appointment | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(appointments).set(data).where(eq(appointments.id, id));
  const rows = await db.select().from(appointments).where(eq(appointments.id, id)).limit(1);
  return rows[0] ?? null;
}

// ─── Admin: All Users ─────────────────────────────────────────────────────────

export async function listAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      loginMethod: users.loginMethod,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.lastSignedIn));
}
