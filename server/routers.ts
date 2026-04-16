import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  bulkCreateLeads,
  createKeywordRule,
  createLead,
  createMessage,
  createReferral,
  countBotReplies,
  deleteLead,
  deleteKeywordRule,
  getActiveKeywordRules,
  getBotConfig,
  getDefaultTemplate,
  getExistingPhones,
  getLeadById,
  getLeadStats,
  getMessagesByLeadId,
  getOrCreateReferralCode,
  getReferralCodeByCode,
  getUnreadReplies,
  listKeywordRules,
  listReferrals,
  markMessagesReadForLead,
  listLeads,
  updateKeywordRule,
  updateLead,
  updateTemplate,
  upsertBotConfig,
  createAppointment,
  getAppointmentByToken,
  getAppointmentsByOrg,
  updateAppointment,
} from "./db";
import {
  acceptInvite,
  canAddMember,
  createInvite,
  createOrganization,
  createUserWithEmail,
  createUserWithPhone,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  getOrgMembership,
  getOrganizationById,
  listAllOrganizations,
  listOrgMembers,
  removeMember,
  updateMemberRole,
  updateOrganization,
  updateUserLastSignedIn,
  verifyEmailPassword,
  createOtp,
  verifyOtp,
  upsertOrgTwilioConfig,
  getOrgTwilioConfig,
} from "./orgDb";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { isTwilioConfigured, renderTemplate, sendSms, sendSmsWithConfig } from "./twilio";
import { createCheckoutSession, createPortalSession } from "./billing";
import { PLANS } from "./products";
import {
  getOrCreateWebhookConfig,
  getWebhookLogs,
  regenerateSecret,
  updateWebhookConfig,
} from "./webhookEngine";
import {
  createFlowTemplate,
  createTemplateFolder,
  deleteFlowTemplate,
  deleteTemplateFolder,
  listFlowRules,
  listFlowTemplates,
  listTemplateFolders,
  seedDefaultTemplates,
  seedFlowRules,
  seedTemplateFolders,
  updateFlowTemplate,
  updateTemplateFolder,
  upsertFlowRule,
} from "./flowDb";
import {
  cloneDripSequence,
  createDripSequence,
  deleteDripSequence,
  enrollLeadInSequence,
  getDripSequenceById,
  listDripSequences,
  listDripSteps,
  listEnrollmentsForLead,
  listEnrollmentsForOrg,
  pauseEnrollment,
  resumeEnrollment,
  stopEnrollment,
  updateDripSequence,
  upsertDripStep,
  deleteDripStep,
  seedDefaultDripSequences,
} from "./dripDb";
import { DRIP_TRIGGER_CATEGORIES, REPLY_CATEGORIES, leads, messages, messageClassifications, ownerCredentials, users, leadDripEnrollments } from "../drizzle/schema";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { and, asc, eq, gte, sql } from "drizzle-orm";

const LeadStatusEnum = z.enum(["Pending", "Sent", "Replied", "Scheduled", "X-Dated"]);
const ReplyCategoryEnum = z.enum(REPLY_CATEGORIES);

// ─── Helper: get orgId from ctx or throw ─────────────────────────────────────

async function requireOrgId(userId: number): Promise<number> {
  const membership = await getOrgMembership(userId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "No organization found. Please complete onboarding." });
  return membership.orgId;
}

// ─── Custom Auth Router (phone OTP + email/password) ─────────────────────────

