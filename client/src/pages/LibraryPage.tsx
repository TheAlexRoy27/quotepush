import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  Zap,
  BookOpen,
  Loader2,
  Sparkles,
  MessageSquare,
  Info,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Interested",
  "Not Interested",
  "Wants More Info",
  "Unsubscribe",
] as const;

type ReplyCategory = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<
  ReplyCategory,
  {
    color: string;
    bg: string;
    border: string;
    icon: string;
    description: string;
    triggerExamples: string[];
  }
> = {
  Interested: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "✅",
    description: "Lead wants to move forward or schedule a call",
    triggerExamples: ["Yes", "That works", "Sounds good", "Sure", "Let's do it", "Absolutely"],
  },
  "Not Interested": {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "🚫",
    description: "Lead declines or is not interested",
    triggerExamples: ["No thanks", "Not interested", "Not for us", "We're all set", "Pass"],
  },
  "Wants More Info": {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "❓",
    description: "Lead is asking questions or requesting details",
    triggerExamples: ["How much?", "Tell me more", "What do you offer?", "How does it work?"],
  },
  Unsubscribe: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icon: "🔕",
    description: "Lead wants to opt out of messages",
    triggerExamples: ["STOP", "Unsubscribe", "Remove me", "Don't text me", "Opt out"],
  },
};

