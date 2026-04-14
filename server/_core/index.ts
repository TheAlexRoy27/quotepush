import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createLead, createMessage, getDefaultTemplate, getLeadById, listLeads, updateLead } from "../db";
import { getOrCreateWebhookConfig, logWebhookEvent, mapPayloadToLead } from "../webhookEngine";
import { isTwilioConfigured, renderTemplate, sendSms } from "../twilio";
import { notifyOwner } from "./notification";
import { classifyReply } from "../replyClassifier";
import {
  createMessageClassification,
  getFlowRuleByCategory,
  getFlowTemplateById,
  reconcileFlowDefaults,
  seedDefaultTemplates,
  seedFlowRules,
} from "../flowDb";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
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

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback
  registerOAuthRoutes(app);

  // ─── Twilio Inbound SMS Webhook ───────────────────────────────────────────
  app.post("/api/webhooks/twilio/sms", async (req, res) => {
    // Respond immediately to Twilio (must be within 15s)
    res.status(200).type("text/xml").send("<Response></Response>");

    try {
      const from: string = req.body?.From ?? "";
      const body: string = req.body?.Body ?? "";

      if (!from || !body) return;

      // Normalize phone number for matching (strip non-digits, compare last 10)
      const normalize = (p: string) => p.replace(/\D/g, "").slice(-10);
      const fromNorm = normalize(from);

      const allLeads = await listLeads();
      const lead = allLeads.find((l) => normalize(l.phone) === fromNorm);

      if (!lead) {
        console.log(`[Twilio Webhook] No lead found for phone ${from}`);
        return;
      }

      // 1. Store the inbound message
      const savedMsg = await createMessage({
        leadId: lead.id,
        direction: "inbound",
        body,
        twilioSid: req.body?.MessageSid ?? null,
        twilioStatus: "received",
      });

      // 2. Update lead status to Replied
      if (lead.status === "Sent" || lead.status === "Pending") {
        await updateLead(lead.id, { status: "Replied" });
      }

      // 3. AI classification (async, non-blocking on errors)
      let category = "Other" as import("../../drizzle/schema").ReplyCategory;
      let confidence = "low" as "high" | "medium" | "low";
      try {
        const classification = await classifyReply(body, lead.name);
        category = classification.category;
        confidence = classification.confidence;
        console.log(`[Twilio Webhook] Classified reply from ${lead.name} as: ${category} (${confidence})`);

        // Store classification
        if (savedMsg) {
          await createMessageClassification({
            messageId: savedMsg.id,
            category,
            confidence,
          });
        }
      } catch (classErr) {
        console.error("[Twilio Webhook] Classification error:", classErr);
      }

      // 4. Auto-flow: look up rule for this category and auto-send if enabled
      try {
        const rule = await getFlowRuleByCategory(category);
        if (rule && rule.autoSend && rule.templateId) {
          const flowTemplate = await getFlowTemplateById(rule.templateId);
          if (flowTemplate && flowTemplate.isActive) {
            const replyBody = renderTemplate(flowTemplate.body, {
              name: lead.name,
              company: lead.company,
              link: undefined,
            });

            if (isTwilioConfigured()) {
              const result = await sendSms(lead.phone, replyBody);
              await createMessage({
                leadId: lead.id,
                direction: "outbound",
                body: replyBody,
                twilioSid: result.sid ?? null,
                twilioStatus: result.status ?? "sent",
              });
            } else {
              console.log(`[Auto-Flow] Simulation — auto-reply to ${lead.phone}: ${replyBody}`);
              await createMessage({
                leadId: lead.id,
                direction: "outbound",
                body: replyBody,
                twilioSid: null,
                twilioStatus: "simulated",
              });
            }
            console.log(`[Auto-Flow] Sent "${category}" template to ${lead.name}`);
          }
        }
      } catch (flowErr) {
        console.error("[Auto-Flow] Error sending auto-reply:", flowErr);
      }

      // 5. Notify owner
      await notifyOwner({
        title: `New reply from ${lead.name} [${category}]`,
        content: `Lead ${lead.name} (${lead.company ?? "—"}) replied: "${body}"\n\nClassified as: ${category} (${confidence} confidence)`,
      });
    } catch (err) {
      console.error("[Twilio Webhook] Error:", err);
    }
  });

  // ─── CRM Inbound Webhook ──────────────────────────────────────────────────
  app.post("/api/webhooks/crm/:secret", async (req, res) => {
    const { secret } = req.params;
    const rawPayload = JSON.stringify(req.body);

    try {
      const config = await getOrCreateWebhookConfig();

      if (config.secret !== secret) {
        await logWebhookEvent({ status: "error", payload: rawPayload, message: "Invalid secret" });
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      let mappings: { name: string; phone: string; company?: string; email?: string };
      try {
        mappings = JSON.parse(config.fieldMappings);
      } catch {
        await logWebhookEvent({ status: "error", payload: rawPayload, message: "Invalid field mappings JSON" });
        res.status(500).json({ error: "Invalid field mappings configuration" });
        return;
      }

      const leadData = mapPayloadToLead(req.body, mappings);

      if (!leadData) {
        await logWebhookEvent({
          status: "skipped",
          payload: rawPayload,
          message: "Could not extract required fields (name, phone) from payload",
        });
        res.status(200).json({ status: "skipped", reason: "Missing required fields" });
        return;
      }

      const lead = await createLead({
        name: leadData.name,
        phone: leadData.phone,
        company: leadData.company ?? null,
        email: leadData.email ?? null,
        status: "Pending",
      });

      if (!lead) {
        await logWebhookEvent({ status: "error", payload: rawPayload, message: "Failed to create lead" });
        res.status(500).json({ error: "Failed to create lead" });
        return;
      }

      let smsSent = false;
      let smsError: string | undefined;

      if (config.autoSend) {
        try {
          const template = await getDefaultTemplate();
          if (template) {
            const body = renderTemplate(template.body, {
              name: lead.name,
              company: lead.company,
              link: config.schedulingLink ?? undefined,
            });

            if (isTwilioConfigured()) {
              const result = await sendSms(lead.phone, body);
              await createMessage({
                leadId: lead.id,
                direction: "outbound",
                body,
                twilioSid: result.sid ?? null,
                twilioStatus: result.status ?? "sent",
              });
              await updateLead(lead.id, { status: "Sent" });
              smsSent = true;
            } else {
              console.log(`[CRM Webhook] Simulation — SMS to ${lead.phone}: ${body}`);
              await createMessage({
                leadId: lead.id,
                direction: "outbound",
                body,
                twilioSid: null,
                twilioStatus: "simulated",
              });
              await updateLead(lead.id, { status: "Sent" });
              smsSent = true;
            }
          }
        } catch (err) {
          smsError = err instanceof Error ? err.message : String(err);
          console.error("[CRM Webhook] SMS send error:", smsError);
        }
      }

      await logWebhookEvent({
        status: "success",
        payload: rawPayload,
        message: smsSent
          ? `Lead created and SMS sent to ${lead.phone}`
          : smsError
          ? `Lead created but SMS failed: ${smsError}`
          : "Lead created (auto-send disabled)",
        leadId: lead.id,
      });

      res.status(200).json({
        status: "success",
        leadId: lead.id,
        smsSent,
        ...(smsError ? { smsError } : {}),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[CRM Webhook] Unhandled error:", message);
      await logWebhookEvent({ status: "error", payload: rawPayload, message }).catch(() => {});
      res.status(500).json({ error: message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Seed and reconcile flow defaults on startup (idempotent)
  seedFlowRules().catch((e) => console.warn("[Startup] seedFlowRules failed:", e));
  seedDefaultTemplates().catch((e) => console.warn("[Startup] seedDefaultTemplates failed:", e));
  reconcileFlowDefaults().catch((e) => console.warn("[Startup] reconcileFlowDefaults failed:", e));

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