const customAuthRouter = router({
  // Send OTP to phone
  sendOtp: publicProcedure
    .input(z.object({ phone: z.string().min(7) }))
    .mutation(async ({ input }) => {
      const code = await createOtp(input.phone);
      // Try to send via Twilio if configured
      if (isTwilioConfigured()) {
        try {
          await sendSms(input.phone, `Your QuotePush.io verification code is: ${code}. Valid for 10 minutes.`);
        } catch (e) {
          console.error("[OTP] Failed to send SMS:", e);
        }
      } else {
        // In simulation mode, log the code
        console.log(`[OTP SIMULATION] Code for ${input.phone}: ${code}`);
      }
      return { success: true, simulated: !isTwilioConfigured() };
    }),

  // Verify OTP and sign in / sign up
  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string().min(7), code: z.string().length(6), name: z.string().optional() }))
    .mutation(async ({ ctx }) => {
      // We'll handle this via the dedicated endpoint below for now
      // This is a placeholder - actual verification happens in the login endpoint
      return { success: false };
    }),

  // Email/password registration
  registerEmail: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      orgName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await findUserByEmail(input.email);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Email already registered" });

      const user = await createUserWithEmail(input.email, input.password, input.name);
      const org = await createOrganization(input.orgName, user.id);

      // Seed org defaults
      await seedFlowRules(org.id);
      await seedDefaultTemplates(org.id);
      await seedDefaultDripSequences(org.id);

      // Auto-create a lead for the owner so every new signup appears on the Leads page
      try {
        const db2 = await getDb();
        if (db2 && ENV.ownerOpenId) {
          const ownerRows = await db2.select().from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1);
          const ownerUser = ownerRows[0];
          if (ownerUser) {
            const ownerMembership = await getOrgMembership(ownerUser.id).catch(() => null);
            if (ownerMembership) {
              await createLead({
                orgId: ownerMembership.orgId,
                name: input.name,
                phone: "email-only",
                email: input.email,
                company: input.orgName,
                notes: `New signup via QuotePush.io (no plan yet) - email: ${input.email}`,
                status: "Pending",
              });
            }
          }
        }
      } catch (e) {
        console.error("[Signup] Failed to create owner lead:", e);
      }

      // Notify owner of new signup
      try {
        await notifyOwner({
          title: `New signup: ${input.name}`,
          content: `${input.name} just created an account on QuotePush.io.\nEmail: ${input.email}\nOrg: ${input.orgName}\nNo plan yet - follow up now!`,
        });
      } catch { /* non-fatal */ }

      // Issue JWT session
      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: org.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      return { success: true, user: { id: user.id, name: user.name, email: user.email }, org };
    }),

  // Email/password login
  loginEmail: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await verifyEmailPassword(input.email, input.password);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" });

      await updateUserLastSignedIn(user.id);
      const membership = await getOrgMembership(user.id);

      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: membership?.orgId ?? null })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      return { success: true, user: { id: user.id, name: user.name, email: user.email }, org: membership?.org ?? null };
    }),

  // Owner master login (phone + password)
  ownerLogin: publicProcedure
    .input(z.object({ phone: z.string().min(7), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Normalize phone: strip non-digits for comparison
      const normalizedInput = input.phone.replace(/\D/g, "");

      // Find owner credential by phone
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [cred] = await db
        .select()
        .from(ownerCredentials)
        .where(eq(ownerCredentials.phone, normalizedInput))
        .limit(1);

      if (!cred) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid phone or password" });

      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid phone or password" });

      // Find or create the owner user record
      let user = await findUserByPhone(normalizedInput);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Owner account not found. Please sign in with Manus OAuth first." });

      await updateUserLastSignedIn(user.id);
      const membership = await getOrgMembership(user.id);

      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: membership?.orgId ?? null })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      return { success: true, user: { id: user.id, name: user.name, phone: user.phone }, org: membership?.org ?? null };
    }),

  // Owner set/update password (admin-only, called once to initialize)
  ownerSetPassword: adminProcedure
    .input(z.object({ phone: z.string().min(7), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const normalizedPhone = input.phone.replace(/\D/g, "");
      const hash = await bcrypt.hash(input.password, 12);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db
        .insert(ownerCredentials)
        .values({ phone: normalizedPhone, passwordHash: hash })
        .onDuplicateKeyUpdate({ set: { passwordHash: hash } });
      return { success: true };
    }),

  // Phone + password registration (no OTP needed)
  registerPhone: publicProcedure
    .input(z.object({
      phone: z.string().min(7),
      password: z.string().min(8),
      name: z.string().min(1),
      orgName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const normalizedPhone = input.phone.replace(/\D/g, "");
      const existing = await findUserByPhone(normalizedPhone);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Phone number already registered" });

      const user = await createUserWithPhone(normalizedPhone, input.name);
      const org = await createOrganization(input.orgName, user.id);
      await seedFlowRules(org.id);
      await seedDefaultTemplates(org.id);
      await seedDefaultDripSequences(org.id);

      // Auto-create a lead for the owner so new signups appear on the Leads page
      try {
        const db2 = await getDb();
        if (db2 && ENV.ownerOpenId) {
          const ownerRows = await db2.select().from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1);
          const ownerUser = ownerRows[0];
          if (ownerUser) {
            const ownerMembership = await getOrgMembership(ownerUser.id).catch(() => null);
            if (ownerMembership) {
              await createLead({
                orgId: ownerMembership.orgId,
                name: input.name,
                phone: normalizedPhone,
                company: input.orgName,
                notes: `New signup via QuotePush.io`,
                status: "Pending",
              });
            }
          }
        }
      } catch (e) {
        console.error("[Signup] Failed to create owner lead:", e);
      }

      // Notify owner of new signup
      try {
        await notifyOwner({
          title: `New signup: ${input.name}`,
          content: `${input.name} just created an account on QuotePush.io.\nPhone: ${normalizedPhone}\nOrg: ${input.orgName}\nNo plan yet - follow up now!`,
        });
      } catch { /* non-fatal */ }

      // Store phone credential
      const hash = await bcrypt.hash(input.password, 12);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { phoneCredentials } = await import("../drizzle/schema");
      await db.insert(phoneCredentials).values({ userId: user.id, phone: normalizedPhone, passwordHash: hash });

      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: org.id })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone }, org };
    }),

  // Phone + password login (no OTP needed)
  loginPhonePassword: publicProcedure
    .input(z.object({ phone: z.string().min(7), password: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const normalizedPhone = input.phone.replace(/\D/g, "");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { phoneCredentials } = await import("../drizzle/schema");
      const [cred] = await db.select().from(phoneCredentials).where(eq(phoneCredentials.phone, normalizedPhone)).limit(1);
      if (!cred) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid phone number or password" });

      const valid = await bcrypt.compare(input.password, cred.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid phone number or password" });

      const user = await findUserByPhone(normalizedPhone);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Account not found" });

      await updateUserLastSignedIn(user.id);
      const membership = await getOrgMembership(user.id);

      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: membership?.orgId ?? null })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true, user: { id: user.id, name: user.name, phone: user.phone }, org: membership?.org ?? null };
    }),

  // Phone OTP login/register (combined)
  loginPhone: publicProcedure
    .input(z.object({ phone: z.string().min(7), code: z.string().length(6), name: z.string().optional(), orgName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const valid = await verifyOtp(input.phone, input.code);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired verification code" });

      let user = await findUserByPhone(input.phone);
      let org = null;
      let isNew = false;

      if (!user) {
        // New user - require name + orgName
        if (!input.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required for new accounts" });
        if (!input.orgName) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization name is required for new accounts" });
        user = await createUserWithPhone(input.phone, input.name);
        const newOrg = await createOrganization(input.orgName, user.id);
        await seedFlowRules(newOrg.id);
        await seedDefaultTemplates(newOrg.id);
        await seedDefaultDripSequences(newOrg.id);
        org = newOrg;
        isNew = true;

        // Auto-create a lead for the owner so every new signup appears on the Leads page
        try {
          const db2 = await getDb();
          if (db2 && ENV.ownerOpenId) {
            const ownerRows = await db2.select().from(users).where(eq(users.openId, ENV.ownerOpenId)).limit(1);
            const ownerUser = ownerRows[0];
            if (ownerUser) {
              const ownerMembership = await getOrgMembership(ownerUser.id).catch(() => null);
              if (ownerMembership) {
                await createLead({
                  orgId: ownerMembership.orgId,
                  name: input.name,
                  phone: input.phone,
                  company: input.orgName,
                  notes: `New signup via QuotePush.io (no plan yet)`,
                  status: "Pending",
                });
              }
            }
          }
        } catch (e) {
          console.error("[Signup] Failed to create owner lead:", e);
        }

        // Notify owner of new signup
        try {
          await notifyOwner({
            title: `New signup: ${input.name}`,
            content: `${input.name} just created an account on QuotePush.io.\nPhone: ${input.phone}\nOrg: ${input.orgName}\nNo plan yet - follow up now!`,
          });
        } catch { /* non-fatal */ }
      } else {
        await updateUserLastSignedIn(user.id);
        const membership = await getOrgMembership(user.id);
        org = membership?.org ?? null;
      }

      const secret = new TextEncoder().encode(ENV.jwtSecret);
      const token = await new SignJWT({ userId: user.id, orgId: org?.id ?? null })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("30d")
        .sign(secret);

      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      return { success: true, isNew, user: { id: user.id, name: user.name, phone: user.phone }, org };
    }),
});

