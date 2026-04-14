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
  ChevronRight,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  Info,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Interested",
  "Not Interested",
  "Wants More Info",
  "Already a Customer",
  "Unsubscribe",
  "Other",
] as const;

type ReplyCategory = (typeof CATEGORIES)[number];

const CATEGORY_META: Record<
  ReplyCategory,
  { color: string; bg: string; border: string; icon: string; description: string }
> = {
  Interested: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: "✅",
    description: "Lead wants to move forward or schedule a call",
  },
  "Not Interested": {
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: "🚫",
    description: "Lead declines or is not interested",
  },
  "Wants More Info": {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: "❓",
    description: "Lead is asking questions or requesting details",
  },
  "Already a Customer": {
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: "⭐",
    description: "Lead is already using your product or service",
  },
  Unsubscribe: {
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icon: "🔕",
    description: "Lead wants to opt out of messages",
  },
  Other: {
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icon: "💬",
    description: "Ambiguous or uncategorized replies",
  },
};

const VARIABLE_HINTS = [
  { tag: "{{name}}", desc: "Lead's full name" },
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
      <div className="flex items-start justify-between gap-2 mb-2 pr-20">
        <h4 className="text-sm font-semibold text-foreground leading-tight">{template.name}</h4>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">
        {preview}
      </p>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-rose-400"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3 mr-1" /> Delete
        </Button>
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
  template?: { id: number; name: string; category: string; body: string; isActive: number } | null;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name ?? "",
    category: (template?.category ?? defaultCategory) as ReplyCategory,
    body: template?.body ?? "",
    isActive: template ? template.isActive === 1 : true,
  });

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
    if (!form.name.trim() || !form.body.trim()) {
      toast.error("Name and message body are required");
      return;
    }
    if (template) {
      updateMutation.mutate({ id: template.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const insertVariable = (tag: string) => {
    setForm((f) => ({ ...f, body: f.body + tag }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {template ? "Edit Template" : "New Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Template Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Interested — Schedule Call"
              className="bg-background border-border"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Reply Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v as ReplyCategory }))}
            >
              <SelectTrigger className="bg-background border-border">
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
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">Message Body</Label>
              <div className="flex items-center gap-1">
                {VARIABLE_HINTS.map(({ tag }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="text-[10px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded hover:bg-primary/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              rows={6}
              placeholder="Hi {{name}}, thanks for getting back to me! ..."
              className="bg-background border-border font-mono text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {form.body.length} characters · Use variable buttons above to insert placeholders
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Inactive templates won't be used in auto-flows</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
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

// ─── Flow Rule Row ────────────────────────────────────────────────────────────

function FlowRuleRow({
  category,
  rule,
  templates,
  onUpdate,
}: {
  category: ReplyCategory;
  rule?: { id: number; templateId: number | null; autoSend: number } | null;
  templates: { id: number; name: string; isActive: number }[];
  onUpdate: () => void;
}) {
  const meta = CATEGORY_META[category];
  const utils = trpc.useUtils();

  const upsertMutation = trpc.flowRules.upsert.useMutation({
    onSuccess: () => {
      utils.flowRules.list.invalidate();
      onUpdate();
    },
    onError: (e) => toast.error(e.message),
  });

  const activeTemplates = templates.filter((t) => t.isActive === 1);

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

  const selectedTemplateId = rule?.templateId?.toString() ?? "none";
  const isAutoSend = rule?.autoSend === 1;

  return (
    <div className="flex items-center gap-4 p-3.5 rounded-xl bg-card border border-border hover:border-border/80 transition-all">
      <div className={`flex items-center gap-2 min-w-[180px]`}>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full border ${meta.bg} ${meta.border} ${meta.color}`}
        >
          {meta.icon} {category}
        </span>
      </div>

      <div className="flex-1">
        <Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
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

      <div className="flex items-center gap-2 shrink-0">
        <Switch
          checked={isAutoSend}
          onCheckedChange={handleAutoSendToggle}
          disabled={!rule?.templateId}
        />
        <span className="text-xs text-muted-foreground w-16">
          {isAutoSend ? (
            <span className="text-emerald-400 font-medium">Auto-send</span>
          ) : (
            "Manual"
          )}
        </span>
      </div>
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
                  {count > 0 && (
                    <span className="text-xs bg-muted/50 px-1.5 py-0.5 rounded-full">{count}</span>
                  )}
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
                When a lead replies to your outreach SMS, QuoteNudge uses AI to classify the reply
                into one of the categories below. If <strong className="text-foreground">Auto-send</strong> is
                enabled for a category, the assigned template is automatically sent back.
              </p>
              <p className="mt-1.5 text-xs">
                Toggle <strong className="text-foreground">Auto-send</strong> off to receive a notification
                instead and send the reply manually from the conversation thread.
              </p>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-4 px-3.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span className="min-w-[180px]">Reply Category</span>
            <span className="flex-1">Assigned Template</span>
            <span className="w-28 text-right">Auto-send</span>
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
                  <FlowRuleRow
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
              Auto-send is disabled when no template is assigned.
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
