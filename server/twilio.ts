import twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }
  return twilio(accountSid, authToken);
}

export function getTwilioPhone() {
  const phone = process.env.TWILIO_PHONE_NUMBER;
  if (!phone) {
    throw new Error("TWILIO_PHONE_NUMBER is not configured.");
  }
  return phone;
}

export async function sendSms(to: string, body: string) {
  const client = getTwilioClient();
  const from = getTwilioPhone();
  const message = await client.messages.create({ to, from, body });
  return { sid: message.sid, status: message.status };
}

export function renderTemplate(
  template: string,
  vars: { name: string; company?: string | null; link?: string }
): string {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{company\}\}/g, vars.company ?? "your company")
    .replace(/\{\{link\}\}/g, vars.link ?? "https://calendly.com/your-link");
}

export async function sendSmsWithConfig(
  to: string,
  body: string,
  accountSid: string,
  authToken: string,
  fromNumber: string
) {
  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({ to, from: fromNumber, body });
  return { sid: message.sid, status: message.status };
}

export function isTwilioConfigured() {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}
