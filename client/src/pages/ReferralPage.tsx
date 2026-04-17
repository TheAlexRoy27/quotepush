import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Gift, Users } from "lucide-react";
import { toast } from "sonner";

export default function ReferralPage() {
  const { data: codeData, isLoading: codeLoading } = trpc.referrals.myCode.useQuery();
  const { data: referrals = [], isLoading: refLoading } = trpc.referrals.myReferrals.useQuery();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!codeData?.link) return;
    navigator.clipboard.writeText(codeData.link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const converted = referrals.filter((r) => r.convertedAt).length;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gift className="h-5 w-5 text-pink-400" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Partner Referrals</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Refer other agents or business owners to QuotePush.io. Share your unique link and track every signup that comes through it. This is for referring other QuotePush users, not for tracking referrals from your own leads.
        </p>
      </div>

      {/* Referral link card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Your Referral Link</h2>
        {codeLoading ? (
          <div className="h-10 bg-muted/30 rounded-lg animate-pulse" />
        ) : (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/20 text-sm font-mono text-muted-foreground truncate select-all">
              {codeData?.link ?? "Loading..."}
            </div>
            <Button onClick={handleCopy} variant="outline" className="shrink-0 bg-background">
              {copied ? <Check className="h-4 w-4 mr-1.5 text-green-400" /> : <Copy className="h-4 w-4 mr-1.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Your referral code: <span className="font-mono font-semibold text-foreground">{codeData?.code ?? "..."}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-foreground">{referrals.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Signups</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{converted}</p>
          <p className="text-xs text-muted-foreground mt-1">Converted to Paid</p>
        </div>
      </div>

      {/* Referrals list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Referred Signups</h2>
        </div>
        {refLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : referrals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-20" />
            <p className="text-sm">No referrals yet. Share your link to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Signed up</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{r.referredName ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {r.referredPhone ?? r.referredEmail ?? "N/A"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {r.convertedAt ? (
                      <Badge variant="outline" className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                        Converted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border text-xs">
                        Signed up
                      </Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
