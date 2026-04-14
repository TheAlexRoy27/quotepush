import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  bulkCreateLeads,
  createLead,
  createMessage,
  deleteLead,
  getDefaultTemplate,
  getLeadById,
  getLeadStats,
  getMessagesByLeadId,
  listLeads,
  updateLead,
  updateTemplate,
} from "./db";
import {
  acceptInvite,
  canAddMember,
  createInvite,
  createOrganization,
  createUserWithEmail,
  createUserWithPhone,
  findUserByEmail,
  findUserByPhone,
  getOrgMembership,
  getOrganizationById,
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
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
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
  deleteFlowTemplate,
  listFlowRules,
  listFlowTemplates,
  seedDefaultTemplates,
  seedFlowRules,
  updateFlowTemplate,
  upsertFlowRule,
} from "./flowDb";
import { REPLY_CATEGORIES } from "../drizzle/schema";
import { SignJWT } from "jose";
import { ENV } from "./_core/env";

const LeadStatusEnum = z.enum(["Pending", "Sent", "Replied", "Scheduled"]);
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
          await sendSms(input.phone, `Your QuoteNudge verification code is: ${code}. Valid for 10 minutes.`);
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
        // New user — require name + orgName
        if (!input.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Name is required for new accounts" });
        if (!input.orgName) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization name is required for new accounts" });
        user = await createUserWithPhone(input.phone, input.name);
        const newOrg = await createOrganization(input.orgName, user.id);
        await seedFlowRules(newOrg.id);
        await seedDefaultTemplates(newOrg.id);
        org = newOrg;
        isNew = true;
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
      return { org, role: "owner" as const };
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
    .query(async ({ input }) => {
      const lead = await getLeadById(input.id);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const msgs = await getMessagesByLeadId(input.id);
      return { lead, messages: msgs };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      company: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createLead({
        orgId,
        name: input.name,
        phone: input.phone,
        company: input.company ?? null,
        email: input.email || null,
        notes: input.notes ?? null,
        status: "Pending",
      });
    }),

  bulkCreate: protectedProcedure
    .input(z.array(z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      company: z.string().optional(),
      email: z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return bulkCreateLeads(orgId, input.map((l) => ({
        orgId,
        name: l.name,
        phone: l.phone,
        company: l.company ?? null,
        email: l.email || null,
        status: "Pending" as const,
      })));
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
    .input(z.object({ name: z.string().min(1), category: ReplyCategoryEnum, body: z.string().min(1), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = await requireOrgId(ctx.user.id);
      return createFlowTemplate({ orgId, name: input.name, category: input.category, body: input.body, isActive: input.isActive === false ? 0 : 1 });
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).optional(), category: ReplyCategoryEnum.optional(), body: z.string().min(1).optional(), isActive: z.boolean().optional() }))
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

// ─── App Router ─────────────────────────────────────────────────────────────

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
  flowRules: flowRulesRouter,
  billing: billingRouter,
});


export type AppRouter = typeof appRouter;