// ─── Organization Router ──────────────────────────────────────────────────────

const orgRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const membership = await getOrgMembership(ctx.user.id);
    if (!membership) return null;
    return {
      org: membership.org,
      role: membership.role,
      memberId: membership.id,
    };
  }),

  update: protectedProcedure
    .input(z.object({ name: z.string().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      await updateOrganization(orgId, { name: input.name });
      return getOrganizationById(orgId);
    }),

  members: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return listOrgMembers(orgId);
  }),

  invite: protectedProcedure
    .input(z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      role: z.enum(["admin", "member"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const org = await getOrganizationById(orgId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      // Check seat limits for Base plan
      if (org.plan === "base") {
        const canAdd = await canAddMember(orgId);
        if (!canAdd) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Base plan includes 1 seat. Upgrade to Elite for unlimited team members.",
          });
        }
      }

      const token = await createInvite(orgId, input.email, input.phone, input.role ?? "member");
      return { token, inviteUrl: `${process.env.FRONTEND_URL ?? ""}/invite/${token}` };
    }),

  acceptInvite: publicProcedure
    .input(z.object({ token: z.string(), userId: z.number() }))
    .mutation(async ({ input }) => {
      const member = await acceptInvite(input.token, input.userId);
      if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite" });
      return { success: true };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ memberId: z.number(), role: z.enum(["admin", "member"]) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      await updateMemberRole(orgId, input.memberId, input.role);
      return { success: true };
    }),

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      await removeMember(orgId, input.memberId);
      return { success: true };
    }),

  // Create org for existing Manus OAuth users who don't have one yet
  createForCurrentUser: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getOrgMembership(ctx.user.id);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "You already belong to an organization." });
      const org = await createOrganization(input.name, ctx.user.id);
      await seedFlowRules(org.id);
      await seedDefaultTemplates(org.id);
      await seedDefaultDripSequences(org.id);
      return { org, role: "owner" as const };
    }),

  // Add a new member directly by phone number + set their password
  addMemberByPhone: protectedProcedure
    .input(z.object({
      phone: z.string().min(7),
      name: z.string().min(1),
      password: z.string().min(6),
      role: z.enum(["admin", "member"]).default("member"),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const org = await getOrganizationById(orgId);
      if (!org) throw new TRPCError({ code: "NOT_FOUND" });

      // Only Elite orgs can add unlimited members
      if (org.plan === "base") {
        const canAdd = await canAddMember(orgId);
        if (!canAdd) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Base plan includes 1 seat. Upgrade to Elite for unlimited team members.",
          });
        }
      }

      const normalizedPhone = input.phone.replace(/\D/g, "");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const { phoneCredentials } = await import("../drizzle/schema");

      // Check if phone already registered
      const existingUser = await findUserByPhone(normalizedPhone);
      let userId: number;

      if (existingUser) {
        // User exists - just add them to this org if not already a member
        const members = await listOrgMembers(orgId);
        const alreadyMember = members.some(m => m.userId === existingUser.id);
        if (alreadyMember) {
          throw new TRPCError({ code: "CONFLICT", message: "This phone number is already a member of your organization." });
        }
        userId = existingUser.id;
      } else {
        // Create new user
        const newUser = await createUserWithPhone(normalizedPhone, input.name);
        userId = newUser.id;

        // Set their password
        const hash = await bcrypt.hash(input.password, 12);
        const existingCred = await db.select().from(phoneCredentials).where(eq(phoneCredentials.phone, normalizedPhone)).limit(1);
        if (existingCred.length === 0) {
          await db.insert(phoneCredentials).values({ userId, phone: normalizedPhone, passwordHash: hash });
        }
      }

      // Add to org
      const { orgMembers: orgMembersTable } = await import("../drizzle/schema");
      await db.insert(orgMembersTable).values({
        orgId,
        userId,
        role: input.role,
        inviteAccepted: 1,
      });

      return { success: true, phone: normalizedPhone, name: input.name };
    }),

  // Test Twilio config by sending a test SMS to the owner's phone
  testTwilioConfig: protectedProcedure
    .input(z.object({ toPhone: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const config = await getOrgTwilioConfig(orgId);
      if (!config?.accountSid) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Twilio is not configured yet.' });
      try {
        await sendSmsWithConfig(
          input.toPhone,
          'QuotePush.io - Twilio test message. Your SMS integration is working!',
          config.accountSid,
          config.authToken,
          config.phoneNumber
        );
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: e.message ?? 'SMS send failed' });
      }
    }),

  // Twilio config per org
  getTwilioConfig: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const config = await getOrgTwilioConfig(orgId);
    if (!config) return null;
    return {
      id: config.id,
      accountSid: config.accountSid,
      phoneNumber: config.phoneNumber,
      // Never return auth token to frontend
    };
  }),

  saveTwilioConfig: protectedProcedure
    .input(z.object({
      accountSid: z.string().min(1),
      authToken: z.string().min(1),
      phoneNumber: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      await upsertOrgTwilioConfig(orgId, input.accountSid, input.authToken, input.phoneNumber);
      return { success: true };
    }),
});

// ─── Leads Router ─────────────────────────────────────────────────────────────

