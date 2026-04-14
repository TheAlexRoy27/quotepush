import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Building2,
  CreditCard,
  Search,
  Shield,
  Users,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ─── Set Master Password Card ─────────────────────────────────────────────────

function SetMasterPasswordCard() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const setPassword_mut = trpc.customAuth.ownerSetPassword.useMutation({
    onSuccess: () => {
      toast.success("Master password saved. You can now sign in at /owner-login.");
      setPhone("");
      setPassword("");
      setConfirm("");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setPassword_mut.mutate({ phone, password });
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-lg">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-violet-400" />
        <h2 className="font-semibold text-foreground">Set Master Password</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Set or update the owner master login credentials. Once saved, you can sign in at{" "}
        <a href="/owner-login" className="text-violet-400 hover:underline">/owner-login</a>{" "}
        using your phone number and this password.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="op-phone">Mobile Number</Label>
          <Input
            id="op-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Digits only, e.g. 7605184325"
            autoComplete="off"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="op-password">New Password</Label>
          <div className="relative">
            <Input
              id="op-password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="pr-10"
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="op-confirm">Confirm Password</Label>
          <Input
            id="op-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" disabled={!phone || !password || !confirm || setPassword_mut.isPending}>
          {setPassword_mut.isPending ? "Saving…" : "Save Master Password"}
        </Button>
      </form>
    </div>
  );
}

// ─── Plan & Status Helpers ────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  if (plan === "elite") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
        ★ Elite
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
      Base
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20">
        <Clock className="h-3 w-3" /> No subscription
      </span>
    );
  }
  const map: Record<string, { icon: React.ElementType; label: string; cls: string }> = {
    active: { icon: CheckCircle2, label: "Active", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
    trialing: { icon: Clock, label: "Trialing", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    past_due: { icon: AlertTriangle, label: "Past Due", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
    canceled: { icon: XCircle, label: "Canceled", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
    incomplete: { icon: Clock, label: "Incomplete", cls: "bg-slate-500/15 text-slate-400 border-slate-500/20" },
  };
  const cfg = map[status] ?? map.incomplete;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type PlanFilter = "all" | "base" | "elite";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");

  const accountsQuery = trpc.admin.listAccounts.useQuery(undefined, {
    enabled: !!user && (user as any).role === "admin",
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => setLocation("/auth"),
  });

  const accounts = accountsQuery.data ?? [];

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      const matchesPlan = planFilter === "all" || a.plan === planFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.ownerName ?? "").toLowerCase().includes(q) ||
        (a.ownerEmail ?? "").toLowerCase().includes(q);
      return matchesPlan && matchesSearch;
    });
  }, [accounts, planFilter, search]);

  // Stats
  const totalOrgs = accounts.length;
  const baseCount = accounts.filter((a) => a.plan === "base").length;
  const eliteCount = accounts.filter((a) => a.plan === "elite").length;
  const activeCount = accounts.filter((a) => a.subscriptionStatus === "active").length;

  // Auth guard — redirect in effect, never in render
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [loading, user, setLocation]);

  if (loading || (!loading && !user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if ((user as any).role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg font-semibold text-foreground">Access Restricted</p>
          <p className="text-sm text-muted-foreground">This panel is only accessible to platform administrators.</p>
          <Button variant="outline" onClick={() => setLocation("/")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Shield className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <span className="font-semibold text-foreground">QuotePush.io</span>
              <span className="ml-2 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                Admin
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All organizations across Base and Elite plans
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Accounts" value={totalOrgs} icon={Building2} color="bg-blue-500/15 text-blue-400" />
          <StatCard label="Base Plan" value={baseCount} icon={CreditCard} color="bg-blue-500/15 text-blue-400" />
          <StatCard label="Elite Plan" value={eliteCount} icon={BarChart3} color="bg-violet-500/15 text-violet-400" />
          <StatCard label="Active Subscriptions" value={activeCount} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-400" />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by org name or owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "base", "elite"] as PlanFilter[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={planFilter === p ? "default" : "outline"}
                onClick={() => setPlanFilter(p)}
                className="capitalize"
              >
                {p === "all" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Accounts table */}
        {accountsQuery.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No accounts found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Organization</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Owner</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Members</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Leads</th>
                  <th className="text-right px-5 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((org, idx) => (
                  <tr
                    key={org.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/5"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-500/20 flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {org.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <PlanBadge plan={org.plan} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={org.subscriptionStatus} />
                    </td>
                    <td className="px-5 py-4">
                      {org.ownerName || org.ownerEmail ? (
                        <div>
                          <p className="text-foreground">{org.ownerName ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {org.ownerEmail ?? org.ownerPhone ?? ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {org.memberCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-foreground">{org.leadCount}</td>
                    <td className="px-5 py-4 text-right text-muted-foreground text-xs">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Showing {filtered.length} of {totalOrgs} account{totalOrgs !== 1 ? "s" : ""}
        </p>

        {/* Set Master Password */}
        <SetMasterPasswordCard />
      </main>
    </div>
  );
}
