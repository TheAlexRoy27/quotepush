import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Webhook,
  Copy,
  RefreshCw,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Zap,
  FlaskConical,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWebhookUrl(secret: string) {
  return `${window.location.origin}/api/webhooks/crm/${secret}`;
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied!`));
}

function StatusIcon({ status }: { status: "success" | "error" | "skipped" }) {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-red-400" />;
  return <MinusCircle className="w-4 h-4 text-yellow-400" />;
}

function StatusBadge({ status }: { status: "success" | "error" | "skipped" }) {
  const map = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    skipped: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      <StatusIcon status={status} />
      {status}
    </span>
  );
}

// ─── Field Mapping Row ────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  required?: boolean;
  description: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function FieldRow({ label, required, description, value, onChange, placeholder }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4 py-3 border-b border-white/5 last:border-0">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-white">{label}</span>
          {required && <span className="text-xs text-red-400">*</span>}
        </div>
        <p className="text-xs text-white/40 mt-0.5">{description}</p>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `e.g. ${label.toLowerCase()}`}
        className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/50 h-8 text-sm"
      />
    </div>
  );
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: { id: number; status: "success" | "error" | "skipped"; message: string | null; payload: string | null; leadId: number | null; receivedAt: Date } }) {
  const [expanded, setExpanded] = useState(false);
  let parsedPayload: object | null = null;
  try {
    if (log.payload) parsedPayload = JSON.parse(log.payload) as object;
  } catch {}

  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/3 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <StatusIcon status={log.status} />
        <span className="flex-1 text-sm text-white/80 truncate">{log.message ?? ""}</span>
        {log.leadId && (
          <span className="text-xs text-white/30 mr-2">Lead #{log.leadId}</span>
        )}
        <span className="text-xs text-white/30 mr-2">
          {new Date(log.receivedAt).toLocaleString()}
        </span>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/30 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
        )}
      </button>
      {expanded && parsedPayload && (
        <div className="px-4 pb-3 border-t border-white/5">
          <pre className="text-xs text-white/50 bg-black/30 rounded p-3 overflow-auto max-h-48 mt-2">
            {JSON.stringify(parsedPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WebhookPage() {
  const { data: config, refetch: refetchConfig } = trpc.webhook.getConfig.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.webhook.getLogs.useQuery({ limit: 20 });

  const saveConfig = trpc.webhook.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Webhook configuration saved");
      refetchConfig();
    },
    onError: (e) => toast.error(e.message),
  });

  const regenerateSecret = trpc.webhook.regenerateSecret.useMutation({
    onSuccess: () => {
      toast.success("New secret generated update your CRM webhook URL");
      refetchConfig();
    },
    onError: (e) => toast.error(e.message),
  });

  // Local form state
  const [mappings, setMappings] = useState({ name: "name", phone: "phone", company: "company", email: "email" });
  const [autoSend, setAutoSend] = useState(true);
  const [schedulingLink, setSchedulingLink] = useState("");
  const [testPayload, setTestPayload] = useState(
    JSON.stringify({ name: "Jane Smith", phone: "+15551234567", company: "Acme Corp", email: "jane@acme.com" }, null, 2)
  );
  const [testResult, setTestResult] = useState<{ status: string; leadId?: number; smsSent?: boolean; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Sync form state from config
  useEffect(() => {
    if (!config) return;
    try {
      const m = JSON.parse(config.fieldMappings);
      setMappings({ name: m.name ?? "name", phone: m.phone ?? "phone", company: m.company ?? "company", email: m.email ?? "email" });
    } catch {}
    setAutoSend(config.autoSend === 1);
    setSchedulingLink(config.schedulingLink ?? "");
  }, [config]);

  function handleSave() {
    if (!config) return;
    saveConfig.mutate({
      id: config.id,
      fieldMappings: JSON.stringify(mappings),
      autoSend,
      schedulingLink: schedulingLink || undefined,
    });
  }

  async function handleTestPayload() {
    if (!config) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(testPayload);
      } catch {
        toast.error("Test payload is not valid JSON");
        setIsTesting(false);
        return;
      }

      const res = await fetch(`/api/webhooks/crm/${config.secret}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const data = await res.json();
      setTestResult(data);
      refetchLogs();
      if (data.status === "success") toast.success("Test webhook processed successfully!");
      else toast.warning(`Webhook returned: ${data.status ?? data.error}`);
    } catch (err) {
      toast.error("Test request failed");
    } finally {
      setIsTesting(false);
    }
  }

  const webhookUrl = config ? getWebhookUrl(config.secret) : "";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Webhook className="w-6 h-6 text-indigo-400" />
            CRM Webhook
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Connect any CRM or lead source by pointing its webhook to this endpoint.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saveConfig.isPending || !config}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {saveConfig.isPending ? "Saving…" : "Save Configuration"}
        </Button>
      </div>

      {/* Webhook URL */}
      <Card className="bg-[#0f1117] border-white/8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Webhook Endpoint</CardTitle>
          <CardDescription className="text-white/40">
            Configure your CRM to send a POST request to this URL when a new lead is created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 font-mono text-sm text-indigo-300 truncate">
              {webhookUrl || "Loading…"}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 shrink-0"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => config && regenerateSecret.mutate({ id: config.id })}
              disabled={regenerateSecret.isPending || !config}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${regenerateSecret.isPending ? "animate-spin" : ""}`} />
              Rotate Secret
            </Button>
          </div>
          <p className="text-xs text-white/30">
            The secret key is embedded in the URL. Rotate it if you suspect it has been compromised.
            Method: <code className="text-indigo-400">POST</code> · Content-Type: <code className="text-indigo-400">application/json</code>
          </p>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card className="bg-[#0f1117] border-white/8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white">Field Mapping</CardTitle>
          <CardDescription className="text-white/40">
            Map your CRM's JSON field names to lead fields using dot-notation for nested objects (e.g. <code className="text-indigo-400">contact.full_name</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldRow
            label="Name"
            required
            description="Lead's full name"
            value={mappings.name}
            onChange={(v) => setMappings((m) => ({ ...m, name: v }))}
            placeholder="e.g. full_name or contact.name"
          />
          <FieldRow
            label="Phone"
            required
            description="Mobile number (E.164 recommended)"
            value={mappings.phone}
            onChange={(v) => setMappings((m) => ({ ...m, phone: v }))}
            placeholder="e.g. phone or contact.phone_number"
          />
          <FieldRow
            label="Company"
            description="Company or organization"
            value={mappings.company ?? ""}
            onChange={(v) => setMappings((m) => ({ ...m, company: v }))}
            placeholder="e.g. company or lead.company_name"
          />
          <FieldRow
            label="Email"
            description="Email address"
            value={mappings.email ?? ""}
            onChange={(v) => setMappings((m) => ({ ...m, email: v }))}
            placeholder="e.g. email or contact.email_address"
          />
        </CardContent>
      </Card>

      {/* Auto-send & Scheduling Link */}
      <Card className="bg-[#0f1117] border-white/8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Automation
          </CardTitle>
          <CardDescription className="text-white/40">
            Control what happens automatically when a new lead arrives.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-white">Auto-send SMS on new lead</p>
              <p className="text-xs text-white/40 mt-0.5">
                Immediately send the outreach text when a lead arrives via webhook.
              </p>
            </div>
            <Switch
              checked={autoSend}
              onCheckedChange={setAutoSend}
              className="data-[state=checked]:bg-indigo-600"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-white/70">Scheduling Link (overrides template default)</Label>
            <Input
              value={schedulingLink}
              onChange={(e) => setSchedulingLink(e.target.value)}
              placeholder="https://calendly.com/your-link"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-indigo-500/50"
            />
            <p className="text-xs text-white/30">
              This replaces the <code className="text-indigo-400">{"{{link}}"}</code> placeholder in your SMS template for webhook-triggered messages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Test Payload */}
      <Card className="bg-[#0f1117] border-white/8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            Test Webhook
          </CardTitle>
          <CardDescription className="text-white/40">
            Send a sample payload to verify your field mappings are working correctly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            rows={6}
            className="font-mono text-xs bg-black/40 border-white/10 text-white/80 placeholder:text-white/25 focus:border-indigo-500/50 resize-none"
            placeholder='{"name": "Jane Smith", "phone": "+15551234567"}'
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleTestPayload}
              disabled={isTesting || !config}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              {isTesting ? (
                <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testing…</>
              ) : (
                <><FlaskConical className="w-3.5 h-3.5 mr-1.5" />Send Test</>
              )}
            </Button>
            {testResult && (
              <div className="flex items-center gap-2">
                <StatusBadge status={testResult.status === "success" ? "success" : testResult.status === "skipped" ? "skipped" : "error"} />
                {testResult.leadId && <span className="text-xs text-white/40">Lead #{testResult.leadId} created</span>}
                {testResult.smsSent && <span className="text-xs text-emerald-400">SMS sent ✓</span>}
                {testResult.error && <span className="text-xs text-red-400">{testResult.error}</span>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="bg-[#0f1117] border-white/8">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-white/40" />
              Recent Activity
            </CardTitle>
            <CardDescription className="text-white/40">Last 20 webhook events</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchLogs()}
            className="text-white/40 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              No webhook events yet. Send a test payload to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <LogRow key={log.id} log={log as any} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
