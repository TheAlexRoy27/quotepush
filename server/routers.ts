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
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { isTwilioConfigured, renderTemplate, sendSms } from "./twilio";
import {
  getOrCreateWebhookConfig,
  getWebhookLogs,
  regenerateSecret,
  updateWebhookConfig,
} from "./webhookEngine";
import {
  createFlowTemplate,
  deleteFlowTemplate,
  getClassificationByMessageId,
  listFlowRules,
  listFlowTemplates,
  seedDefaultTemplates,
  seedFlowRules,
  updateFlowTemplate,
  upsertFlowRule,
} from "./flowDb";
import { REPLY_CATEGORIES } from "../drizzle/schema";

const LeadStatusEnum = z.enum(["Pending", "Sent", "Replied", "Scheduled"]);

// ─── Leads Router ─────────────────────────────────────────────────────────────

const leadsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: LeadStatusEnum.optional(),
      }).optional()
    )
    .query(({ input }) => listLeads(input)),

  stats: protectedProcedure.query(() => getLeadStats()),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.id);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      const msgs = await getMessagesByLeadId(input.id);
      return { lead, messages: msgs };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        company: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) =>
      createLead({
        name: input.name,
        phone: input.phone,
        company: input.company ?? null,
        email: input.email || null,
        notes: input.notes ?? null,
        status: "Pending",
      })
    ),

  bulkCreate: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string().min(1),
          phone: z.string().min(1),
          company: z.string().optional(),
          email: z.string().optional(),
        })
      )
    )
    .mutation(({ input }) =>
      bulkCreateLeads(
        input.map((l) => ({
          name: l.name,
          phone: l.phone,
          company: l.company ?? null,
          email: l.email || null,
          status: "Pending" as const,
        }))
      )
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        company: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        status: LeadStatusEnum.optional(),
        notes: z.string().optional(),
      })
    )
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
  get: protectedProcedure.query(() => getDefaultTemplate()),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        body: z.string().min(1),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateTemplate(id, data);
    }),
});

// ─── SMS Router ───────────────────────────────────────────────────────────────

const smsRouter = router({
  isConfigured: protectedProcedure.query(() => isTwilioConfigured()),

  send: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        schedulingLink: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      const template = await getDefaultTemplate();
      if (!template) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No SMS template found" });

      const body = renderTemplate(template.body, {
        name: lead.name,
        company: lead.company,
        link: input.schedulingLink,
      });

      let twilioSid: string | undefined;
      let twilioStatus: string | undefined;

      if (isTwilioConfigured()) {
        const result = await sendSms(lead.phone, body);
        twilioSid = result.sid;
        twilioStatus = result.status;
      }

      await createMessage({
        leadId: lead.id,
        direction: "outbound",
        body,
        twilioSid: twilioSid ?? null,
        twilioStatus: twilioStatus ?? (isTwilioConfigured() ? null : "simulated"),
      });

      await updateLead(lead.id, { status: "Sent" });

      return { success: true, simulated: !isTwilioConfigured() };
    }),

  sendBulk: protectedProcedure
    .input(
      z.object({
        schedulingLink: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      const pendingLeads = await listLeads({ status: "Pending" });
      const template = await getDefaultTemplate();
      if (!template) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No SMS template found" });

      const results = [];
      for (const lead of pendingLeads) {
        const body = renderTemplate(template.body, {
          name: lead.name,
          company: lead.company,
          link: input?.schedulingLink,
        });

        let twilioSid: string | undefined;
        let twilioStatus: string | undefined;

        if (isTwilioConfigured()) {
          try {
            const result = await sendSms(lead.phone, body);
            twilioSid = result.sid;
            twilioStatus = result.status;
          } catch (e) {
            results.push({ leadId: lead.id, success: false, error: String(e) });
            continue;
          }
        }

        await createMessage({
          leadId: lead.id,
          direction: "outbound",
          body,
          twilioSid: twilioSid ?? null,
          twilioStatus: twilioStatus ?? "simulated",
        });

        await updateLead(lead.id, { status: "Sent" });
        results.push({ leadId: lead.id, success: true });
      }

      return { sent: results.filter((r) => r.success).length, total: pendingLeads.length, results };
    }),

  previewMessage: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
        schedulingLink: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
      const template = await getDefaultTemplate();
      if (!template) return { body: "" };
      const body = renderTemplate(template.body, {
        name: lead.name,
        company: lead.company,
        link: input.schedulingLink,
      });
      return { body };
    }),
});

// ─── Webhook Router ──────────────────────────────────────────────────────────

const webhookRouter = router({
  getConfig: protectedProcedure.query(() => getOrCreateWebhookConfig()),

  saveConfig: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        fieldMappings: z.string().min(1),
        autoSend: z.boolean(),
        schedulingLink: z.string().optional(),
      })
    )
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
    .query(({ input }) => getWebhookLogs(input?.limit ?? 20)),
});

// ─── Flow Templates Router ──────────────────────────────────────────────────

const ReplyCategoryEnum = z.enum(REPLY_CATEGORIES);

const flowTemplatesRouter = router({
  list: protectedProcedure
    .input(z.object({ category: ReplyCategoryEnum.optional() }).optional())
    .query(({ input }) => listFlowTemplates(input?.category)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: ReplyCategoryEnum,
        body: z.string().min(1),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) =>
      createFlowTemplate({
        name: input.name,
        category: input.category,
        body: input.body,
        isActive: input.isActive === false ? 0 : 1,
      })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        category: ReplyCategoryEnum.optional(),
        body: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, isActive, ...rest } = input;
      return updateFlowTemplate(id, {
        ...rest,
        ...(isActive !== undefined ? { isActive: isActive ? 1 : 0 } : {}),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteFlowTemplate(input.id)),

  seed: protectedProcedure.mutation(async () => {
    await seedFlowRules();
    await seedDefaultTemplates();
    return { success: true };
  }),
});

// ─── Flow Rules Router ────────────────────────────────────────────────────────

const flowRulesRouter = router({
  list: protectedProcedure.query(() => listFlowRules()),

  upsert: protectedProcedure
    .input(
      z.object({
        category: ReplyCategoryEnum,
        templateId: z.number().nullable().optional(),
        autoSend: z.boolean(),
      })
    )
    .mutation(({ input }) =>
      upsertFlowRule({
        category: input.category,
        templateId: input.templateId ?? null,
        autoSend: input.autoSend,
      })
    ),

  categories: protectedProcedure.query(() => REPLY_CATEGORIES),
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
  leads: leadsRouter,
  templates: templatesRouter,
  sms: smsRouter,
  webhook: webhookRouter,
  flowTemplates: flowTemplatesRouter,
  flowRules: flowRulesRouter,
});

export type AppRouter = typeof appRouter;
