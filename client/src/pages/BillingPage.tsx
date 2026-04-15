import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  CheckCircle2, Zap, Crown, Loader2, ExternalLink, AlertCircle, Building2, Star, MessageSquare, Phone,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const PLAN_FEATURES = {
  base: [
    "Lead management dashboard",
    "CSV import & manual entry",
    "Personalized SMS outreach",
    "AI-powered reply classification",
    "Auto-flow templates",
    "CRM webhook integration",
    "1 team seat",
  ],
  elite: [
    "Everything in Base",
    "Unlimited team members",
    "Multi-step drip sequences",
    "A/B branch reply flows",
    "Priority support",
    "Advanced analytics (coming soon)",
  ],
  enterprise: [
    "Everything in Elite",
    "Dedicated Agency Success Manager",
    "Custom onboarding & training",
    "White-label & custom branding",
    "Custom integrations & API access",
    "Volume SMS pricing",
    "SLA-backed uptime guarantee",
    "Quarterly strategy reviews",
  ],
};

export default function BillingPage() {
  const [location] = useLocation();
  const { data: status, refetch } = trpc.billing.getStatus.useQuery();
  const createCheckout = trpc.billing.createCheckout.useMutation();
  const createPortal = trpc.billing.createPortal.useMutation();
  const notifyOwner = trpc.system.notifyOwner.useMutation();

  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({ name: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success")) {
      toast.success("Subscription activated! Welcome to QuotePush.io.");
      refetch();
    } else if (params.get("canceled")) {
      toast.info("Checkout canceled. You can subscribe anytime.");
    }
  }, []);

  const handleSubscribe = async (planId: "base" | "elite") => {
    try {
      const { url } = await createCheckout.mutateAsync({ planId, origin: window.location.origin });
      if (url) {
        toast.info("Redirecting to checkout...");
        window.open(url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create checkout session");
    }
  };

  const handleManage = async () => {
    try {
      const { url } = await createPortal.mutateAsync({ origin: window.location.origin });
      if (url) window.open(url, "_blank");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to open billing portal");
    }
  };

  const handleEnterpriseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterpriseForm.name || !enterpriseForm.phone) {
      toast.error("Please enter your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await notifyOwner.mutateAsync({
        title: "🏢 Enterprise Inquiry",
        content: `New Enterprise plan inquiry from ${enterpriseForm.name} at ${enterpriseForm.company || "N/A"}.\n\nPhone: ${enterpriseForm.phone}\nMessage: ${enterpriseForm.message || "No message provided."}`,
      });
      setSubmitted(true);
      toast.success("Message sent! Your Agency Success Manager will reach out shortly.");
    } catch (err: any) {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = status?.subscriptionStatus === "active" || status?.subscriptionStatus === "trialing";
  const currentPlan: string | null = status?.plan ?? null;

  const statusColor: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    trialing: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    past_due: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    canceled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    incomplete: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Billing & Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your QuotePush.io subscription. Cancel anytime.
        </p>
      </div>

      {/* Current Status */}
      {status && (
        <Card className="border-border/60 bg-card/50">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                {currentPlan === "elite" ? (
                  <Crown className="h-4 w-4 text-primary" />
                ) : currentPlan === "enterprise" ? (
                  <Building2 className="h-4 w-4 text-amber-400" />
                ) : (
                  <Zap className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {currentPlan ?? "No"} Plan
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentPlan === "base"
                    ? "$199 / month"
                    : currentPlan === "elite"
                    ? "$249 / month"
                    : currentPlan === "enterprise"
                    ? "Custom pricing"
                    : "Not subscribed"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {status.subscriptionStatus && (
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${statusColor[status.subscriptionStatus] ?? statusColor.incomplete}`}>
                  {status.subscriptionStatus}
                </span>
              )}
              {isActive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManage}
                  disabled={createPortal.isPending}
                  className="gap-1.5"
                >
                  {createPortal.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Due Warning */}
      {status?.subscriptionStatus === "past_due" && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-300">
            Your payment is past due. Please update your payment method to avoid service interruption.
          </p>
        </div>
      )}

      {/* Plan Cards 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Base Plan */}
        <Card className={`relative border-border/60 bg-card/50 flex flex-col transition-all ${currentPlan === "base" && isActive ? "ring-2 ring-primary/50" : ""}`}>
          {currentPlan === "base" && isActive && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Current Plan</span>
            </div>
          )}
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Base</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">$199</span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </div>
            <CardDescription>Perfect for solo operators and small teams.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2.5">
              {PLAN_FEATURES.base.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button
              className="w-full"
              variant={currentPlan === "base" && isActive ? "outline" : "default"}
              disabled={createCheckout.isPending || (currentPlan === "base" && isActive)}
              onClick={() => handleSubscribe("base")}
            >
              {createCheckout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {currentPlan === "base" && isActive ? "Current Plan" : "Subscribe $199/mo"}
            </Button>
          </CardFooter>
        </Card>

        {/* Elite Plan */}
        <Card className={`relative border-primary/40 bg-primary/5 flex flex-col transition-all ${currentPlan === "elite" && isActive ? "ring-2 ring-primary/50" : ""}`}>
          {currentPlan !== "elite" && currentPlan !== "enterprise" && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Most Popular</span>
            </div>
          )}
          {currentPlan === "elite" && isActive && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-medium">Current Plan</span>
            </div>
          )}
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Elite</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">$249</span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </div>
            <CardDescription>Unlimited team members. All features included.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2.5">
              {PLAN_FEATURES.elite.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button
              className="w-full"
              disabled={createCheckout.isPending || (currentPlan === "elite" && isActive)}
              onClick={() => handleSubscribe("elite")}
            >
              {createCheckout.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {currentPlan === "elite" && isActive ? "Current Plan" : "Subscribe $249/mo"}
            </Button>
          </CardFooter>
        </Card>

        {/* Enterprise Plan */}
        <Card className="relative flex flex-col border-0 bg-gradient-to-b from-amber-950/40 to-zinc-900/60 ring-1 ring-amber-500/30 shadow-lg shadow-amber-900/10">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="text-xs bg-gradient-to-r from-amber-400 to-yellow-300 text-zinc-900 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
              <Star className="h-3 w-3" /> Enterprise
            </span>
          </div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-amber-400" />
              <CardTitle className="text-lg text-amber-100">Enterprise</CardTitle>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-amber-100">Custom</span>
            </div>
            <CardDescription className="text-amber-200/70">
              Built for agencies and high-volume teams. Let's talk.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <ul className="space-y-2.5">
              {PLAN_FEATURES.enterprise.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-amber-100/80">
                  <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="pt-4">
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 font-semibold hover:from-amber-400 hover:to-yellow-300 border-0 gap-2 whitespace-normal leading-tight py-3 h-auto"
              onClick={() => { setSubmitted(false); setEnterpriseForm({ name: "", phone: "", company: "", message: "" }); setShowEnterpriseModal(true); }}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              Talk to Agency Success Manager
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Separator className="opacity-30" />

      {/* Test card info */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Testing payments?</span> Use card number{" "}
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">4242 4242 4242 4242</code>{" "}
          with any future expiry and any 3-digit CVC. Real payments require Stripe KYC verification.
        </p>
      </div>

      {/* Enterprise Contact Modal */}
      <Dialog open={showEnterpriseModal} onOpenChange={setShowEnterpriseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center">
                <Phone className="h-4 w-4 text-zinc-900" />
              </div>
              <DialogTitle>Let's Talk Enterprise</DialogTitle>
            </div>
            <DialogDescription>
              Hi there! 👋 I'm your Agency Success Manager at QuotePush.io. Leave your details below and I'll personally reach out within one business day to learn about your team's goals and put together a custom plan.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="py-8 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="font-medium text-foreground">Message received!</p>
              <p className="text-sm text-muted-foreground">
                Your Agency Success Manager will reach out to you shortly. We're excited to learn more about your agency!
              </p>
              <Button variant="outline" className="mt-2" onClick={() => setShowEnterpriseModal(false)}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEnterpriseSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ent-name">Your Name *</Label>
                  <Input
                    id="ent-name"
                    placeholder="Michelle"
                    value={enterpriseForm.name}
                    onChange={(e) => setEnterpriseForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ent-phone">Phone Number *</Label>
                  <Input
                    id="ent-phone"
                    placeholder="7605184325"
                    value={enterpriseForm.phone}
                    onChange={(e) => setEnterpriseForm((p) => ({ ...p, phone: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ent-company">Agency / Company Name</Label>
                <Input
                  id="ent-company"
                  placeholder="Acme Insurance Group"
                  value={enterpriseForm.company}
                  onChange={(e) => setEnterpriseForm((p) => ({ ...p, company: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ent-message">Tell us about your team</Label>
                <Textarea
                  id="ent-message"
                  placeholder="How many agents? What industry? Any specific needs? (optional)"
                  rows={3}
                  value={enterpriseForm.message}
                  onChange={(e) => setEnterpriseForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEnterpriseModal(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-zinc-900 font-semibold hover:from-amber-400 hover:to-yellow-300 border-0"
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Send Message
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