const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional(), status: LeadStatusEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return listLeads(orgId, input);
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return getLeadStats(orgId);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const lead = await getLeadById(input.id);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const msgs = await getMessagesByLeadId(input.id);
      // Mark all inbound messages as read when conversation is opened
      await markMessagesReadForLead(input.id, orgId);
      return { lead, messages: msgs };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      company: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().optional(),
      consentUrl: z.string().url().optional().or(z.literal("")),
      consentConfirmed: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const lead = await createLead({
        orgId,
        name: input.name,
        phone: input.phone,
        company: input.company ?? null,
        email: input.email || null,
        notes: input.notes ?? null,
        consentUrl: input.consentUrl || null,
        consentConfirmed: input.consentConfirmed ?? false,
        status: "Pending",
      });

      // ─── AI Bot: send opening message ─────────────────────────────────────────
      try {
        if (!lead) throw new Error("Lead creation failed");
        const botConfig = await getBotConfig(orgId);
        if (botConfig?.enabled && botConfig.openingMessage) {
          // Apply first-message delay
          const firstMsgDelay = (botConfig as any).firstMessageDelay ?? "instant";
          if (firstMsgDelay === "1min") {
            await new Promise((r) => setTimeout(r, 60_000));
          } else if (firstMsgDelay === "random") {
            const ms = (60 + Math.floor(Math.random() * 120)) * 1000;
            console.log(`[AIBot] First-message random delay: ${Math.round(ms / 1000)}s`);
            await new Promise((r) => setTimeout(r, ms));
          }
          const firstName = input.name.split(" ")[0] ?? input.name;
          const botName = botConfig.botName ?? "Alex";

          // Helper to send one SMS and log it
          const orgConfig = await getOrgTwilioConfig(orgId);
          const sendOne = async (body: string) => {
            if (orgConfig?.accountSid) {
              const r = await sendSmsWithConfig(lead.phone, body, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: r.sid ?? null, twilioStatus: r.status ?? "sent", isBot: true });
            } else if (isTwilioConfigured()) {
              const r = await sendSms(lead.phone, body);
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: r.sid ?? null, twilioStatus: r.status ?? "sent", isBot: true });
            } else {
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: null, twilioStatus: "simulated", isBot: true });
            }
          };

          if (botConfig.tone === "kevin") {
            // Kevin's multi-message opening sequence
            const kevinVariants = [
              [
                `Hey ${firstName} — just reviewing your info now and I think we can—`,
                `sorry, typo`,
                `Hey, just reviewed your info and I think we can help pretty quickly. I'm clearly an elite texter. Are you free Monday for a quick 10-minute call? I can help get your insurance quote squared away.`,
              ],
              [
                `Hey ${firstName} — looks like we can probbaly get you a—`,
                `probably… wow`,
                `Alright, off to a strong start. Anyway — I took a look and we should be able to get you a solid quote pretty fast. Are you free Monday for a quick 10-minute call?`,
              ],
              [
                `Hey ${firstName} — just looked over your info and I thi—`,
                `I think… typing is hard apparently`,
                `Anyway, I took a look and we can likely get you a better rate pretty quickly. Got 10 minutes Monday to knock this out?`,
              ],
              [
                `Hey ${firstName} — just looked over your info and we can—`,
                `can help… clearly I type faster than I think`,
                `Quick version: we can likely get you a better rate. Better to do a quick 10-minute call Monday or later in the week?`,
              ],
            ];
            const msgs = kevinVariants[Math.floor(Math.random() * kevinVariants.length)];
            await sendOne(msgs[0]);
            await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000)); // 1.5-3.5s
            await sendOne(msgs[1]);
            await new Promise((r) => setTimeout(r, 3000 + Math.random() * 3000)); // 3-6s
            await sendOne(msgs[2]);
          } else {
            const openingText = botConfig.openingMessage
              .replace(/\{firstName\}/g, firstName)
              .replace(/\{botName\}/g, botName);
            await sendOne(openingText);
          }

          await updateLead(lead.id, { status: "Sent" });
          console.log(`[AIBot] Sent opening message to new lead ${lead.id}`);
        }
      } catch (botErr) {
        console.error("[AIBot] Opening message error:", botErr);
      }

      return lead;
    }),

  bulkCreate: protectedProcedure
    .input(z.array(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      company: z.string().optional(),
      email: z.string().optional(),
      skipDuplicates: z.boolean().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const existingPhones = await getExistingPhones(orgId);
      const rows = input.filter(l => {
        if (!l.skipDuplicates) return true;
        return !existingPhones.has(l.phone.replace(/\D/g, ""));
      });
      return bulkCreateLeads(orgId, rows.map((l) => ({
        orgId,
        name: l.name,
        phone: l.phone,
        company: l.company ?? null,
        email: l.email || null,
        status: "Pending" as const,
      })));
    }),

  checkDuplicates: protectedProcedure
    .input(z.array(z.string()))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const existingPhones = await getExistingPhones(orgId);
      const duplicates = input.filter(phone => existingPhones.has(phone.replace(/\D/g, "")));
      return { duplicateCount: duplicates.length, duplicatePhones: duplicates };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      phone: z.string().min(1).optional(),
      company: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      status: LeadStatusEnum.optional(),
      notes: z.string().optional(),
      consentUrl: z.string().url().optional().or(z.literal("")),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateLead(id, data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteLead(input.id)),
});

// ─── Templates Router ─────────────────────────────────────────────────────────

const templatesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return getDefaultTemplate(orgId);
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), body: z.string().min(1) }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateTemplate(id, data);
    }),
});

// ─── SMS Router ───────────────────────────────────────────────────────────────

const smsRouter = router({
  isConfigured: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const orgConfig = await getOrgTwilioConfig(orgId);
    return !!(orgConfig?.accountSid) || isTwilioConfigured();
  }),

  send: protectedProcedure
    .input(z.object({ leadId: z.number(), schedulingLink: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      const template = await getDefaultTemplate(orgId);
      if (!template) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No SMS template found" });

      const body = renderTemplate(template.body, { name: lead.name, company: lead.company, link: input.schedulingLink });

      let twilioSid: string | undefined;
      let twilioStatus: string | undefined;
      const orgConfig = await getOrgTwilioConfig(orgId);

      if (orgConfig?.accountSid) {
        const result = await sendSmsWithConfig(lead.phone, body, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
        twilioSid = result.sid;
        twilioStatus = result.status;
      } else if (isTwilioConfigured()) {
        const result = await sendSms(lead.phone, body);
        twilioSid = result.sid;
        twilioStatus = result.status;
      }

      await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: twilioSid ?? null, twilioStatus: twilioStatus ?? "simulated" });
      await updateLead(lead.id, { status: "Sent" });

      return { success: true, simulated: !orgConfig?.accountSid && !isTwilioConfigured() };
    }),

  sendBulk: protectedProcedure
    .input(z.object({ schedulingLink: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const pendingLeads = await listLeads(orgId, { status: "Pending" });
      const template = await getDefaultTemplate(orgId);
      if (!template) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No SMS template found" });

      const orgConfig = await getOrgTwilioConfig(orgId);
      const results = [];

      for (const lead of pendingLeads) {
        const body = renderTemplate(template.body, { name: lead.name, company: lead.company, link: input?.schedulingLink });
        let twilioSid: string | undefined;
        let twilioStatus: string | undefined;

        if (orgConfig?.accountSid) {
          try {
            const result = await sendSmsWithConfig(lead.phone, body, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
            twilioSid = result.sid;
            twilioStatus = result.status;
          } catch (e) {
            results.push({ leadId: lead.id, success: false, error: String(e) });
            continue;
          }
        } else if (isTwilioConfigured()) {
          try {
            const result = await sendSms(lead.phone, body);
            twilioSid = result.sid;
            twilioStatus = result.status;
          } catch (e) {
            results.push({ leadId: lead.id, success: false, error: String(e) });
            continue;
          }
        }

        await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: twilioSid ?? null, twilioStatus: twilioStatus ?? "simulated" });
        await updateLead(lead.id, { status: "Sent" });
        results.push({ leadId: lead.id, success: true });
      }

      return { sent: results.filter((r) => r.success).length, total: pendingLeads.length, results };
    }),

  previewMessage: protectedProcedure
    .input(z.object({ leadId: z.number(), schedulingLink: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const template = await getDefaultTemplate(orgId);
      if (!template) return { body: "" };
      const body = renderTemplate(template.body, { name: lead.name, company: lead.company, link: input.schedulingLink });
      return { body };
    }),
});

