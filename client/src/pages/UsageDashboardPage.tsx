import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  MessageSquare,
  Users,
  TrendingUp,
  CalendarCheck,
  Zap,
  CreditCard,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────
function PlanBanner({ plan, status }: { plan: string | null; status: string | null }) {
  const [, setLocation] = useLocation();
  const isActive = status === "active" || status === "trialing";

  if (!plan || !isActive) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">No active plan</p>
            <p className="text-xs text-muted-foreground">Unlock SMS sending, drip sequences, and more.</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setLocation("/billing")} className="shrink-0">
          View Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
      <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">
          Active Plan
          <Badge variant="outline" className="ml-2 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs capitalize">
            {plan}
          </Badge>
        </p>
        <p className="text-xs text-muted-foreground">Your subscription is active. Keep closing deals.</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsageDashboardPage() {
  const { data, isLoading, refetch, isFetching } = trpc.usageDashboard.stats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-48 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-16 bg-muted/30 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-card border border-border rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <BarChart className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No usage data available yet.</p>
      </div>
    );
  }

  // Build chart data
  const dayMap = new Map<string, { day: string; outbound: number; inbound: number }>();
  for (const row of data.messagesPerDay) {
    if (!dayMap.has(row.day)) dayMap.set(row.day, { day: row.day, outbound: 0, inbound: 0 });
    const entry = dayMap.get(row.day)!;
    if (row.direction === "outbound") entry.outbound += row.count;
    else entry.inbound += row.count;
  }
  const chartData = Array.from(dayMap.values())
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-30)
    .map((d) => ({
      ...d,
      label: new Date(d.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));

  // ROI estimate: assume each booked lead is worth $500 on average
  const estimatedValue = data.booked * 500;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your personal usage stats and pipeline performance.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="bg-background">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Plan Banner */}
      <PlanBanner plan={data.plan} status={data.subscriptionStatus} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-indigo-400" />}
          label="Total Leads"
          value={data.totalLeads.toLocaleString()}
          color="bg-indigo-500/15"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          label="Messages Sent"
          value={data.totalSent.toLocaleString()}
          sub="All time"
          color="bg-blue-500/15"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
          label="Reply Rate"
          value={`${data.replyRate}%`}
          sub={`${data.totalReplies} total replies`}
          color="bg-emerald-500/15"
        />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5 text-amber-400" />}
          label="Leads Booked"
          value={data.booked.toLocaleString()}
          sub="Scheduled or X-Dated"
          color="bg-amber-500/15"
        />
        <StatCard
          icon={<Zap className="h-5 w-5 text-violet-400" />}
          label="Active Drips"
          value={data.activeEnrollments.toLocaleString()}
          sub="Enrollments running"
          color="bg-violet-500/15"
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-pink-400" />}
          label="Est. Pipeline Value"
          value={`$${estimatedValue.toLocaleString()}`}
          sub="At $500 avg per booked lead"
          color="bg-pink-500/15"
        />
      </div>

      {/* Message Activity Chart */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Message Activity</p>
          <p className="text-xs text-muted-foreground">Outbound vs inbound last 30 days</p>
        </div>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-52 text-muted-foreground/40 text-sm">
            No message data yet. Start sending to see your activity here.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 6) - 1)}
              />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#e5e7eb" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="outbound" name="Outbound" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="inbound" name="Inbound" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ROI Summary */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Your ROI at a Glance</p>
        <p className="text-xs text-muted-foreground mb-4">
          Based on your activity, here is what QuotePush.io has generated for your pipeline.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-foreground">{data.totalSent}</p>
            <p className="text-xs text-muted-foreground">Texts Sent</p>
          </div>
          <div>
            <p className="text-xl font-bold text-emerald-400">{data.totalReplies}</p>
            <p className="text-xs text-muted-foreground">Replies Received</p>
          </div>
          <div>
            <p className="text-xl font-bold text-amber-400">{data.booked}</p>
            <p className="text-xs text-muted-foreground">Leads Booked</p>
          </div>
          <div>
            <p className="text-xl font-bold text-violet-400">${estimatedValue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Est. Value Generated</p>
          </div>
        </div>
      </div>
    </div>
  );
}
