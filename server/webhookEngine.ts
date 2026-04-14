import { nanoid } from "nanoid";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { webhookConfigs, webhookLogs } from "../drizzle/schema";
import type { InsertWebhookConfig } from "../drizzle/schema";

// ─── Field Mapping Types ──────────────────────────────────────────────────────

export interface FieldMappings {
  name: string;       // dot-notation path into payload, e.g. "contact.full_name"
  phone: string;      // e.g. "contact.phone_number"
  company?: string;   // e.g. "contact.company_name"
  email?: string;     // e.g. "contact.email"
}

// ─── Dot-notation value extractor ────────────────────────────────────────────

export function extractValue(obj: unknown, path: string): string | undefined {
  if (!path || !obj) return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  if (current === null || current === undefined) return undefined;
  return String(current).trim() || undefined;
}

// ─── Map payload to lead fields ───────────────────────────────────────────────

export function mapPayloadToLead(
  payload: unknown,
  mappings: FieldMappings
): { name: string; phone: string; company?: string; email?: string } | null {
  const name = extractValue(payload, mappings.name);
  const phone = extractValue(payload, mappings.phone);

  if (!name || !phone) return null;

  return {
    name,
    phone,
    company: mappings.company ? extractValue(payload, mappings.company) : undefined,
    email: mappings.email ? extractValue(payload, mappings.email) : undefined,
  };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function getOrCreateWebhookConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(webhookConfigs).limit(1);
  if (existing.length > 0) return existing[0];

  const secret = nanoid(32);
  const defaultMappings: FieldMappings = {
    name: "name",
    phone: "phone",
    company: "company",
    email: "email",
  };

  await db.insert(webhookConfigs).values({
    name: "CRM Webhook",
    secret,
    fieldMappings: JSON.stringify(defaultMappings),
    autoSend: 1,
    schedulingLink: null,
  });

  const created = await db.select().from(webhookConfigs).limit(1);
  return created[0]!;
}

export async function updateWebhookConfig(
  id: number,
  data: Partial<Omit<InsertWebhookConfig, "id" | "createdAt">>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(webhookConfigs).set(data).where(eq(webhookConfigs.id, id));
  const result = await db.select().from(webhookConfigs).where(eq(webhookConfigs.id, id)).limit(1);
  return result[0];
}

export async function regenerateSecret(id: number) {
  const secret = nanoid(32);
  return updateWebhookConfig(id, { secret });
}

export async function logWebhookEvent(data: {
  status: "success" | "error" | "skipped";
  payload?: string;
  message?: string;
  leadId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookLogs).values({
    status: data.status,
    payload: data.payload ?? null,
    message: data.message ?? null,
    leadId: data.leadId ?? null,
  });
}

export async function getWebhookLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookLogs).orderBy(desc(webhookLogs.receivedAt)).limit(limit);
}
