import { nanoid } from "nanoid";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { webhookConfigs, webhookLogs } from "../drizzle/schema";
import type { InsertWebhookConfig } from "../drizzle/schema";

// ─── Field Mapping Types ──────────────────────────────────────────────────────

export interface FieldMappings {
  name: string;
  phone: string;
  company?: string;
  email?: string;
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

export async function getOrCreateWebhookConfig(orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.orgId, orgId))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const secret = nanoid(32);
  const defaultMappings: FieldMappings = {
    name: "name",
    phone: "phone",
    company: "company",
    email: "email",
  };

  await db.insert(webhookConfigs).values({
    orgId,
    name: "CRM Webhook",
    secret,
    fieldMappings: JSON.stringify(defaultMappings),
    autoSend: 1,
    schedulingLink: null,
  });

  const created = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.orgId, orgId))
    .limit(1);
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
  orgId?: number;
  status: "success" | "error" | "skipped";
  payload?: string;
  message?: string;
  leadId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(webhookLogs).values({
    orgId: data.orgId ?? null,
    status: data.status,
    payload: data.payload ?? null,
    message: data.message ?? null,
    leadId: data.leadId ?? null,
  });
}

export async function getWebhookLogs(orgId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webhookLogs)
    .where(eq(webhookLogs.orgId, orgId))
    .orderBy(desc(webhookLogs.receivedAt))
    .limit(limit);
}

export async function getWebhookConfigBySecret(secret: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(webhookConfigs)
    .where(eq(webhookConfigs.secret, secret))
    .limit(1);
  return rows[0];
}