// ─── Webhook Router ──────────────────────────────────────────────────────────

const webhookRouter = router({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return getOrCreateWebhookConfig(orgId);
  }),

  saveConfig: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), fieldMappings: z.string().min(1), autoSend: z.boolean(), schedulingLink: z.string().optional() }))
    .mutation(({ input }) =>
      updateWebhookConfig(input.id, {
        name: input.name,
        fieldMappings: input.fieldMappings,
        autoSend: input.autoSend ? 1 : 0,
        schedulingLink: input.schedulingLink ?? null,
      })
    ),

  regenerateSecret: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => regenerateSecret(input.id)),

  getLogs: protectedProcedure
    .input(z.object({ limit: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return getWebhookLogs(orgId, input?.limit ?? 20);
    }),
});

// ─── Flow Templates Router ──────────────────────────────────────────────────

const flowTemplatesRouter = router({
  list: protectedProcedure
    .input(z.object({ category: ReplyCategoryEnum.optional() }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return listFlowTemplates(orgId, input?.category);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), category: ReplyCategoryEnum, body: z.string().min(1), isActive: z.boolean().optional(), folderId: z.number().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createFlowTemplate({ orgId, name: input.name, category: input.category, body: input.body, isActive: input.isActive === false ? 0 : 1, folderId: input.folderId ?? null });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), category: ReplyCategoryEnum.optional(), body: z.string().min(1).optional(), isActive: z.boolean().optional(), folderId: z.number().nullable().optional() }))
    .mutation(({ input }) => {
      const { id, isActive, ...rest } = input;
      return updateFlowTemplate(id, { ...rest, ...(isActive !== undefined ? { isActive: isActive ? 1 : 0 } : {}) });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteFlowTemplate(input.id)),

  seed: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    await seedFlowRules(orgId);
    await seedDefaultTemplates(orgId);
    await seedDefaultDripSequences(orgId);
    await seedTemplateFolders(orgId);
    return { success: true };
  }),
});

// ─── Template Folders Router ─────────────────────────────────────────────────────

const templateFoldersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return listTemplateFolders(orgId);
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1), icon: z.string().optional(), color: z.string().optional(), sortOrder: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createTemplateFolder({ orgId, name: input.name, icon: input.icon ?? "Folder", color: input.color ?? "blue", sortOrder: input.sortOrder ?? 0 });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), icon: z.string().optional(), color: z.string().optional(), sortOrder: z.number().optional() }))
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return updateTemplateFolder(id, rest);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteTemplateFolder(input.id)),

  seed: protectedProcedure.mutation(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    await seedTemplateFolders(orgId);
    return { success: true };
  }),
});

// ─── Flow Rules Router ────────────────────────────────────────────────────────

const flowRulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return listFlowRules(orgId);
  }),

  upsert: protectedProcedure
    .input(z.object({ category: ReplyCategoryEnum, templateId: z.number().nullable().optional(), autoSend: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return upsertFlowRule(orgId, { category: input.category, templateId: input.templateId ?? null, autoSend: input.autoSend });
    }),

  categories: protectedProcedure.query(() => REPLY_CATEGORIES),
});

// ─── Billing Router ─────────────────────────────────────────────────────────

const billingRouter = router({
  plans: publicProcedure.query(() => PLANS),

  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const org = await getOrganizationById(orgId);
    if (!org) return null;
    return {
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      stripeCustomerId: org.stripeCustomerId,
      stripeSubscriptionId: org.stripeSubscriptionId,
    };
  }),

  createCheckout: protectedProcedure
    .input(z.object({ planId: z.enum(["base", "elite"]), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const url = await createCheckoutSession({
        orgId,
        planId: input.planId,
        userEmail: ctx.user.email,
        userName: ctx.user.name,
        userId: ctx.user.id,
        origin: input.origin,
      });
      return { url };
    }),

  createPortal: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const url = await createPortalSession({ orgId, origin: input.origin });
      return { url };
    }),
});

// ─── Drip Router ─────────────────────────────────────────────────────────────

const DripTriggerCategoryEnum = z.enum(DRIP_TRIGGER_CATEGORIES);

