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
  Clock,
  TrendingUp,
  BarChart2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Color palette ────────────────────────────────────────────────────────────

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

const REPLY_BUCKET_COLORS = [
  "#10b981",
  "#3b82f6",
  "#6366f1",
  "#f59e0b",
  "#f43f5e",
];

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

// ─── Format avg reply time ────────────────────────────────────────────────────

function formatMinutes(mins: number | null): string {
  if (mins === null) return "";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data, isLoading, refetch, isFetching } = trpc.analytics.overview.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Loading your data…</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <BarChart2 className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm">No analytics data available yet.</p>
        <p className="text-xs mt-1">Start sending messages to see your stats here.</p>
      </div>
    );
  }

  // Build messages-per-day chart data
  const dayMap = new Map<string, { day: string; outbound: number; inbound: number }>();
  for (const row of data.messagesPerDay) {
    if (!dayMap.has(row.day)) dayMap.set(row.day, { day: row.day, outbound: 0, inbound: 0 });
    const entry = dayMap.get(row.day)!;
    if (row.direction === "outbound") entry.outbound += row.count;
    else entry.inbound += row.count;
  }
  const msgChartData = Array.from(dayMap.values())
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-30);

  // Format day labels
  const msgChartFormatted = msgChartData.map((d) => ({
    ...d,
    label: new Date(d.day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visual overview of your lead engagement, reply times, and message activity.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-indigo-400" />}
          label="Total Leads"
          value={data.totalLeads.toLocaleString()}
          color="bg-indigo-500/15"
        />
        <StatCard
          icon={<MessageSquare className="h-5 w-5 text-blue-400" />}
          label="Messages Sent"
          value={data.totalMessages.toLocaleString()}
          sub="Last 30 days"
          color="bg-blue-500/15"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
          label="Reply Rate"
          value={`${data.replyRate}%`}
          sub={`${data.totalReplies} replies`}
          color="bg-emerald-500/15"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-400" />}
          label="Avg Reply Time"
          value={formatMinutes(data.avgReplyMinutes)}
          sub={data.avgReplyMinutes !== null ? "from first outbound" : "No replies yet"}
          color="bg-amber-500/15"
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages per day */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Message Activity</p>
            <p className="text-xs text-muted-foreground">Outbound vs inbound last 30 days</p>
          </div>
          {msgChartFormatted.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-muted-foreground/40 text-sm">
              No message data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={msgChartFormatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickLine={false}
                  interval={Math.max(0, Math.floor(msgChartFormatted.length / 6) - 1)}
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

        {/* Lead Milestones Pie */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Lead Milestones</p>
            <p className="text-xs text-muted-foreground">Current distribution across all leads</p>
          </div>
          {data.leadsByMilestone.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-muted-foreground/40 text-sm">
              No leads yet
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie
                    data={data.leadsByMilestone}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {data.leadsByMilestone.map((entry, index) => (
                      <Cell
                        key={entry.status}
                        fill={MILESTONE_COLORS[entry.status] ?? `hsl(${index * 60}, 60%, 55%)`}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.leadsByMilestone.map((entry, i) => (
                  <div key={entry.status} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: MILESTONE_COLORS[entry.status] ?? `hsl(${i * 60}, 60%, 55%)` }}
                    />
                    <span className="text-muted-foreground flex-1 truncate">{entry.status}</span>
                    <span className="font-semibold text-foreground">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reply Time Distribution */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Reply Time Distribution</p>
            <p className="text-xs text-muted-foreground">How quickly leads respond to your messages</p>
          </div>
          {data.replyTimeBuckets.every((b) => b.count === 0) ? (
            <div className="flex items-center justify-center h-52 text-muted-foreground/40 text-sm">
              No reply data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.replyTimeBuckets}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v} replies`, "Count"]}
                />
                <Bar dataKey="count" name="Replies" radius={[4, 4, 0, 0]}>
                  {data.replyTimeBuckets.map((_, index) => (
                    <Cell key={index} fill={REPLY_BUCKET_COLORS[index % REPLY_BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Reply Category Breakdown */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Reply Intent Breakdown</p>
            <p className="text-xs text-muted-foreground">How leads are classified when they reply</p>
          </div>
          {data.replyCategories.length === 0 ? (
            <div className="flex items-center justify-center h-52 text-muted-foreground/40 text-sm">
              No classified replies yet
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {data.replyCategories
                .sort((a, b) => b.count - a.count)
                .map((cat) => {
                  const total = data.replyCategories.reduce((s, c) => s + c.count, 0);
                  const pct = total > 0 ? Math.round((cat.count / total) * 100) : 0;
                  const color = CATEGORY_COLORS[cat.category] ?? "#6b7280";
                  return (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium">{cat.category}</span>
                        <span className="text-muted-foreground">
                          {cat.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Reply Trend Line */}
      {msgChartFormatted.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Reply Trend</p>
            <p className="text-xs text-muted-foreground">Inbound replies over the last 30 days</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={msgChartFormatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#6b7280" }}
                tickLine={false}
                interval={Math.max(0, Math.floor(msgChartFormatted.length / 6) - 1)}
              />
              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#1c1c1e", border: "1px solid #2a2a2e", borderRadius: 8, fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="inbound"
                name="Replies"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
