import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, Zap, Crown, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useEffect } from "react";
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
    "Priority support",
    "Advanced analytics (coming soon)",
    "White-label options (coming soon)",
  ],
};

export default function BillingPage() {
  const [location] = useLocation();
  const { data: status, refetch } = trpc.billing.getStatus.useQuery();
  const createCheckout = trpc.billing.createCheckout.useMutation();
  const createPortal = trpc.billing.createPortal.useMutation();

  // Handle return from Stripe
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

  const isActive = status?.subscriptionStatus === "active" || status?.subscriptionStatus === "trialing";
  const currentPlan = status?.plan ?? null;

  const statusColor = {
    active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    trialing: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    past_due: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    canceled: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    incomplete: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
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
                ) : (
                  <Zap className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground capitalize">
                  {currentPlan ?? "No"} Plan
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentPlan === "base" ? "$199 / month" : currentPlan === "elite" ? "$249 / month" : "Not subscribed"}
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

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              {currentPlan === "base" && isActive ? "Current Plan" : "Subscribe — $199/mo"}
            </Button>
          </CardFooter>
        </Card>

        {/* Elite Plan */}
        <Card className={`relative border-primary/40 bg-primary/5 flex flex-col transition-all ${currentPlan === "elite" && isActive ? "ring-2 ring-primary/50" : ""}`}>
          {currentPlan !== "elite" && (
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
              {currentPlan === "elite" && isActive ? "Current Plan" : "Subscribe — $249/mo"}
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
    </div>
  );
}