const dripRouter = router({
  // ─── Sequences ──────────────────────────────────────────────────────────────
  listSequences: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const seqs = await listDripSequences(orgId);
    // Attach steps (linear + branch children) to each sequence
    return Promise.all(
      seqs.map(async (seq) => {
        const allSteps = await listDripSteps(seq.id);
        // Separate linear steps from branch children
        const linearSteps = allSteps.filter((s) => !s.branchType);
        const branchSteps = allSteps.filter((s) => !!s.branchType);
        return {
          ...seq,
          steps: linearSteps,
          branchSteps, // branch children keyed by parentStepId
        };
      })
    );
  }),

  createSequence: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        triggerCategory: DripTriggerCategoryEnum,
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createDripSequence({
        orgId,
        name: input.name,
        triggerCategory: input.triggerCategory,
        isActive: input.isActive === false ? 0 : 1,
      });
    }),

  updateSequence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        triggerCategory: DripTriggerCategoryEnum.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, isActive, ...rest } = input;
      return updateDripSequence(id, {
        ...rest,
        ...(isActive !== undefined ? { isActive: isActive ? 1 : 0 } : {}),
      });
    }),

  deleteSequence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteDripSequence(input.id)),

  cloneSequence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const original = await getDripSequenceById(input.id);
      if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Sequence not found" });
      const newName = input.name ?? `${original.name} (Copy)`;
      return cloneDripSequence(input.id, orgId, newName);
    }),

  // ─── Steps ───────────────────────────────────────────────────────────────────
  upsertStep: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(), // if provided, update by id
        sequenceId: z.number(),
        stepNumber: z.number().min(1),
        delayAmount: z.number().min(0),
        delayUnit: z.enum(["minutes", "days"]),
        delayDays: z.number().min(0).optional(), // kept for backward compat
        name: z.string().min(1),
        body: z.string().min(1),
        branchType: z.enum(["positive", "negative"]).nullable().optional(),
        parentStepId: z.number().nullable().optional(),
      })
    )
    .mutation(({ input }) => upsertDripStep({
      ...input,
      delayDays: input.delayDays ?? input.delayAmount, // keep legacy field in sync
      branchType: input.branchType ?? undefined,
      parentStepId: input.parentStepId ?? undefined,
    })),

  deleteStep: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteDripStep(input.id)),

  // ─── Enrollments ───────────────────────────────────────────────────────────
  listEnrollments: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return listEnrollmentsForOrg(orgId);
  }),

  enrollLead: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        sequenceId: z.number(),
        firstStepDelayDays: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return enrollLeadInSequence(
        input.leadId,
        orgId,
        input.sequenceId,
        input.firstStepDelayDays ?? 0
      );
    }),

  pauseLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(({ input }) => pauseEnrollment(input.leadId)),

  resumeLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(({ input }) => resumeEnrollment(input.leadId)),

  stopLead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(({ input }) => stopEnrollment(input.leadId, "manual")),

  leadEnrollments: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .query(({ input }) => listEnrollmentsForLead(input.leadId)),

  triggerCategories: protectedProcedure.query(() => DRIP_TRIGGER_CATEGORIES),

  generateNextStep: protectedProcedure
    .input(
      z.object({
        sequenceName: z.string(),
        triggerCategory: z.string(),
        stepNumber: z.number().min(1),
        previousSteps: z.array(
          z.object({
            stepNumber: z.number(),
            name: z.string(),
            body: z.string(),
            delayAmount: z.number(),
            delayUnit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const { sequenceName, triggerCategory, stepNumber, previousSteps } = input;
      const prevContext = previousSteps.length > 0
        ? previousSteps.map((s) =>
            `Step ${s.stepNumber} (after ${s.delayAmount} ${s.delayUnit}): "${s.body}"`
          ).join("\n")
        : "No previous steps - this is the first message.";

      const systemPrompt = `You are an expert SMS copywriter for sales outreach. Write concise, friendly, and effective follow-up SMS messages. Always keep messages under 160 characters when possible. Use {{firstName}}, {{company}}, and {{link}} as placeholders where appropriate. Never use emojis. Return ONLY the message body text, no quotes, no labels.`;

      const userPrompt = `Write step ${stepNumber} of a drip sequence called "${sequenceName}" for leads who responded with "${triggerCategory}" intent.\n\nPrevious steps in this sequence:\n${prevContext}\n\nWrite a natural follow-up message that continues the conversation. Be warm, brief, and move toward a call or meeting booking.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const raw = response?.choices?.[0]?.message?.content;
      const body = (typeof raw === "string" ? raw : "").trim();
      if (!body) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI generation failed" });
      return { body };
    }),
});

// ─── Admin Router ───────────────────────────────────────────────────────────

const adminRouter = router({
  listAccounts: adminProcedure.query(async () => {
    return listAllOrganizations();
  }),
  setOrgLogo: adminProcedure
    .input(z.object({ orgId: z.number(), logoUrl: z.string().nullable() }))
    .mutation(async ({ input }) => {
      await updateOrganization(input.orgId, { customLogoUrl: input.logoUrl ?? undefined });
      return { ok: true };
    }),
});

// ─── App Router ─────────────────────────────────────────────────────────────

// ─── Analytics Router ───────────────────────────────────────────────────────

const analyticsRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const db = await getDb();
    if (!db) return null;

    // Lead milestone breakdown
    const leadRows = await db
      .select({ status: leads.status, count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.orgId, orgId))
      .groupBy(leads.status);

    // Messages sent per day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const msgRows = await db
      .select({
        day: sql<string>`DATE_FORMAT(messages.sentAt, '%Y-%m-%d')`,
        direction: messages.direction,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), gte(messages.sentAt, thirtyDaysAgo)))
      .groupBy(sql`DATE_FORMAT(messages.sentAt, '%Y-%m-%d')`, messages.direction);

    // Reply category breakdown
    const categoryRows = await db
      .select({ category: messageClassifications.category, count: sql<number>`count(*)` })
      .from(messageClassifications)
      .innerJoin(messages, eq(messageClassifications.messageId, messages.id))
      .where(eq(messages.orgId, orgId))
      .groupBy(messageClassifications.category);

    // Average reply time (time between outbound message and next inbound from same lead)
    const replyTimeRows = await db
      .select({
        leadId: messages.leadId,
        direction: messages.direction,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .where(eq(messages.orgId, orgId))
      .orderBy(messages.leadId, messages.sentAt);

    // Compute reply times in minutes
    const replyTimes: number[] = [];
    const byLead = new Map<number, typeof replyTimeRows>();
    for (const row of replyTimeRows) {
      if (!byLead.has(row.leadId)) byLead.set(row.leadId, []);
      byLead.get(row.leadId)!.push(row);
    }
    for (const msgs of Array.from(byLead.values())) {
      for (let i = 1; i < msgs.length; i++) {
        if (msgs[i].direction === "inbound" && msgs[i - 1].direction === "outbound") {
          const diff = (new Date(msgs[i].sentAt).getTime() - new Date(msgs[i - 1].sentAt).getTime()) / 60000;
          if (diff >= 0 && diff <= 10080) replyTimes.push(Math.round(diff)); // cap at 1 week
        }
      }
    }

    // Bucket reply times: <5m, 5-30m, 30m-2h, 2-24h, 1-7d
    const buckets = [
      { label: "< 5 min", min: 0, max: 5, count: 0 },
      { label: "5–30 min", min: 5, max: 30, count: 0 },
      { label: "30 min–2 hr", min: 30, max: 120, count: 0 },
      { label: "2–24 hr", min: 120, max: 1440, count: 0 },
      { label: "1–7 days", min: 1440, max: 10080, count: 0 },
    ];
    for (const t of replyTimes) {
      for (const b of buckets) {
        if (t >= b.min && t < b.max) { b.count++; break; }
      }
    }
    const avgReplyMinutes = replyTimes.length
      ? Math.round(replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length)
      : null;

    // Total leads, total messages
    const totalLeads = leadRows.reduce((s, r) => s + Number(r.count), 0);
    const totalMessages = msgRows.reduce((s, r) => s + Number(r.count), 0);
    const totalReplies = msgRows
      .filter((r) => r.direction === "inbound")
      .reduce((s, r) => s + Number(r.count), 0);

    return {
      totalLeads,
      totalMessages,
      totalReplies,
      replyRate: totalMessages > 0 ? Math.round((totalReplies / totalMessages) * 100) : 0,
      avgReplyMinutes,
      leadsByMilestone: leadRows.map((r) => ({ status: r.status, count: Number(r.count) })),
      messagesPerDay: msgRows.map((r) => ({ day: r.day, direction: r.direction, count: Number(r.count) })),
      replyCategories: categoryRows.map((r) => ({ category: r.category, count: Number(r.count) })),
      replyTimeBuckets: buckets,
    };
  }),
});

// ─── Notifications Router ──────────────────────────────────────────────────

const notificationsRouter = router({
  unreadReplies: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const replies = await getUnreadReplies(orgId);
    return { count: replies.length, items: replies };
  }),

  markLeadRead: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      await markMessagesReadForLead(input.leadId, orgId);
      return { success: true };
    }),
});

// ─── Keyword Promotion Router ─────────────────────────────────────────────────
const PromotionTargetStatusEnum = z.enum(["Replied", "Scheduled", "X-Dated"]);

const keywordPromotionRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return listKeywordRules(orgId);
  }),

  create: protectedProcedure
    .input(z.object({ keyword: z.string().min(1).max(100), targetStatus: PromotionTargetStatusEnum }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createKeywordRule({ orgId, keyword: input.keyword.trim(), targetStatus: input.targetStatus });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), keyword: z.string().min(1).max(100).optional(), targetStatus: PromotionTargetStatusEnum.optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgId(ctx.user.id);
      const { id, isActive, ...rest } = input;
      return updateKeywordRule(id, { ...rest, ...(isActive !== undefined ? { isActive: isActive ? 1 : 0 } : {}) });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireOrgId(ctx.user.id);
      await deleteKeywordRule(input.id);
      return { success: true };
    }),
});

// ─── Referrals Router ──────────────────────────────────────────────────────────────
const referralsRouter = router({
  myCode: protectedProcedure.query(async ({ ctx }) => {
    const code = await getOrCreateReferralCode(ctx.user.id);
    return { code, link: `${ctx.req.headers.origin ?? ""}/ref/${code}` };
  }),

  myReferrals: protectedProcedure.query(async ({ ctx }) => {
    return listReferrals(ctx.user.id);
  }),

  // Public: called when a referred user lands on /ref/:code
  trackVisit: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      const row = await getReferralCodeByCode(input.code);
      if (!row) return { valid: false, referrerId: null, referrerName: null };
      // Look up the referrer's display name
      const referrer = await findUserById(row.userId);
      const referrerName = referrer?.name ?? null;
      return { valid: true, referrerId: row.userId, referrerName };
    }),

  // Called after a referred user signs up
  recordSignup: publicProcedure
    .input(z.object({ referrerId: z.number(), referredId: z.number() }))
    .mutation(async ({ input }) => {
      await createReferral({ referrerId: input.referrerId, referredId: input.referredId });
      return { success: true };
    }),
});

// ─── Usage Dashboard Router ──────────────────────────────────────────────────
const usageDashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const db = await getDb();
    if (!db) return null;

    const totalLeadsRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(eq(leads.orgId, orgId));
    const totalLeads = Number(totalLeadsRows[0]?.count ?? 0);

    const bookedRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.orgId, orgId), sql`${leads.status} IN ('Scheduled','X-Dated')`));
    const booked = Number(bookedRows[0]?.count ?? 0);

    const sentRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.direction, "outbound")));
    const totalSent = Number(sentRows[0]?.count ?? 0);

    const replyRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), eq(messages.direction, "inbound")));
    const totalReplies = Number(replyRows[0]?.count ?? 0);

    const enrollRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(leadDripEnrollments)
      .where(and(eq(leadDripEnrollments.orgId, orgId), eq(leadDripEnrollments.status, "active")));
    const activeEnrollments = Number(enrollRows[0]?.count ?? 0);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const msgRows = await db
      .select({
        day: sql<string>`DATE_FORMAT(messages.sentAt, '%Y-%m-%d')`,
        direction: messages.direction,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(and(eq(messages.orgId, orgId), gte(messages.sentAt, thirtyDaysAgo)))
      .groupBy(sql`DATE_FORMAT(messages.sentAt, '%Y-%m-%d')`, messages.direction);

    const org = await getOrganizationById(orgId);
    const replyRate = totalSent > 0 ? Math.round((totalReplies / totalSent) * 100) : 0;

    return {
      totalLeads,
      booked,
      totalSent,
      totalReplies,
      replyRate,
      activeEnrollments,
      messagesPerDay: msgRows.map((r) => ({ day: r.day, direction: r.direction, count: Number(r.count) })),
      plan: org?.plan ?? null,
      subscriptionStatus: org?.subscriptionStatus ?? null,
    };
  }),
});

// ─── Bot Router ─────────────────────────────────────────────────────────────
const botRouter = router({
  getConfig: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    return getBotConfig(orgId);
  }),

  saveConfig: protectedProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      botName: z.string().min(1).max(100).optional(),
      tone: z.enum(["friendly", "professional", "casual", "empathetic", "direct", "karen", "kevin"]).optional(),
      identity: z.string().max(2000).optional(),
      openingMessage: z.string().max(1000).optional(),
      businessContext: z.string().max(3000).optional(),
      customInstructions: z.string().max(2000).optional(),
      maxRepliesPerLead: z.number().int().min(1).max(50).optional(),
      replyDelay: z.enum(["instant", "1min", "random"]).optional(),
      firstMessageDelay: z.enum(["instant", "1min", "random"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return upsertBotConfig(orgId, input);
    }),

  testMessage: protectedProcedure
    .input(z.object({
      // Current bot config (may not be saved yet)
      botName: z.string().optional(),
      tone: z.enum(["friendly", "professional", "casual", "empathetic", "direct", "karen", "kevin"]).optional(),
      identity: z.string().optional(),
      businessContext: z.string().optional(),
      customInstructions: z.string().optional(),
      // Conversation so far
      history: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })),
      // The new message from the simulated lead
      message: z.string().min(1).max(500),
      // Optional lead first name for personalisation
      leadName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const botName = input.botName ?? "Alex";
      const toneGuide: Record<string, string> = {
        friendly: "Be warm, approachable, and conversational. Use casual language and the occasional emoji.",
        professional: "Be polished and business-like. Avoid slang.",
        casual: "Be relaxed and informal, like texting a friend.",
        empathetic: "Be understanding and patient. Acknowledge their situation before responding.",
        direct: "Be concise and to the point. No fluff.",
        karen: "You are Karen. You are aggressively helpful, slightly pushy, and very persistent. You act like you are doing the lead a huge favor by texting them. You are not rude, but you are relentless and a little over-the-top enthusiastic. You use phrases like 'I just HAVE to tell you', 'honestly you would be crazy not to', 'I am not going to let you miss this'. You are the person who will not take no for an answer but somehow still feels friendly.",
        kevin: "You are Kevin, a slightly clumsy but surprisingly effective insurance advisor. You already sent the lead a funny opening sequence with a typo and a self-correction. Now you are in follow-up mode. Be warm, self-aware, and a little goofy but always pivot back to being genuinely helpful. You can reference your clumsy opener if it comes up naturally. Keep replies short, casual, and human. You are weirdly effective despite the chaos.",
      };
      const firstName = input.leadName ?? "there";
      const systemPrompt = [
        input.identity?.replace(/\{botName\}/g, botName) ??
          `You are ${botName}, a friendly insurance advisor helping leads get a quote.`,
        `Tone: ${toneGuide[input.tone ?? "friendly"]}`,
        input.businessContext ? `Business context:\n${input.businessContext}` : "",
        input.customInstructions ? `Rules:\n${input.customInstructions}` : "",
        `You are texting ${firstName}. Keep replies SHORT (1-3 sentences max). Never use markdown. Never use em dashes. Always be respectful of their time.`,
        `IMPORTANT - Write like a real human texting from their phone, not a polished AI. Use casual language, occasional filler words like "yeah", "honestly", "so", "I mean". Vary your sentence length. Sometimes start mid-thought. Avoid bullet points, numbered lists, formal greetings, and sign-offs. Never sound like a robot or a customer service script. Typos are okay occasionally. Keep it real.`,
        `THIS IS A TEST SIMULATION - no real SMS will be sent.`,
      ].filter(Boolean).join("\n\n");

      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...input.history,
        { role: "user", content: input.message },
      ];

      const response = await invokeLLM({ messages });
      const rawContent = response?.choices?.[0]?.message?.content;
      const reply = typeof rawContent === "string" ? rawContent.trim() : "(no response)";
      return { reply };
    }),
});

// ─── Booking Router ──────────────────────────────────────────────────────────────────────────────

const bookingRouter = router({
  // Create a booking link for a lead (protected - agent only)
  create: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      agentNote: z.string().optional(),
      availableSlots: z.array(z.string()).min(1).max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const lead = await getLeadById(input.leadId);
      if (!lead || lead.orgId !== orgId) throw new TRPCError({ code: 'NOT_FOUND' });
      const crypto = await import('crypto');
      const token = crypto.randomBytes(24).toString('hex');
      const appt = await createAppointment({
        orgId,
        leadId: input.leadId,
        token,
        agentName: ctx.user.name ?? 'Agent',
        agentNote: input.agentNote ?? null,
        availableSlots: JSON.stringify(input.availableSlots),
        status: 'pending',
      });
      return { appointment: appt, token };
    }),

  // List all bookings for the org (protected)
  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = await requireOrgId(ctx.user.id);
    const appts = await getAppointmentsByOrg(orgId);
    return appts;
  }),

  // Get a booking by token (public - for the lead's booking page)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const appt = await getAppointmentByToken(input.token);
      if (!appt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking link not found or expired.' });
      return {
        id: appt.id,
        agentName: appt.agentName,
        agentNote: appt.agentNote,
        availableSlots: JSON.parse(appt.availableSlots) as string[],
        bookedSlot: appt.bookedSlot,
        status: appt.status,
      };
    }),

  // Confirm a slot (public - lead picks a time)
  confirmSlot: publicProcedure
    .input(z.object({ token: z.string(), slot: z.string() }))
    .mutation(async ({ input }) => {
      const appt = await getAppointmentByToken(input.token);
      if (!appt) throw new TRPCError({ code: 'NOT_FOUND' });
      if (appt.status === 'booked') throw new TRPCError({ code: 'CONFLICT', message: 'This time has already been booked.' });
      const slots: string[] = JSON.parse(appt.availableSlots);
      if (!slots.includes(input.slot)) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid slot selected.' });
      await updateAppointment(appt.id, { bookedSlot: input.slot, status: 'booked' });
      // Update lead status to Scheduled
      await updateLead(appt.leadId, { status: 'Scheduled' });
      // Notify the agent
      try {
        const lead = await getLeadById(appt.leadId);
        await notifyOwner({
          title: `Appointment booked: ${lead?.name ?? 'Lead'}`,
          content: `${lead?.name ?? 'A lead'} just booked a call for ${new Date(input.slot).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}. Their lead status has been updated to Scheduled.`,
        });
      } catch { /* non-fatal */ }
      return { success: true };
    }),

  // Cancel/delete a booking (protected)
  cancel: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      const appt = await getAppointmentByToken('');
      // Get by id via org list
      const all = await getAppointmentsByOrg(orgId);
      const target = all.find(a => a.id === input.id);
      if (!target) throw new TRPCError({ code: 'NOT_FOUND' });
      await updateAppointment(input.id, { status: 'cancelled' });
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  customAuth: customAuthRouter,
  org: orgRouter,
  leads: leadsRouter,
  templates: templatesRouter,
  sms: smsRouter,
  webhook: webhookRouter,
  flowTemplates: flowTemplatesRouter,
  templateFolders: templateFoldersRouter,
  flowRules: flowRulesRouter,
  billing: billingRouter,
  admin: adminRouter,
  drip: dripRouter,
  analytics: analyticsRouter,
  notifications: notificationsRouter,
  keywordPromotion: keywordPromotionRouter,
  referrals: referralsRouter,
  usageDashboard: usageDashboardRouter,
  bot: botRouter,
  booking: bookingRouter,
});

export type AppRouter = typeof appRouter;
