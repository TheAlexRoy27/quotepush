import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, Info, ExternalLink, Phone, Key, Link2 } from "lucide-react";

export default function SettingsPage() {
  const { data: isConfigured } = trpc.sms.isConfigured.useQuery();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your Twilio integration and webhook settings.</p>
      </div>

      {/* Twilio Status */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Twilio Integration</h2>
          {isConfigured ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <XCircle className="h-3.5 w-3.5" /> Not Configured
            </span>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {isConfigured
            ? "Twilio is configured and ready to send SMS messages."
            : "To enable real SMS sending, add your Twilio credentials as environment secrets."}
        </p>

        <div className="space-y-3">
          {[
            { icon: Key, label: "TWILIO_ACCOUNT_SID", description: "Your Twilio Account SID from the Twilio Console" },
            { icon: Key, label: "TWILIO_AUTH_TOKEN", description: "Your Twilio Auth Token (keep this secret)" },
            { icon: Phone, label: "TWILIO_PHONE_NUMBER", description: "Your Twilio phone number in E.164 format, e.g. +15551234567" },
          ].map(({ icon: Icon, label, description }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <code className="text-xs font-mono text-primary">{label}</code>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Add these secrets via the <strong className="text-foreground">Settings → Secrets</strong> panel in the Manus project management UI. They will be automatically injected into the app environment.
          </p>
        </div>
      </div>

      {/* Webhook Setup */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Inbound SMS Webhook</h2>
        <p className="text-sm text-muted-foreground">
          To receive replies from leads, configure your Twilio phone number to forward inbound messages to this webhook endpoint.
        </p>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Link2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground mb-1">Webhook URL (POST)</p>
            <code className="text-xs font-mono text-primary break-all">
              https://your-domain.manus.space/api/webhooks/twilio/sms
            </code>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground text-xs">Setup steps:</p>
          <ol className="space-y-1.5 text-xs list-decimal list-inside">
            <li>Go to your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Twilio Console <ExternalLink className="h-3 w-3" /></a></li>
            <li>Navigate to Phone Numbers → Manage → Active Numbers</li>
            <li>Click your phone number and scroll to "Messaging Configuration"</li>
            <li>Set the "A message comes in" webhook to the URL above (HTTP POST)</li>
            <li>Save the configuration</li>
          </ol>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            When a lead replies, the app will automatically update their status to <strong className="text-foreground">Replied</strong>, log the message in their conversation thread, and send you an owner notification.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">About</h2>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>SMS Provider</span>
            <span className="text-foreground">Twilio</span>
          </div>
          <div className="flex justify-between">
            <span>Status Tracking</span>
            <span className="text-foreground">Pending → Sent → Replied / Scheduled</span>
          </div>
          <div className="flex justify-between">
            <span>Template Variables</span>
            <span className="text-foreground font-mono">{"{{name}}, {{company}}, {{link}}"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
