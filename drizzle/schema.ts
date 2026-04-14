import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Email Credentials ────────────────────────────────────────────────────────

export const emailCredentials = mysqlTable("email_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailCredential = typeof emailCredentials.$inferSelect;
export type InsertEmailCredential = typeof emailCredentials.$inferInsert;

// ─── Phone OTP ────────────────────────────────────────────────────────────────

export const phoneOtp = mysqlTable("phone_otp", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  code: varchar("code", { length: 8 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: int("verified").notNull().default(0), // 0 = pending, 1 = verified
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PhoneOtp = typeof phoneOtp.$inferSelect;
export type InsertPhoneOtp = typeof phoneOtp.$inferInsert;

// ─── Organizations ────────────────────────────────────────────────────────────

export const PLAN_TYPES = ["base", "elite"] as const;
export type PlanType = (typeof PLAN_TYPES)[number];

export const SUBSCRIPTION_STATUSES = ["active", "trialing", "past_due", "canceled", "incomplete"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  plan: mysqlEnum("plan", PLAN_TYPES).default("base").notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", SUBSCRIPTION_STATUSES).default("incomplete"),
  trialEndsAt: timestamp("trialEndsAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Org Members ──────────────────────────────────────────────────────────────

export const ORG_ROLES = ["owner", "admin", "member"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const orgMembers = mysqlTable("org_members", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ORG_ROLES).default("member").notNull(),
  inviteToken: varchar("inviteToken", { length: 128 }),
  inviteEmail: varchar("inviteEmail", { length: 320 }),
  invitePhone: varchar("invitePhone", { length: 32 }),
  inviteAccepted: int("inviteAccepted").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrgMember = typeof orgMembers.$inferSelect;
export type InsertOrgMember = typeof orgMembers.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
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
  orgId: int("orgId").notNull(),
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
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = typeof smsTemplates.$inferInsert;

// ─── Webhook Config ───────────────────────────────────────────────────────────

export const webhookConfigs = mysqlTable("webhook_configs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull().default("CRM Webhook"),
  secret: varchar("secret", { length: 64 }).notNull(),
  fieldMappings: text("fieldMappings").notNull(),
  autoSend: int("autoSend").notNull().default(1),
  schedulingLink: varchar("schedulingLink", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebhookConfig = typeof webhookConfigs.$inferSelect;
export type InsertWebhookConfig = typeof webhookConfigs.$inferInsert;

// ─── Webhook Logs ─────────────────────────────────────────────────────────────

export const webhookLogs = mysqlTable("webhook_logs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId"),
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
  "Unsubscribe",
] as const;

export type ReplyCategory = (typeof REPLY_CATEGORIES)[number];

// ─── Flow Templates ───────────────────────────────────────────────────────────

export const flowTemplates = mysqlTable("flow_templates", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull(),
  body: text("body").notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowTemplate = typeof flowTemplates.$inferSelect;
export type InsertFlowTemplate = typeof flowTemplates.$inferInsert;

// ─── Flow Rules ───────────────────────────────────────────────────────────────

export const flowRules = mysqlTable("flow_rules", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull(),
  templateId: int("templateId"),
  autoSend: int("autoSend").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FlowRule = typeof flowRules.$inferSelect;
export type InsertFlowRule = typeof flowRules.$inferInsert;

// ─── Message Classification ───────────────────────────────────────────────────

export const messageClassifications = mysqlTable("message_classifications", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull().unique(),
  category: mysqlEnum("category", REPLY_CATEGORIES).notNull(),
  confidence: varchar("confidence", { length: 16 }),
  classifiedAt: timestamp("classifiedAt").defaultNow().notNull(),
});

export type MessageClassification = typeof messageClassifications.$inferSelect;
export type InsertMessageClassification = typeof messageClassifications.$inferInsert;

// ─── Drip Sequences ──────────────────────────────────────────────────────────
// A named sequence of follow-up messages triggered by a reply category

export const DRIP_TRIGGER_CATEGORIES = ["Interested", "Wants More Info"] as const;
export type DripTriggerCategory = (typeof DRIP_TRIGGER_CATEGORIES)[number];

export const dripSequences = mysqlTable("drip_sequences", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  triggerCategory: mysqlEnum("triggerCategory", DRIP_TRIGGER_CATEGORIES).notNull(),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripSequence = typeof dripSequences.$inferSelect;
export type InsertDripSequence = typeof dripSequences.$inferInsert;

// ─── Drip Steps ───────────────────────────────────────────────────────────────
// Each step in a sequence: a message body sent after N days of silence

export const DRIP_DELAY_UNITS = ["minutes", "days"] as const;
export type DripDelayUnit = (typeof DRIP_DELAY_UNITS)[number];

export const dripSteps = mysqlTable("drip_steps", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  stepNumber: int("stepNumber").notNull(), // 1-based ordering
  delayAmount: int("delayAmount").notNull().default(3), // numeric delay value
  delayUnit: mysqlEnum("delayUnit", DRIP_DELAY_UNITS).notNull().default("days"), // minutes or days
  /** @deprecated use delayAmount + delayUnit instead */
  delayDays: int("delayDays").notNull().default(3), // kept for backward compat
  name: varchar("name", { length: 255 }).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripStep = typeof dripSteps.$inferSelect;
export type InsertDripStep = typeof dripSteps.$inferInsert;

// ─── Lead Drip Enrollments ────────────────────────────────────────────────────
// Tracks each lead's progress through a drip sequence

export const DRIP_ENROLLMENT_STATUSES = ["active", "paused", "completed", "stopped"] as const;
export type DripEnrollmentStatus = (typeof DRIP_ENROLLMENT_STATUSES)[number];

export const leadDripEnrollments = mysqlTable("lead_drip_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  orgId: int("orgId").notNull(),
  sequenceId: int("sequenceId").notNull(),
  currentStep: int("currentStep").notNull().default(1), // next step to send
  status: mysqlEnum("status", DRIP_ENROLLMENT_STATUSES).notNull().default("active"),
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  nextSendAt: timestamp("nextSendAt").notNull(), // when to send the next step
  lastSentAt: timestamp("lastSentAt"),
  stoppedReason: varchar("stoppedReason", { length: 64 }), // 'replied', 'unsubscribed', 'manual', 'completed'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadDripEnrollment = typeof leadDripEnrollments.$inferSelect;
export type InsertLeadDripEnrollment = typeof leadDripEnrollments.$inferInsert;

// ─── Org Twilio Config ────────────────────────────────────────────────────────
// Per-org Twilio credentials (encrypted at rest via env key)

export const orgTwilioConfigs = mysqlTable("org_twilio_configs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull().unique(),
  accountSid: varchar("accountSid", { length: 64 }).notNull(),
  authToken: varchar("authToken", { length: 64 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrgTwilioConfig = typeof orgTwilioConfigs.$inferSelect;
export type InsertOrgTwilioConfig = typeof orgTwilioConfigs.$inferInsert;

// ─── Owner Credentials (Master Login) ────────────────────────────────────────

export const ownerCredentials = mysqlTable("owner_credentials", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OwnerCredential = typeof ownerCredentials.$inferSelect;
export type InsertOwnerCredential = typeof ownerCredentials.$inferInsert;
