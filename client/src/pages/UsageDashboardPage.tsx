import { trpc } from "@/lib/trpc";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useState } from "react";

// ─── Color palettes ───────────────────────────────────────────────────────────
const MILESTONE_COLORS: Record<string, string> = {
  Pending: "#6366f1",
  Sent: "#3b82f6",
  Replied: "#10b981",
  Scheduled: "#f59e0b",
  "X-Dated": "#14b8a6",
};
const CATEGORY_COLORS: Record<string, string> = {
  Interested: "#10b981",
  "Not Interested": "#f43f5e",
  "Wants More Info": "#3b82f6",
  Unsubscribe: "#6b7280",
  Positive: "#10b981",
  Negative: "#f43f5e",
  Neutral: "#6b7280",
};
const REPLY_BUCKET_COLORS = ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#f43f5e"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMinutes(mins: number | null): string {
  if (mins === null) return "N/A";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

// ─── Empty Placeholder Box ────────────────────────────────────────────────────
// Shows a dashed box with a subtle grid pattern. On hover, shows a tooltip.
function EmptyPlaceholder({ height = 220, label = "No data available yet" }: { height?: number; label?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative w-full rounded-lg overflow-hidden cursor-default select-none"
      style={{ height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Dashed border box */}
      <div className="absolute inset-0 border-2 border-dashed border-border/60 rounded-lg" />

      {/* Subtle grid lines mimicking a chart background */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Fake bar silhouettes */}
      <div className="absolute bottom-6 left-8 right-8 flex items-end gap-2 opacity-10">
        {[55, 35, 70, 45, 80, 30, 60, 50, 75, 40, 65, 55].map((h, i) => (
          <div
            key={i}
            className="flex-1 bg-muted-foreground rounded-t"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* Hover tooltip */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-200 ${hovered ? "opacity-100" : "opacity-0"}`}
      >
        <div className="bg-popover border border-border rounded-xl px-4 py-3 shadow-xl flex items-center gap-2 text-sm text-foreground">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color, empty,
}: {
  icon: React.ReactNode; label: string; value?: string | number; sub?: string; color: string; empty?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`bg-card border border-border rounded-xl p-5 flex items-start gap-4 relative overflow-hidden ${empty ? "cursor-default" : ""}`}
      onMouseEnter={() => empty && setHovered(true)}
      onMouseLeave={() => empty && setHovered(false)}
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color} ${empty ? "opacity-30" : ""}`}>
        {icon}
      </div>
      <div className={empty ? "opacity-30" : ""}>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{empty ? "-" : value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{empty ? "No data yet" : sub}</p>}
      </div>
      {/* Hover tooltip for empty cards */}
      {empty && hovered && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-xl">
          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs text-foreground">
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            No data available yet
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Plan Banner ──────────────────────────────────────────────────────────────
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
        <Button size="sm" onClick={() => setLocation("/billing")} className="shrink-0">View Plans</Button>
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

// ─── Chart Card wrapper ───────────────────────────────────────────────────────
function ChartCard({ title, sub, children, hasData, emptyLabel, emptyHeight = 220 }: {
  title: string; sub: string; children: React.ReactNode; hasData: boolean; emptyLabel?: string; emptyHeight?: number;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {hasData ? children : <EmptyPlaceholder height={emptyHeight} label={emptyLabel} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsageDashboardPage() {
  const { data: twilioConfigured } = trpc.sms.isConfigured.useQuery();
  const { data, isLoading, refetch, isFetching } = trpc.usageDashboard.stats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const { data: analytics, isLoading: analyticsLoading } = trpc.analytics.overview.useQuery(undefined, {
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

  // Build chart data from usageDashboard (may be null if no org yet)
  const usageData = data ?? {
    totalLeads: 0, booked: 0, totalSent: 0, totalReplies: 0,
    replyRate: 0, activeEnrollments: 0, messagesPerDay: [],
    plan: null, subscriptionStatus: null,
  };

  const dayMap = new Map<string, { day: string; outbound: number; inbound: number }>();
  for (const row of usageData.messagesPerDay) {
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

  const estimatedValue = usageData.booked * 500;
  const hasUsageData = usageData.totalSent > 0 || usageData.totalLeads > 0;

  // Analytics chart data
  const analyticsChartData = analytics
    ? (() => {
        const aMap = new Map<string, { day: string; outbound: number; inbound: number }>();
        for (const row of analytics.messagesPerDay) {
          if (!aMap.has(row.day)) aMap.set(row.day, { day: row.day, outbound: 0, inbound: 0 });
          const entry = aMap.get(row.day)!;
          if (row.direction === "outbound") entry.outbound += row.count;
          else entry.inbound += row.count;
        }
        return Array.from(aMap.values())
          .sort((a, b) => a.day.localeCompare(b.day))
          .slice(-30)
          .map((d) => ({
            ...d,
            label: new Date(d.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          }));
      })()
    : [];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">My Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your personal usage stats and pipeline performance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="bg-background">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Twilio Not Configured Banner */}
      {!twilioConfigured && (
        <div className="flex items-start sm:items-center gap-3 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
          <span className="text-amber-500 text-lg shrink-0">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Twilio is not configured</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">No SMS messages will be sent until you add your Twilio credentials in Settings. The AI bot and drip sequences are ready but inactive.</p>
          </div>
          <a href="/settings" className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 whitespace-nowrap">Go to Settings</a>
        </div>
      )}

      {/* Plan Banner */}
      <PlanBanner plan={usageData.plan} status={usageData.subscriptionStatus} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={<Users className="h-5 w-5 text-indigo-400" />} label="Total Leads" value={usageData.totalLeads.toLocaleString()} color="bg-indigo-500/15" empty={usageData.totalLeads === 0} />
        <StatCard icon={<MessageSquare className="h-5 w-5 text-blue-400" />} label="Messages Sent" value={usageData.totalSent.toLocaleString()} sub="All time" color="bg-blue-500/15" empty={usageData.totalSent === 0} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Reply Rate" value={`${usageData.replyRate}%`} sub={`${usageData.totalReplies} total replies`} color="bg-emerald-500/15" empty={usageData.totalReplies === 0} />
        <StatCard icon={<CalendarCheck className="h-5 w-5 text-amber-400" />} label="Leads Booked" value={usageData.booked.toLocaleString()} sub="Scheduled or X-Dated" color="bg-amber-500/15" empty={usageData.booked === 0} />
        <StatCard icon={<Zap className="h-5 w-5 text-violet-400" />} label="Active Drips" value={usageData.activeEnrollments.toLocaleString()} sub="Enrollments running" color="bg-violet-500/15" empty={usageData.activeEnrollments === 0} />
        <StatCard icon={<CreditCard className="h-5 w-5 text-pink-400" />} label="Est. Pipeline Value" value={`$${estimatedValue.toLocaleString()}`} sub="At $500 avg per booked lead" color="bg-pink-500/15" empty={estimatedValue === 0} />
      </div>

      {/* Message Activity Chart */}
      <ChartCard
        title="Message Activity"
        sub="Outbound vs inbound last 30 days"
        hasData={chartData.length > 0}
        emptyLabel="Send your first message to see activity"
        emptyHeight={240}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 6) - 1)} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e5e7eb" }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="outbound" name="Outbound" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            <Bar dataKey="inbound" name="Inbound" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ROI Summary */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Your ROI at a Glance</p>
        <p className="text-xs text-muted-foreground mb-4">Based on your activity, here is what QuotePush.io has generated for your pipeline.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div><p className={`text-xl font-bold ${hasUsageData ? "text-foreground" : "text-muted-foreground/40"}`}>{hasUsageData ? usageData.totalSent : "-"}</p><p className="text-xs text-muted-foreground">Texts Sent</p></div>
          <div><p className={`text-xl font-bold ${usageData.totalReplies > 0 ? "text-emerald-400" : "text-muted-foreground/40"}`}>{usageData.totalReplies > 0 ? usageData.totalReplies : "-"}</p><p className="text-xs text-muted-foreground">Replies Received</p></div>
          <div><p className={`text-xl font-bold ${usageData.booked > 0 ? "text-amber-400" : "text-muted-foreground/40"}`}>{usageData.booked > 0 ? usageData.booked : "-"}</p><p className="text-xs text-muted-foreground">Leads Booked</p></div>
          <div><p className={`text-xl font-bold ${estimatedValue > 0 ? "text-violet-400" : "text-muted-foreground/40"}`}>{estimatedValue > 0 ? `$${estimatedValue.toLocaleString()}` : "-"}</p><p className="text-xs text-muted-foreground">Est. Value Generated</p></div>
        </div>
      </div>

      {/* ─── Analytics Section ─────────────────────────────────────────────── */}
      <div className="pt-4 border-t border-border">
        <div className="mb-4">
          <p className="text-lg font-semibold text-foreground">Analytics</p>
          <p className="text-xs text-muted-foreground">Visual overview of your lead engagement, reply times, and message activity.</p>
        </div>

        {analyticsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Analytics KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="h-5 w-5 text-indigo-400" />} label="Total Leads" value={analytics?.totalLeads.toLocaleString()} color="bg-indigo-500/15" empty={!analytics || analytics.totalLeads === 0} />
              <StatCard icon={<MessageSquare className="h-5 w-5 text-blue-400" />} label="Msgs (30d)" value={analytics?.totalMessages.toLocaleString()} color="bg-blue-500/15" empty={!analytics || analytics.totalMessages === 0} />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-400" />} label="Reply Rate" value={`${analytics?.replyRate ?? 0}%`} sub={`${analytics?.totalReplies ?? 0} replies`} color="bg-emerald-500/15" empty={!analytics || analytics.totalReplies === 0} />
              <StatCard icon={<Clock className="h-5 w-5 text-amber-400" />} label="Avg Reply Time" value={formatMinutes(analytics?.avgReplyMinutes ?? null)} sub={analytics?.avgReplyMinutes != null ? "from first outbound" : "No replies yet"} color="bg-amber-500/15" empty={!analytics || analytics.avgReplyMinutes === null} />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Message Activity" sub="Outbound vs inbound last 30 days" hasData={analyticsChartData.length > 0} emptyLabel="No message data yet">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analyticsChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} interval={Math.max(0, Math.floor(analyticsChartData.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#e5e7eb" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="outbound" name="Outbound" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="inbound" name="Inbound" fill="#10b981" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Lead Milestones" sub="Current distribution across all leads" hasData={!!(analytics && analytics.leadsByMilestone.length > 0)} emptyLabel="Add leads to see milestone breakdown">
                {analytics && analytics.leadsByMilestone.length > 0 && (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={200}>
                      <PieChart>
                        <Pie data={analytics.leadsByMilestone} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                          {analytics.leadsByMilestone.map((entry, index) => (
                            <Cell key={entry.status} fill={MILESTONE_COLORS[entry.status] ?? `hsl(${index * 60}, 60%, 55%)`} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {analytics.leadsByMilestone.map((entry, i) => (
                        <div key={entry.status} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: MILESTONE_COLORS[entry.status] ?? `hsl(${i * 60}, 60%, 55%)` }} />
                          <span className="text-muted-foreground flex-1 truncate">{entry.status}</span>
                          <span className="font-semibold text-foreground">{entry.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Reply Time Distribution" sub="How quickly leads respond to your messages" hasData={!!(analytics && analytics.replyTimeBuckets.some((b) => b.count > 0))} emptyLabel="No reply data yet">
                {analytics && (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.replyTimeBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${v} replies`, "Count"]} />
                      <Bar dataKey="count" name="Replies" radius={[4, 4, 0, 0]}>
                        {analytics.replyTimeBuckets.map((_, index) => (
                          <Cell key={index} fill={REPLY_BUCKET_COLORS[index % REPLY_BUCKET_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Reply Intent Breakdown" sub="How leads are classified when they reply" hasData={!!(analytics && analytics.replyCategories.length > 0)} emptyLabel="No classified replies yet">
                {analytics && analytics.replyCategories.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {analytics.replyCategories
                      .sort((a, b) => b.count - a.count)
                      .map((cat) => {
                        const total = analytics.replyCategories.reduce((s, c) => s + c.count, 0);
                        const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                        const color = CATEGORY_COLORS[cat.category] ?? "#6b7280";
                        return (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium">{cat.category}</span>
                              <span className="text-muted-foreground">{cat.count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Reply Trend Line */}
            <ChartCard title="Reply Trend" sub="Inbound replies over the last 30 days" hasData={analyticsChartData.length > 1} emptyLabel="No trend data yet" emptyHeight={180}>
              {analyticsChartData.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={analyticsChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} interval={Math.max(0, Math.floor(analyticsChartData.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="inbound" name="Replies" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>
        )}
      </div>
    </div>
  );
}
