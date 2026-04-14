import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { createMessage, getLeadById, listLeads, updateLead } from "../db";
import { notifyOwner } from "./notification";

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
    try {
      const from: string = req.body?.From ?? "";
      const body: string = req.body?.Body ?? "";

      if (!from || !body) {
        res.status(200).send("<Response></Response>");
        return;
      }

      // Normalize phone number for matching (strip non-digits, compare last 10)
      const normalize = (p: string) => p.replace(/\D/g, "").slice(-10);
      const fromNorm = normalize(from);

      const allLeads = await listLeads();
      const lead = allLeads.find((l) => normalize(l.phone) === fromNorm);

      if (lead) {
        await createMessage({
          leadId: lead.id,
          direction: "inbound",
          body,
          twilioSid: req.body?.MessageSid ?? null,
          twilioStatus: "received",
        });

        if (lead.status === "Sent") {
          await updateLead(lead.id, { status: "Replied" });
        }

        await notifyOwner({
          title: `New reply from ${lead.name}`,
          content: `Lead ${lead.name} (${lead.company ?? "—"}) replied: "${body}"`,
        });
      }

      res.status(200).type("text/xml").send("<Response></Response>");
    } catch (err) {
      console.error("[Twilio Webhook] Error:", err);
      res.status(200).type("text/xml").send("<Response></Response>");
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
