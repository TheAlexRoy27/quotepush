import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";

const TARGET_STATUSES = ["Replied", "Scheduled", "X-Dated"] as const;
type TargetStatus = (typeof TARGET_STATUSES)[number];

const STATUS_COLORS: Record<TargetStatus, string> = {
  Replied: "bg-green-500/15 text-green-400 border-green-500/30",
  Scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "X-Dated": "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

export default function KeywordPromotionPage() {
  const { data: rules = [], isLoading, refetch } = trpc.keywordPromotion.list.useQuery();
  const createRule = trpc.keywordPromotion.create.useMutation({ onSuccess: () => { refetch(); toast.success("Rule created"); } });
  const updateRule = trpc.keywordPromotion.update.useMutation({ onSuccess: () => { refetch(); } });
  const deleteRule = trpc.keywordPromotion.delete.useMutation({ onSuccess: () => { refetch(); toast.success("Rule deleted"); } });

  const [keyword, setKeyword] = useState("");
  const [targetStatus, setTargetStatus] = useState<TargetStatus>("Replied");

  const handleCreate = () => {
    if (!keyword.trim()) return toast.error("Enter a keyword");
    createRule.mutate({ keyword: keyword.trim(), targetStatus });
    setKeyword("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-yellow-400" />
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Auto-Milestone Promotion</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          When a lead replies with a matching keyword, their milestone is automatically advanced. Rules are checked in order and only the first match applies.
        </p>
      </div>

      {/* Add rule form */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Add New Rule</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Keyword (e.g. yes, interested, call me)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="flex-1"
          />
          <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as TargetStatus)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreate} disabled={createRule.isPending} className="shrink-0">
            {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
            Add Rule
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tip: keywords are case-insensitive and match anywhere in the message. "yes" matches "Yes!", "YES please", etc.
        </p>
      </div>

      {/* Rules list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <Zap className="h-8 w-8 opacity-20" />
            <p className="text-sm">No rules yet. Add one above to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Keyword</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Promotes to</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-foreground">{rule.keyword}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={STATUS_COLORS[rule.targetStatus as TargetStatus] ?? ""}>
                      {rule.targetStatus}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={rule.isActive === 1}
                      onCheckedChange={(checked) =>
                        updateRule.mutate({ id: rule.id, isActive: checked })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Delete rule for "${rule.keyword}"?`)) deleteRule.mutate({ id: rule.id });
                      }}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Default rules hint */}
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
        <p className="text-xs font-semibold text-yellow-400">Suggested starter rules</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
          {[
            { kw: "yes", status: "Replied" },
            { kw: "interested", status: "Replied" },
            { kw: "call me", status: "Scheduled" },
            { kw: "schedule", status: "Scheduled" },
            { kw: "book", status: "Scheduled" },
            { kw: "not now", status: "X-Dated" },
          ].map(({ kw, status }) => (
            <button
              key={kw}
              onClick={() => { setKeyword(kw); setTargetStatus(status as TargetStatus); }}
              className="text-left px-2 py-1.5 rounded-md border border-border hover:bg-accent/30 transition-colors font-mono"
            >
              "{kw}" <span className="text-muted-foreground/60">→ {status}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
