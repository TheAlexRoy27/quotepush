import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
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
  consentAcceptedAt: timestamp("consentAcceptedAt"),
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

// ─── Phone Credentials (password-based phone login) ─────────────────────────

export const phoneCredentials = mysqlTable("phone_credentials", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhoneCredential = typeof phoneCredentials.$inferSelect;
export type InsertPhoneCredential = typeof phoneCredentials.$inferInsert;

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
  customLogoUrl: varchar("customLogoUrl", { length: 512 }),
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
  status: mysqlEnum("status", ["Pending", "Sent", "Replied", "Scheduled", "X-Dated"])
    .default("Pending")
    .notNull(),
  notes: text("notes"),
  consentUrl: varchar("consentUrl", { length: 2048 }),
  consentConfirmed: boolean("consentConfirmed").notNull().default(false),
  optedOut: boolean("optedOut").notNull().default(false),
  optedOutAt: timestamp("optedOutAt"),
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
  isRead: boolean("isRead").notNull().default(false),
  isBot: boolean("isBot").notNull().default(false),   // true when sent by the AI bot
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
  folderId: int("folderId"),
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

// Branch types for A/B reply-based branching
export const DRIP_BRANCH_TYPES = ["positive", "negative"] as const;
export type DripBranchType = (typeof DRIP_BRANCH_TYPES)[number];

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
  // A/B branching: if set, this step is a branch child of parentStepId
  // null = linear step; 'positive' = sent when lead replies positively; 'negative' = sent when negative
  branchType: mysqlEnum("branchType", DRIP_BRANCH_TYPES),
  parentStepId: int("parentStepId"), // FK to dripSteps.id (self-referential)
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

// ─── Template Folders ─────────────────────────────────────────────────────────

export const templateFolders = mysqlTable("template_folders", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 64 }).notNull().default("Folder"),
  color: varchar("color", { length: 64 }).notNull().default("blue"),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TemplateFolder = typeof templateFolders.$inferSelect;
export type InsertTemplateFolder = typeof templateFolders.$inferInsert;

// ─── Keyword Promotion Rules ────────────────────────────────────────────────
// When an inbound SMS contains a trigger keyword, the lead's milestone is
// automatically promoted to the target status.
export const PROMOTION_TARGET_STATUSES = ["Replied", "Scheduled", "X-Dated"] as const;
export type PromotionTargetStatus = (typeof PROMOTION_TARGET_STATUSES)[number];

export const keywordPromotionRules = mysqlTable("keyword_promotion_rules", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  keyword: varchar("keyword", { length: 100 }).notNull(),
  targetStatus: mysqlEnum("targetStatus", PROMOTION_TARGET_STATUSES).notNull(),
  isActive: tinyint("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KeywordPromotionRule = typeof keywordPromotionRules.$inferSelect;
export type InsertKeywordPromotionRule = typeof keywordPromotionRules.$inferInsert;

// ─── Referral Codes ──────────────────────────────────────────────────────────
export const referralCodes = mysqlTable("referral_codes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReferralCode = typeof referralCodes.$inferSelect;
export type InsertReferralCode = typeof referralCodes.$inferInsert;

// ─── Referrals ───────────────────────────────────────────────────────────────
// Tracks which user referred which new signup
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(),   // user who shared the link
  referredId: int("referredId").notNull(),   // user who signed up via the link
  convertedAt: timestamp("convertedAt"),     // set when referred user pays
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

// ─── Appointments ─────────────────────────────────────────────────────────────
// Booking records created when an agent sends a booking link to a lead.
// The lead visits /book/:token and picks an available time slot.

export const APPOINTMENT_STATUSES = ["pending", "booked", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull(),
  leadId: int("leadId").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  agentNote: text("agentNote"),                          // optional personal note shown on booking page
  availableSlots: text("availableSlots").notNull(),      // JSON array of ISO datetime strings
  bookedSlot: varchar("bookedSlot", { length: 64 }),    // ISO datetime string of chosen slot
  status: mysqlEnum("status", APPOINTMENT_STATUSES).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;

// ─── Bot Configs ──────────────────────────────────────────────────────────────
// Per-org AI text bot configuration. One row per org.
export const BOT_TONES = ["friendly", "professional", "casual", "empathetic", "direct", "karen", "kevin"] as const;
export type BotTone = (typeof BOT_TONES)[number];

export const botConfigs = mysqlTable("bot_configs", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull().unique(),                          // one config per org
  enabled: boolean("enabled").notNull().default(false),
  botName: varchar("botName", { length: 100 }).notNull().default("Alex"),
  tone: mysqlEnum("tone", BOT_TONES).notNull().default("friendly"),
  identity: text("identity"),                                      // who the bot is (e.g. "You are Alex, an insurance advisor at...")
  openingMessage: text("openingMessage"),                          // first message sent when a new lead is added
  businessContext: text("businessContext"),                        // what the bot knows about the business / products
  customInstructions: text("customInstructions"),                  // extra rules / things to avoid
  maxRepliesPerLead: int("maxRepliesPerLead").notNull().default(10), // safety cap per lead
  replyDelay: mysqlEnum("replyDelay", ["instant", "1min", "random"]).notNull().default("instant"),
  firstMessageDelay: mysqlEnum("firstMessageDelay", ["instant", "1min", "random"]).notNull().default("instant"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BotConfig = typeof botConfigs.$inferSelect;
export type InsertBotConfig = typeof botConfigs.$inferInsert;
