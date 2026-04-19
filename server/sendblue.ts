/**
 * SendBlue iMessage API helper
 * Docs: https://docs.sendblue.com
 *
 * Authentication: sb-api-key-id + sb-api-secret-key headers
 * Base URL: https://api.sendblue.com
 */

const SENDBLUE_BASE = "https://api.sendblue.com";

export interface SendblueConfig {
  apiKeyId: string;
  apiSecret: string;
  fromNumber: string;
}

export interface SendblueMessageResult {
  message_handle: string;
  status: string;
  service: string; // "iMessage" | "SMS" | "RCS"
  was_downgraded: boolean | null;
  content: string;
  to_number: string;
  from_number: string;
}

export interface SendblueWebhookPayload {
  accountEmail: string;
  content: string;
  is_outbound: boolean;
  status: string;
  error_code: number | null;
  error_message: string | null;
  message_handle: string;
  date_sent: string;
  date_updated: string;
  from_number: string;
  number: string;
  to_number: string;
  was_downgraded: boolean | null;
  media_url: string;
  message_type: string;
  group_id: string;
  opted_out: boolean;
  sendblue_number: string | null;
  service: string;
}

export function isSendblueConfigured(config: Partial<SendblueConfig> | null | undefined): config is SendblueConfig {
  return !!(config?.apiKeyId && config?.apiSecret && config?.fromNumber);
}

export async function sendSendblue(
  config: SendblueConfig,
  toNumber: string,
  content: string,
  statusCallbackUrl?: string
): Promise<SendblueMessageResult> {
  const body: Record<string, string> = {
    number: toNumber,
    from_number: config.fromNumber,
    content,
  };
  if (statusCallbackUrl) {
    body.status_callback = statusCallbackUrl;
  }

  const res = await fetch(`${SENDBLUE_BASE}/api/send-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "sb-api-key-id": config.apiKeyId,
      "sb-api-secret-key": config.apiSecret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`SendBlue API error ${res.status}: ${err}`);
  }

  const data = await res.json() as SendblueMessageResult;
  return data;
}

export function parseSendblueWebhook(body: unknown): SendblueWebhookPayload | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  // Must have from_number and content to be a valid message webhook
  if (!b.from_number || typeof b.content !== "string") return null;
  return b as unknown as SendblueWebhookPayload;
}
