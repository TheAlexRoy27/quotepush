import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  company: varchar("company", { length: 255 }),
  email: varchar("email", { length: 320 }),
  status: mysqlEnum("status", ["Pending", "Sent", "Replied", "Scheduled"])
    .default("Pending")
    .notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound"]).notNull(),
  body: text("body").notNull(),
  twilioSid: varchar("twilioSid", { length: 64 }),
  twilioStatus: varchar("twilioStatus", { length: 32 }),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── SMS Templates ────────────────────────────────────────────────────────────

export const smsTemplates = mysqlTable("sms_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = typeof smsTemplates.$inferInsert;

// ─── Webhook Config ───────────────────────────────────────────────────────────

export const webhookConfigs = mysqlTable("webhook_configs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().default("CRM Webhook"),
  secret: varchar("secret", { length: 64 }).notNull(),
  // JSON string: { name: string, phone: string, company?: string, email?: string }
  fieldMappings: text("fieldMappings").notNull(),
  autoSend: int("autoSend").notNull().default(1), // 1 = true, 0 = false
  schedulingLink: varchar("schedulingLink", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

// ─── Webhook Logs ─────────────────────────────────────────────────────────────

export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  status: mysqlEnum("status", ["success", "error", "skipped"]).notNull(),
  payload: text("payload"),
  message: text("message"),
  leadId: int("leadId"),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

// ─── Reply Categories ─────────────────────────────────────────────────────────

export const REPLY_CATEGORIES = [
  "Interested",
  "Not Interested",
  "Wants More Info",
  "Already a Customer",
  "Unsubscribe",
  "Other",
] as const;

export type ReplyCategory = (typeof REPLY_CATEGORIES)[number];

// ─── Flow Templates ───────────────────────────────────────────────────────────

export const flowTemplates = mysqlTable("flow_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull(),
  body: text("body").notNull(),
  isActive: int("isActive").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowTemplate = typeof flowTemplates.$inferSelect;
export type InsertFlowTemplate = typeof flowTemplates.$inferInsert;

// ─── Flow Rules ───────────────────────────────────────────────────────────────
// One rule per category: when a reply is classified as category X,
// optionally auto-send the linked template.

export const flowRules = mysqlTable("flow_rules", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull().unique(),
  templateId: int("templateId"), // FK to flow_templates.id (nullable = no template assigned)
  autoSend: int("autoSend").notNull().default(0), // 1 = auto-send, 0 = manual only
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowRule = typeof flowRules.$inferSelect;
export type InsertFlowRule = typeof flowRules.$inferInsert;

// ─── Message Classification ───────────────────────────────────────────────────
// Stores the AI-classified category for each inbound message.

export const messageClassifications = mysqlTable("message_classifications", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull().unique(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull(),
  confidence: varchar("confidence", { length: 16 }), // "high" | "medium" | "low"
  classifiedAt: timestamp("classifiedAt").defaultNow().notNull(),
});

export type MessageClassification = typeof messageClassifications.$inferSelect;
export type InsertMessageClassification = typeof messageClassifications.$inferInsert;
