import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Info, ExternalLink, Phone, Key, Link2, Eye, EyeOff, Save, Zap, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: isConfigured, refetch: refetchConfigured } = trpc.sms.isConfigured.useQuery();
  const { data: twilioConfig, isLoading: configLoading } = trpc.org.getTwilioConfig.useQuery();

  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Pre-fill form when config loads
  useEffect(() => {
    if (twilioConfig) {
      setAccountSid(twilioConfig.accountSid ?? "");
      setPhoneNumber(twilioConfig.phoneNumber ?? "");
      // Auth token is never returned from backend leave blank unless user re-enters
    }
    if (user?.phone) {
      setTestPhone(user.phone);
    }
  }, [twilioConfig, user]);

  const saveConfig = trpc.org.saveTwilioConfig.useMutation({
    onSuccess: () => {
      toast.success("Twilio credentials saved!", { description: "Your SMS integration is now active." });
      refetchConfigured();
      setIsSaving(false);
    },
    onError: (e) => {
      toast.error("Failed to save credentials", { description: e.message });
      setIsSaving(false);
    },
  });

  const testConfig = trpc.org.testTwilioConfig.useMutation({
    onSuccess: () => {
      toast.success("Test SMS sent!", { description: `Check ${testPhone} for the test message.` });
      setIsTesting(false);
    },
    onError: (e) => {
      toast.error("Test SMS failed", { description: e.message });
      setIsTesting(false);
    },
  });

  const handleSave = () => {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      toast.error("All three fields are required.");
      return;
    }
    setIsSaving(true);
    saveConfig.mutate({ accountSid: accountSid.trim(), authToken: authToken.trim(), phoneNumber: phoneNumber.trim() });
  };

  const handleTest = () => {
    if (!testPhone.trim()) {
      toast.error("Enter a phone number to send the test to.");
      return;
    }
    setIsTesting(true);
    testConfig.mutate({ toPhone: testPhone.trim() });
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/twilio/sms`;

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("Webhook URL copied!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your Twilio integration and SMS settings.</p>
      </div>

      {/* Twilio Credentials Form */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Twilio Credentials</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Enter your credentials from the <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Twilio Console <ExternalLink className="h-3 w-3" /></a></p>
          </div>
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

        {configLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/40 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Account SID */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> Account SID
              </Label>
              <Input
                value={accountSid}
                onChange={e => setAccountSid(e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">Found on your Twilio Console dashboard</p>
            </div>

            {/* Auth Token */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> Auth Token
              </Label>
              <div className="relative">
                <Input
                  type={showToken ? "text" : "password"}
                  value={authToken}
                  onChange={e => setAuthToken(e.target.value)}
                  placeholder={twilioConfig ? "••••••••••••••••••••••••••••••••" : "Enter your Auth Token"}
                  className="font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {twilioConfig ? "Leave blank to keep your existing token." : "Keep this secret never share it publicly."}
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Twilio Phone Number
              </Label>
              <Input
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="+15551234567"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">E.164 format must be a number you own in Twilio</p>
            </div>

            <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
              <Save className="h-4 w-4" />
              {isSaving ? "Saving…" : "Save Credentials"}
            </Button>
          </div>
        )}
      </div>

      {/* Test SMS */}
      {isConfigured && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Send a Test SMS</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Verify your Twilio setup is working by sending a test message.</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="+15551234567"
              className="font-mono text-sm"
            />
            <Button onClick={handleTest} disabled={isTesting} variant="outline" className="gap-2 shrink-0">
              <Zap className="h-4 w-4" />
              {isTesting ? "Sending…" : "Send Test"}
            </Button>
          </div>
        </div>
      )}

      {/* Webhook URL */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Inbound SMS Webhook</h2>
        <p className="text-sm text-muted-foreground">
          Configure your Twilio phone number to forward inbound messages to this endpoint so lead replies are captured automatically.
        </p>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/50">
          <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <code className="text-xs font-mono text-primary break-all flex-1">{webhookUrl}</code>
          <button onClick={copyWebhook} className="text-muted-foreground hover:text-foreground shrink-0">
            <Copy className="h-4 w-4" />
          </button>
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
            When a lead replies, the app will automatically update their milestone to <strong className="text-foreground">Replied</strong>, log the message in their conversation thread, and trigger any matching Auto-Flow rules.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663548851963/Q7eUYZ7wbDUp67BwzgNDrw/quotepush-favicon-hsV6w9Xq6ruPjUPpEDFYpV.webp"
            alt="QuotePush.io"
            className="h-5 w-5 rounded"
          />
          <h2 className="text-sm font-semibold text-foreground">About QuotePush.io</h2>
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>SMS Provider</span>
            <span className="text-foreground">Twilio</span>
          </div>
          <div className="flex justify-between">
            <span>Milestone Tracking</span>
            <span className="text-foreground">Pending → Sent → Replied / Scheduled / X-Dated</span>
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