const VARIABLE_HINTS = [
  { tag: "{{firstName}}", desc: "Lead's first name (auto-capitalized)" },
  { tag: "{{name}}", desc: "Lead's full name (auto-capitalized)" },
  { tag: "{{company}}", desc: "Lead's company" },
  { tag: "{{link}}", desc: "Scheduling / Calendly link" },
];

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isLinked,
  onEdit,
  onDelete,
}: {
  template: { id: number; name: string; body: string; isActive: number };
  isLinked: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const preview = template.body.slice(0, 120) + (template.body.length > 120 ? "…" : "");
  return (
    <div
      className={`group relative bg-card border rounded-xl p-4 transition-all hover:border-primary/30 hover:shadow-md ${
        template.isActive ? "border-border" : "border-border/40 opacity-60"
      }`}
    >
      {isLinked && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <Zap className="h-2.5 w-2.5" /> Auto-flow
        </span>
      )}
      <div className="flex items-start justify-between gap-2 pr-16">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{preview}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        {!template.isActive && (
          <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
            Inactive
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor Modal ────────────────────────────────────────────────────

function TemplateEditorModal({
  open,
  onClose,
  defaultCategory,
  template,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultCategory: ReplyCategory;
  template?: {
    id: number;
    name: string;
    category: string;
    body: string;
    isActive: number;
  } | null;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<ReplyCategory>(
    (template?.category as ReplyCategory) ?? defaultCategory
  );
  const [body, setBody] = useState(template?.body ?? "");
  const [isActive, setIsActive] = useState(template ? template.isActive === 1 : true);
  const utils = trpc.useUtils();

  const createMutation = trpc.flowTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      utils.flowTemplates.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.flowTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated");
      utils.flowTemplates.list.invalidate();
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!name.trim() || !body.trim()) {
      toast.error("Name and body are required");
      return;
    }
    if (template) {
      updateMutation.mutate({ id: template.id, name, category, body, isActive });
    } else {
      createMutation.mutate({ name, category, body, isActive });
    }
  };

  const insertVariable = (tag: string) => {
    setBody((prev) => prev + tag);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Interested — Schedule Call"
              className="bg-background border-border text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reply Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ReplyCategory)}>
              <SelectTrigger className="bg-background border-border text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_META[c].icon} {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your follow-up message…"
              className="bg-background border-border text-sm min-h-[120px] resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {VARIABLE_HINTS.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => insertVariable(v.tag)}
                  title={v.desc}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  {v.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Only active templates appear in flow rules</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Flow Rule Card (redesigned) ──────────────────────────────────────────────

function FlowRuleCard({
  category,
  rule,
  templates,
  onUpdate,
}: {
  category: ReplyCategory;
  rule?: { id: number; templateId: number | null; autoSend: number } | null;
  templates: { id: number; name: string; body: string; isActive: number }[];
  onUpdate: () => void;
}) {
  const meta = CATEGORY_META[category];
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);

  const upsertMutation = trpc.flowRules.upsert.useMutation({
    onSuccess: () => {
      utils.flowRules.list.invalidate();
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeTemplates = templates.filter((t) => t.isActive === 1);
  const assignedTemplate = templates.find((t) => t.id === rule?.templateId);
  const isAutoSend = rule?.autoSend === 1 && !!rule?.templateId;

  const handleTemplateChange = (templateId: string) => {
    upsertMutation.mutate({
      category,
      templateId: templateId === "none" ? null : Number(templateId),
      autoSend: rule?.autoSend === 1,
    });
  };

  const handleAutoSendToggle = (enabled: boolean) => {
    upsertMutation.mutate({
      category,
      templateId: rule?.templateId ?? null,
      autoSend: enabled,
    });
  };

  return (
    <div className={`rounded-xl border transition-all ${isAutoSend ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card"}`}>
      {/* Main row */}
      <div className="flex items-center gap-4 p-4">
        {/* Category badge */}
        <div className={`flex items-center gap-2 min-w-[170px]`}>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}
          >
            {meta.icon} {category}
          </span>
        </div>

        {/* Arrow */}
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />

        {/* Assigned template selector */}
        <div className="flex-1 min-w-0">
          <Select
            value={rule?.templateId?.toString() ?? "none"}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger className="h-8 text-xs bg-background border-border">
              <SelectValue placeholder="No template assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No template assigned</span>
              </SelectItem>
              {activeTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Auto-send toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={isAutoSend}
            onCheckedChange={handleAutoSendToggle}
            disabled={!rule?.templateId}
          />
          <span className={`text-xs font-medium w-16 ${isAutoSend ? "text-emerald-400" : "text-muted-foreground"}`}>
            {isAutoSend ? "⚡ Auto" : "Manual"}
          </span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? "Collapse" : "Preview flow"}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expanded flow visualization */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-4 space-y-3">
          {/* Trigger examples */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-28 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide pt-1">
              Lead replies with
            </div>
            <div className="flex flex-wrap gap-1.5">
              {meta.triggerExamples.map((ex) => (
                <span
                  key={ex}
                  className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}
                >
                  "{ex}"
                </span>
              ))}
              <span className="text-xs text-muted-foreground/60 self-center">…and similar</span>
            </div>
          </div>

          {/* Arrow connector */}
          <div className="flex items-center gap-2 pl-28">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="h-px w-4 bg-border" />
              <ArrowRight className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wide font-medium">
                {isAutoSend ? "QuoteNudge auto-sends" : "Suggested reply (manual)"}
              </span>
              <div className="h-px w-4 bg-border" />
            </div>
          </div>

          {/* Assigned template preview */}
          {assignedTemplate ? (
            <div className="ml-28 rounded-lg bg-background border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                {assignedTemplate.name}
              </p>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {assignedTemplate.body.slice(0, 200)}{assignedTemplate.body.length > 200 ? "…" : ""}
              </p>
            </div>
          ) : (
            <div className="ml-28 rounded-lg bg-muted/20 border border-dashed border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">No template assigned — select one above to enable this flow</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [activeCategory, setActiveCategory] = useState<ReplyCategory>("Interested");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number;
    name: string;
    category: string;
    body: string;
    isActive: number;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "flows">("library");

  const utils = trpc.useUtils();

  const { data: allTemplates = [], isLoading: templatesLoading } = trpc.flowTemplates.list.useQuery(undefined);
  const { data: flowRules = [], isLoading: rulesLoading } = trpc.flowRules.list.useQuery();

  const seedMutation = trpc.flowTemplates.seed.useMutation({
    onSuccess: () => {
      toast.success("Default templates loaded");
      utils.flowTemplates.list.invalidate();
      utils.flowRules.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.flowTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      utils.flowTemplates.list.invalidate();
      utils.flowRules.list.invalidate();
      setDeleteTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const categoryTemplates = allTemplates.filter((t) => t.category === activeCategory);
  const linkedTemplateIds = new Set(flowRules.map((r) => r.templateId).filter(Boolean));

  const openCreate = () => {
    setEditingTemplate(null);
    setEditorOpen(true);
  };

  const openEdit = (t: typeof editingTemplate) => {
    setEditingTemplate(t);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Template Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage reply templates and configure auto-flow rules for each lead response type.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allTemplates.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="text-xs"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              )}
              Load Defaults
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("library")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "library"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Template Library
        </button>
        <button
          onClick={() => setActiveTab("flows")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            activeTab === "flows"
              ? "bg-card text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-3.5 w-3.5" /> Auto-Flow Rules
        </button>
      </div>

      {/* ── Library Tab ── */}
      {activeTab === "library" && (
        <div className="flex gap-5">
          {/* Category sidebar */}
          <div className="w-52 shrink-0 space-y-1">
            {CATEGORIES.map((cat) => {
              const meta = CATEGORY_META[cat];
              const count = allTemplates.filter((t) => t.category === cat).length;
              const rule = flowRules.find((r) => r.category === cat);
              const isAutoActive = rule?.autoSend === 1 && !!rule?.templateId;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeCategory === cat
                      ? `${meta.bg} ${meta.border} border ${meta.color} font-medium`
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span>{meta.icon}</span>
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    {isAutoActive && (
                      <span title="Auto-flow active" className="flex items-center gap-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        <Zap className="h-2 w-2" /> ON
                      </span>
                    )}
                    {count > 0 && (
                      <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Template cards */}
          <div className="flex-1 min-w-0">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span>{CATEGORY_META[activeCategory].icon}</span>
                    {activeCategory}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {CATEGORY_META[activeCategory].description}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={openCreate} className="text-xs h-7">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : categoryTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 border border-dashed border-border rounded-xl text-center gap-3">
                <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                <div>
                  <p className="text-sm text-muted-foreground">No templates for this category</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Create one or load defaults to get started
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={openCreate} className="text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Create Template
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {categoryTemplates.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isLinked={linkedTemplateIds.has(t.id)}
                    onEdit={() => openEdit(t)}
                    onDelete={() => setDeleteTarget(t.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auto-Flow Rules Tab ── */}
      {activeTab === "flows" && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p>
                When a lead replies, QuoteNudge uses AI to classify the intent and — if <strong className="text-foreground">Auto</strong> is on — instantly sends the assigned template back. Click the <strong className="text-foreground">↓ arrow</strong> on any row to see the full trigger phrases and template preview.
              </p>
              <p className="mt-1.5 text-xs">
                <strong className="text-emerald-400">Interested</strong>, <strong className="text-rose-400">Not Interested</strong>, and <strong className="text-slate-400">Unsubscribe</strong> have auto-send <strong className="text-foreground">enabled by default</strong>.
              </p>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span className="min-w-[170px]">Reply Category</span>
            <span className="w-4" />
            <span className="flex-1">Assigned Template</span>
            <span className="w-28 text-center">Auto-send</span>
            <span className="w-6" />
          </div>

          {rulesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {CATEGORIES.map((cat) => {
                const rule = flowRules.find((r) => r.category === cat);
                return (
                  <FlowRuleCard
                    key={cat}
                    category={cat}
                    rule={rule}
                    templates={allTemplates}
                    onUpdate={() => {}}
                  />
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/20 border border-border/50 mt-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Only <strong className="text-foreground">active</strong> templates appear in the dropdown.
              Auto-send is disabled when no template is assigned. Use the Template Library tab to create and manage templates.
            </p>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      <TemplateEditorModal
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditingTemplate(null);
        }}
        defaultCategory={activeCategory}
        template={editingTemplate}
        onSuccess={() => {
          utils.flowTemplates.list.invalidate();
        }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Template?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This template will be permanently deleted and unlinked from any flow rules. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget !== null && deleteMutation.mutate({ id: deleteTarget })}
              className="bg-rose-600 hover:bg-rose-500 text-white"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
