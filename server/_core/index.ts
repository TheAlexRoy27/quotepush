import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createLead, createMessage, getBotConfig, countBotReplies, getDefaultTemplate, getLeadById, listLeads, updateLead } from "../db";
import { getWebhookConfigBySecret, logWebhookEvent, mapPayloadToLead } from "../webhookEngine";
import { isTwilioConfigured, renderTemplate, sendSms, sendSmsWithConfig } from "../twilio";
import { notifyOwner } from "./notification";
import { classifyReply } from "../replyClassifier";
import {
  createMessageClassification,
  getFlowRuleByCategory,
  getFlowTemplateById,
} from "../flowDb";
import { getOrgTwilioConfig } from "../orgDb";
import { handleStripeWebhook } from "../billing";
import { startDripScheduler } from "../dripScheduler";
import {
  enrollLeadInSequence,
  stopEnrollment,
  getActiveDripSequenceByCategory,
  listDripSteps,
} from "../dripDb";
import { DRIP_TRIGGER_CATEGORIES } from "../../drizzle/schema";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook must use raw body BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    try {
      await handleStripeWebhook(req.body as Buffer, sig);
      res.json({ received: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Stripe Webhook] Error:", message);
      res.status(400).json({ error: message });
    }
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // ─── Twilio Inbound SMS Webhook ───────────────────────────────────────────
  app.post("/api/webhooks/twilio/sms", async (req, res) => {
    res.status(200).type("text/xml").send("<Response></Response>");

    try {
      const from: string = req.body?.From ?? "";
      const body: string = req.body?.Body ?? "";
      if (!from || !body) return;

      const normalize = (p: string) => p.replace(/\D/g, "").slice(-10);
      const fromNorm = normalize(from);

      // Search across all orgs (global Twilio number)
      // We'll find the lead by phone across all orgs
      const db = await import("../db").then(m => m.getDb());
      if (!db) return;

      const { leads } = await import("../../drizzle/schema");
      const { like } = await import("drizzle-orm");
      const allLeads = await db.select().from(leads);
      const lead = allLeads.find((l) => normalize(l.phone) === fromNorm);

      if (!lead) {
        console.log(`[Twilio Webhook] No lead found for phone ${from}`);
        return;
      }

      const savedMsg = await createMessage({
        orgId: lead.orgId,
        leadId: lead.id,
        direction: "inbound",
        body,
        twilioSid: req.body?.MessageSid ?? null,
        twilioStatus: "received",
      });

      if (lead.status === "Sent" || lead.status === "Pending") {
        await updateLead(lead.id, { status: "Replied" });
      }

      // ─── Keyword Promotion ────────────────────────────────────────────
      try {
        const { getActiveKeywordRules } = await import("../db");
        const rules = await getActiveKeywordRules(lead.orgId);
        const bodyLower = body.toLowerCase();
        for (const rule of rules) {
          if (bodyLower.includes(rule.keyword.toLowerCase())) {
            await updateLead(lead.id, { status: rule.targetStatus });
            await notifyOwner({
              title: `Lead promoted: ${lead.name} is now "${rule.targetStatus}"`,
              content: `Keyword "${rule.keyword}" detected in reply from ${lead.name} (${lead.phone}).\n\nMessage: "${body}"\n\nMilestone automatically advanced to: ${rule.targetStatus}`,
            });
            console.log(`[KeywordPromotion] Lead ${lead.id} promoted to ${rule.targetStatus} via keyword "${rule.keyword}"`);
            break; // apply only the first matching rule
          }
        }
      } catch (kpErr) {
        console.error("[KeywordPromotion] Error:", kpErr);
      }

      let category = "Wants More Info" as import("../../drizzle/schema").ReplyCategory;
      let confidence = "low" as "high" | "medium" | "low";
      try {
        const classification = await classifyReply(body, lead.name);
        category = classification.category;
        confidence = classification.confidence;
        if (savedMsg) {
          await createMessageClassification({ messageId: savedMsg.id, category, confidence });
        }
      } catch (classErr) {
        console.error("[Twilio Webhook] Classification error:", classErr);
      }

      try {
        const rule = await getFlowRuleByCategory(lead.orgId, category);
        if (rule && rule.autoSend && rule.templateId) {
          const flowTemplate = await getFlowTemplateById(rule.templateId);
          if (flowTemplate && flowTemplate.isActive) {
            const replyBody = renderTemplate(flowTemplate.body, { name: lead.name, company: lead.company, link: undefined });
            const orgConfig = await getOrgTwilioConfig(lead.orgId);

            if (orgConfig?.accountSid) {
              const result = await sendSmsWithConfig(lead.phone, replyBody, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
              await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: replyBody, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent" });
            } else if (isTwilioConfigured()) {
              const result = await sendSms(lead.phone, replyBody);
              await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: replyBody, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent" });
            } else {
              await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: replyBody, twilioSid: null, twilioStatus: "simulated" });
            }
          }
        }
      } catch (flowErr) {
        console.error("[Auto-Flow] Error:", flowErr);
      }

      // ─── Drip: stop any running drip, then auto-enroll for trigger categories ───
      try {
        // Use specific reason for Unsubscribe, generic "replied" for all others
        const stopReason = category === "Unsubscribe" ? "unsubscribed" : "replied";
        await stopEnrollment(lead.id, stopReason);
        const isDripTrigger = (DRIP_TRIGGER_CATEGORIES as readonly string[]).includes(category);
        if (isDripTrigger) {
          const seq = await getActiveDripSequenceByCategory(
            lead.orgId,
            category as import("../../drizzle/schema").DripTriggerCategory
          );
          if (seq) {
            const steps = await listDripSteps(seq.id);
            const firstStep = steps[0];
            const firstAmount = firstStep?.delayAmount ?? firstStep?.delayDays ?? 3;
            const firstUnit = firstStep?.delayUnit ?? "days";
            await enrollLeadInSequence(lead.id, lead.orgId, seq.id, firstAmount, firstUnit);
            console.log(`[Drip] Enrolled lead ${lead.id} in sequence "${seq.name}" (step 1 in ${firstAmount} ${firstUnit})`);
          }
        }
      } catch (dripErr) {
        console.error("[Drip] Enrollment error:", dripErr);
      }

      await notifyOwner({
        title: `New reply from ${lead.name} [${category}]`,
        content: `Lead ${lead.name} (${lead.company ?? "-"}) replied: "${body}"\n\nClassified as: ${category} (${confidence} confidence)`,
      });

      // ─── AI Bot Auto-Reply ────────────────────────────────────────────
      try {
        // Don't bot-reply to unsubscribes
        if (category !== "Unsubscribe") {
          const botConfig = await getBotConfig(lead.orgId);
          if (botConfig?.enabled) {
            const botReplies = await countBotReplies(lead.id);
            if (botReplies < botConfig.maxRepliesPerLead) {
              const firstName = lead.name.split(" ")[0] ?? lead.name;
              const botName = botConfig.botName ?? "Alex";
              const toneGuide: Record<string, string> = {
                friendly: "Be warm, approachable, and conversational. Use casual language and the occasional emoji.",
                professional: "Be polished and business-like. Avoid slang.",
                casual: "Be relaxed and informal, like texting a friend.",
                empathetic: "Be understanding and patient. Acknowledge their situation before responding.",
                direct: "Be concise and to the point. No fluff.",
                karen: "You are Karen. You are aggressively helpful, slightly pushy, and very persistent. You act like you are doing the lead a huge favor by texting them. You are not rude, but you are relentless and a little over-the-top enthusiastic. You use phrases like 'I just HAVE to tell you', 'honestly you would be crazy not to', 'I am not going to let you miss this'. You are the person who will not take no for an answer but somehow still feels friendly.",
              };
              const systemPrompt = [
                botConfig.identity?.replace(/\{botName\}/g, botName) ??
                  `You are ${botName}, a friendly insurance advisor helping leads get a quote.`,
                `Tone: ${toneGuide[botConfig.tone ?? "friendly"]}`,
                botConfig.businessContext ? `Business context:\n${botConfig.businessContext}` : "",
                botConfig.customInstructions ? `Rules:\n${botConfig.customInstructions}` : "",
                `You are texting ${firstName}. Keep replies SHORT (1-3 sentences max). Never use markdown. Never use em dashes. Always be respectful of their time.`,
                `IMPORTANT - Write like a real human texting from their phone, not a polished AI. Use casual language, occasional filler words like "yeah", "honestly", "so", "I mean". Vary your sentence length. Sometimes start mid-thought. Avoid bullet points, numbered lists, formal greetings, and sign-offs. Never sound like a robot or a customer service script. Typos are okay occasionally. Keep it real.`,
                `You have sent ${botReplies} bot replies so far. After ${botConfig.maxRepliesPerLead} total, a human agent will take over.`,
              ].filter(Boolean).join("\n\n");

              // Apply reply delay to feel more human
              const replyDelay = (botConfig as any).replyDelay ?? "instant";
              if (replyDelay === "1min") {
                await new Promise((r) => setTimeout(r, 60_000));
              } else if (replyDelay === "random") {
                const ms = (60 + Math.floor(Math.random() * 120)) * 1000; // 60-180 seconds
                console.log(`[AIBot] Random delay: ${Math.round(ms / 1000)}s`);
                await new Promise((r) => setTimeout(r, ms));
              }

              const { invokeLLM } = await import("./llm");
              const response = await invokeLLM({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: body },
                ],
              });
              const rawContent = response?.choices?.[0]?.message?.content;
              const botReply = typeof rawContent === "string" ? rawContent.trim() : undefined;
              if (botReply) {
                const orgConfig = await getOrgTwilioConfig(lead.orgId);
                if (orgConfig?.accountSid) {
                  const result = await sendSmsWithConfig(lead.phone, botReply, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
                  await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: botReply, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent", isBot: true });
                } else if (isTwilioConfigured()) {
                  const result = await sendSms(lead.phone, botReply);
                  await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: botReply, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent", isBot: true });
                } else {
                  await createMessage({ orgId: lead.orgId, leadId: lead.id, direction: "outbound", body: botReply, twilioSid: null, twilioStatus: "simulated", isBot: true });
                }
                console.log(`[AIBot] Replied to lead ${lead.id} (${botReplies + 1}/${botConfig.maxRepliesPerLead})`);
              }
            } else {
              console.log(`[AIBot] Lead ${lead.id} hit max bot replies (${botConfig.maxRepliesPerLead}), handing off to human.`);
            }
          }
        }
      } catch (botErr) {
        console.error("[AIBot] Error:", botErr);
      }
    } catch (err) {
      console.error("[Twilio Webhook] Error:", err);
    }
  });

  // ─── CRM Inbound Webhook ──────────────────────────────────────────────────
  app.post("/api/webhooks/crm/:secret", async (req, res) => {
    const { secret } = req.params;
    const rawPayload = JSON.stringify(req.body);

    try {
      const config = await getWebhookConfigBySecret(secret);

      if (!config) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const orgId = config.orgId;

      let mappings: { name: string; phone: string; company?: string; email?: string };
      try {
        mappings = JSON.parse(config.fieldMappings);
      } catch {
        await logWebhookEvent({ orgId, status: "error", payload: rawPayload, message: "Invalid field mappings JSON" });
        res.status(500).json({ error: "Invalid field mappings configuration" });
        return;
      }

      const leadData = mapPayloadToLead(req.body, mappings);

      if (!leadData) {
        await logWebhookEvent({ orgId, status: "skipped", payload: rawPayload, message: "Could not extract required fields (name, phone) from payload" });
        res.status(200).json({ status: "skipped", reason: "Missing required fields" });
        return;
      }

      const lead = await createLead({ orgId, name: leadData.name, phone: leadData.phone, company: leadData.company ?? null, email: leadData.email ?? null, status: "Pending" });

      if (!lead) {
        await logWebhookEvent({ orgId, status: "error", payload: rawPayload, message: "Failed to create lead" });
        res.status(500).json({ error: "Failed to create lead" });
        return;
      }

      let smsSent = false;
      let smsError: string | undefined;

      if (config.autoSend) {
        try {
          const template = await getDefaultTemplate(orgId);
          if (template) {
            const body = renderTemplate(template.body, { name: lead.name, company: lead.company, link: config.schedulingLink ?? undefined });
            const orgConfig = await getOrgTwilioConfig(orgId);

            if (orgConfig?.accountSid) {
              const result = await sendSmsWithConfig(lead.phone, body, orgConfig.accountSid, orgConfig.authToken, orgConfig.phoneNumber);
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent" });
            } else if (isTwilioConfigured()) {
              const result = await sendSms(lead.phone, body);
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: result.sid ?? null, twilioStatus: result.status ?? "sent" });
            } else {
              await createMessage({ orgId, leadId: lead.id, direction: "outbound", body, twilioSid: null, twilioStatus: "simulated" });
            }
            await updateLead(lead.id, { status: "Sent" });
            smsSent = true;
          }
        } catch (err) {
          smsError = err instanceof Error ? err.message : String(err);
        }
      }

      await logWebhookEvent({ orgId, status: "success", payload: rawPayload, message: smsSent ? `Lead created and SMS sent` : "Lead created", leadId: lead.id });
      res.status(200).json({ status: "success", leadId: lead.id, smsSent });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logWebhookEvent({ status: "error", payload: rawPayload, message }).catch(() => {});
      res.status(500).json({ error: message });
    }
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start the drip scheduler after the server is ready
  startDripScheduler();

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
