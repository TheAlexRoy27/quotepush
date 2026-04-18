import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CheckCircle2, ChevronRight, Eye, EyeOff, Key, Phone, Rocket, Users, Zap, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

type Step = "welcome" | "twilio" | "lead" | "bot" | "done";

const STEPS: Step[] = ["welcome", "twilio", "lead", "bot", "done"];

function StepDots({ current }: { current: Step }) {
  const active = STEPS.indexOf(current);
  return (
    <div className="flex items-center gap-1.5 justify-center mb-6">
      {STEPS.slice(1, -1).map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i < active - 1
              ? "w-6 bg-emerald-400"
              : i === active - 1
              ? "w-6 bg-primary"
              : "w-3 bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function SetupWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<Step>("welcome");
  const [, setLocation] = useLocation();

  // Twilio form state
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [savingTwilio, setSavingTwilio] = useState(false);

  const saveTwilio = trpc.org.saveTwilioConfig.useMutation();
  const utils = trpc.useUtils();

  const handleSaveTwilio = async () => {
    if (!accountSid.trim() || !authToken.trim() || !phoneNumber.trim()) {
      toast.error("Please fill in all three fields.");
      return;
    }
    setSavingTwilio(true);
    try {
      await saveTwilio.mutateAsync({ accountSid: accountSid.trim(), authToken: authToken.trim(), phoneNumber: phoneNumber.trim() });
      await utils.sms.isConfigured.invalidate();
      await utils.org.getTwilioConfig.invalidate();
      toast.success("Twilio connected!");
      setStep("lead");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save. Check your credentials.");
    } finally {
      setSavingTwilio(false);
    }
  };

  const handleClose = () => {
    setStep("welcome");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "welcome" && (
          <div className="text-center space-y-5 py-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold">Welcome to QuotePush.io!</DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Let's get you set up in 3 quick steps. This takes about 5 minutes and you'll be sending automated texts to leads right after.
              </p>
            </div>
            <div className="space-y-2 text-left">
              {[
                { icon: Key, label: "Connect your Twilio SMS account" },
                { icon: Users, label: "Add your first lead" },
                { icon: Zap, label: "Turn on the AI Bot" },
              ].map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{label}</span>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={() => setStep("twilio")}>
              Let's go <ChevronRight className="h-4 w-4" />
            </Button>
            <button onClick={handleClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Skip for now
            </button>
          </div>
        )}

        {step === "twilio" && (
          <div className="space-y-5">
            <StepDots current="twilio" />
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Key className="h-4 w-4 text-blue-400" />
                </div>
                <DialogTitle>Step 1: Connect Twilio</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Twilio is the service that sends your texts. You'll need a free Twilio account. Your credentials are on the main page of your Twilio dashboard.
            </p>
            <a
              href="https://console.twilio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open Twilio Console
            </a>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Account SID <span className="text-muted-foreground font-normal">(starts with "AC")</span></Label>
                <Input
                  value={accountSid}
                  onChange={e => setAccountSid(e.target.value)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Found at the top of your Twilio Console homepage.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Auth Token <span className="text-muted-foreground font-normal">(your secret password)</span></Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={authToken}
                    onChange={e => setAuthToken(e.target.value)}
                    placeholder="Enter your Auth Token"
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
                <p className="text-xs text-muted-foreground">Right next to your Account SID. Never share this with anyone.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Twilio Phone Number <span className="text-muted-foreground font-normal">(the number that sends texts)</span></Label>
                <Input
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="+15551234567"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">Must include country code. Example: +15551234567</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("welcome")}>Back</Button>
              <Button className="flex-1 gap-2" onClick={handleSaveTwilio} disabled={savingTwilio}>
                {savingTwilio ? "Saving..." : <>Save & Continue <ChevronRight className="h-4 w-4" /></>}
              </Button>
            </div>
            <button onClick={() => setStep("lead")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
              Skip this step for now
            </button>
          </div>
        )}

        {step === "lead" && (
          <div className="space-y-5">
            <StepDots current="lead" />
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <Users className="h-4 w-4 text-emerald-400" />
                </div>
                <DialogTitle>Step 2: Add Your First Lead</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A lead is someone you want to reach out to. You can add them one at a time or import a whole list from a spreadsheet (CSV file).
            </p>
            <div className="space-y-2">
              <button
                onClick={() => { handleClose(); setLocation("/leads?action=add"); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Add a lead manually</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Type in a name and phone number right now.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
              <button
                onClick={() => { handleClose(); setLocation("/leads?action=import"); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Import from a spreadsheet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV file with multiple leads at once.</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("twilio")}>Back</Button>
              <Button className="flex-1 gap-2" onClick={() => setStep("bot")}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === "bot" && (
          <div className="space-y-5">
            <StepDots current="bot" />
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-full bg-violet-500/15 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-violet-400" />
                </div>
                <DialogTitle>Step 3: Turn On the AI Bot</DialogTitle>
              </div>
            </DialogHeader>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The AI Bot automatically texts new leads the moment they're added. It handles the first conversation so you only step in when a lead is ready to talk.
            </p>
            <div className="p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-2">
              <p className="text-xs font-semibold text-violet-300 uppercase tracking-wide">What the bot does</p>
              {[
                "Sends a personalized opening text within seconds of a new lead being added",
                "Replies to common questions automatically",
                "Flags hot leads so you know who to call",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("lead")}>Back</Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => { handleClose(); setLocation("/bot"); }}
              >
                Set Up Bot <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <button onClick={() => setStep("done")} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
              Skip for now
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-5 py-2">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold">You're all set!</DialogTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your account is configured. Head to your dashboard to see your pipeline, or go to Leads to start adding contacts.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
