import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  GitBranch,
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type BranchStep = {
  id: number;
  sequenceId: number;
  stepNumber: number;
  delayAmount: number;
  delayUnit: "minutes" | "days";
  name: string;
  body: string;
  branchType: "positive" | "negative";
  parentStepId: number;
};

type DripStep = {
  id: number;
  sequenceId: number;
  stepNumber: number;
  delayDays?: number;
  delayAmount: number;
  delayUnit: "minutes" | "days";
  name: string;
  body: string;
  branchType?: string | null;
  parentStepId?: number | null;
  branchSteps?: BranchStep[];
};

type DripSequence = {
  id: number;
  orgId: number;
  name: string;
  triggerCategory: "Interested" | "Wants More Info";
  isActive: number;
  steps: DripStep[];
  createdAt: Date;
  updatedAt: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function smsSegments(text: string) {
  return Math.ceil(text.length / 160) || 1;
}

function totalDuration(steps: DripStep[]): string {
  if (!steps || steps.length === 0) return "No steps";
  let totalMinutes = 0;
  for (const s of steps) {
    const amount = s.delayAmount ?? s.delayDays ?? 0;
    const unit = s.delayUnit ?? "days";
    totalMinutes += unit === "minutes" ? amount : amount * 24 * 60;
  }
  if (totalMinutes < 60) return `${totalMinutes} min span`;
  if (totalMinutes < 24 * 60) return `${Math.round(totalMinutes / 60)} hr span`;
  return `${Math.round(totalMinutes / (24 * 60))} day span`;
}

function renderPreview(body: string, firstName = "Alex", company = "Acme Co") {
  return body
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{company\}\}/g, company)
    .replace(/\{\{link\}\}/g, "https://cal.com/yourname/10min");
}

// ─── Variable Insert Button ───────────────────────────────────────────────────

function VarButton({
  label,
  value,
  onInsert,
}: {
  label: string;
  value: string;
  onInsert: (v: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onInsert(value)}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25 transition-colors font-mono"
    >
      {label}
    </button>
  );
}

// ─── SMS Bubble ───────────────────────────────────────────────────────────────

function SmsBubble({
  body,
  delay,
  unit,
  stepNum,
  branchType,
}: {
  body: string;
  delay: number;
  unit: string;
  stepNum: number;
  branchType?: "positive" | "negative" | null;
}) {
  const preview = renderPreview(body);
  const delayLabel = delay === 0 ? "Immediately" : `After ${delay} ${unit}`;
  const bubbleColor = branchType === "positive"
    ? "bg-emerald-600"
    : branchType === "negative"
    ? "bg-amber-600"
    : "bg-[#1a8cff]";

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs text-muted-foreground self-start flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {branchType ? (
          <span className={`font-medium ${branchType === "positive" ? "text-emerald-400" : "text-amber-400"}`}>
            {branchType === "positive" ? "✓ Positive reply" : "✗ Negative reply"} 
          </span>
        ) : (
          <span>Step {stepNum} </span>
        )}
        {" "}{delayLabel}
      </span>
      <div className={`max-w-[220px] ${bubbleColor} text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm shadow-sm leading-snug`}>
        {preview || <span className="opacity-50 italic">Your message here…</span>}
      </div>
    </div>
  );
}

// ─── Step Editor (inline) ─────────────────────────────────────────────────────

function StepEditor({
  step,
  sequenceId,
  nextStepNumber,
  branchType,
  parentStepId,
  onSaved,
  onDeleted,
  sequenceName,
  triggerCategory,
  previousSteps,
}: {
  step?: DripStep | BranchStep;
  sequenceId: number;
  nextStepNumber?: number;
  branchType?: "positive" | "negative";
  parentStepId?: number;
  onSaved: () => void;
  onDeleted?: () => void;
  sequenceName?: string;
  triggerCategory?: string;
  previousSteps?: { stepNumber: number; name: string; body: string; delayAmount: number; delayUnit: string }[];
}) {
  const isNew = !step || step.id === 0;
  const [name, setName] = useState(isNew ? "" : step.name);
  const [body, setBody] = useState(isNew ? "" : step.body);
  const [delayAmount, setDelayAmount] = useState(
    isNew ? (nextStepNumber === 1 ? 0 : 3) : (step.delayAmount ?? 3)
  );
  const [delayUnit, setDelayUnit] = useState<"minutes" | "days">(
    isNew ? "days" : (step.delayUnit ?? "days")
  );
  const stepNumber = isNew ? (nextStepNumber ?? 1) : step!.stepNumber;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const utils = trpc.useUtils();
  const upsert = trpc.drip.upsertStep.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      onSaved();
      toast.success(isNew ? "Step added" : "Step saved");
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.drip.deleteStep.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      onDeleted?.();
      toast.success("Step deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateAI = trpc.drip.generateNextStep.useMutation({
    onSuccess: (data) => {
      setBody(data.body);
      toast.success("Message generated!", { description: "Feel free to edit before saving." });
    },
    onError: (e) => toast.error("AI generation failed: " + e.message),
  });

  function handleGenerate() {
    generateAI.mutate({
      sequenceName: sequenceName ?? "Drip Sequence",
      triggerCategory: triggerCategory ?? "Interested",
      stepNumber,
      previousSteps: previousSteps ?? [],
    });
  }

  function insertVar(v: string) {
    const el = textareaRef.current;
    if (!el) { setBody((b) => b + v); return; }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + v + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + v.length, start + v.length);
    });
  }

  const chars = body.length;
  const segments = smsSegments(body);

  const borderColor = branchType === "positive"
    ? "border-emerald-500/40 bg-emerald-500/5"
    : branchType === "negative"
    ? "border-amber-500/40 bg-amber-500/5"
    : "border-border bg-muted/20";

  return (
    <div className={`space-y-3 p-4 rounded-xl border ${borderColor}`}>
      {branchType && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${branchType === "positive" ? "text-emerald-400" : "text-amber-400"}`}>
          {branchType === "positive" ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
          {branchType === "positive" ? "Positive Reply Branch" : "Negative Reply Branch"}
          <span className="text-muted-foreground font-normal ml-1"> sent when lead replies {branchType === "positive" ? "positively (e.g. Yes, Interested)" : "negatively (e.g. Not now, Maybe later)"}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Step Label</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={branchType === "positive" ? "e.g. Book a Call" : "e.g. Soft Exit"}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1">
            Send After
            {stepNumber === 1 && !branchType && (
              <span className="text-muted-foreground font-normal">(0 = immediately)</span>
            )}
          </Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              value={delayAmount}
              onChange={(e) => setDelayAmount(parseInt(e.target.value) || 0)}
              className="h-8 text-sm w-20"
            />
            <Select value={delayUnit} onValueChange={(v) => setDelayUnit(v as "minutes" | "days")}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Message</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs gap-1 border-violet-500/40 text-violet-300 hover:bg-violet-500/10"
              onClick={handleGenerate}
              disabled={generateAI.isPending}
            >
              {generateAI.isPending ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Crafting…</>
              ) : body ? (
                <><RefreshCw className="h-3 w-3" /> Regenerate</>
              ) : (
                <><Sparkles className="h-3 w-3" /> Generate with AI</>
              )}
            </Button>
            <span className={`text-xs ${chars > 160 ? "text-amber-400" : "text-muted-foreground"}`}>
              {chars} chars · {segments} SMS segment{segments !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={
            branchType === "positive"
              ? "Great! Here's my calendar link to grab a quick 10-min call: {{link}}"
              : branchType === "negative"
              ? "No worries at all, {{firstName}}! If anything changes, here's my link: {{link}}"
              : "Hi {{firstName}}, just following up…"
          }
          rows={3}
          className="text-sm resize-none"
        />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Insert:</span>
          <VarButton label="{{firstName}}" value="{{firstName}}" onInsert={insertVar} />
          <VarButton label="{{company}}" value="{{company}}" onInsert={insertVar} />
          <VarButton label="{{link}}" value="{{link}}" onInsert={insertVar} />
        </div>
      </div>

      {body && (
        <div className="rounded-lg bg-muted/10 border border-border p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-medium">Preview (sample data)</p>
          <p className="text-sm text-foreground leading-snug">{renderPreview(body)}</p>
        </div>
      )}

      <div className="flex justify-between items-center pt-1">
        {step && step.id !== 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-7 px-2"
            onClick={() => del.mutate({ id: step.id })}
            disabled={del.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>
        )}
        <Button
          size="sm"
          className="ml-auto h-7"
          disabled={!name || !body || upsert.isPending}
          onClick={() =>
            upsert.mutate({
              sequenceId,
              stepNumber,
              delayAmount,
              delayUnit,
              name,
              body,
              ...(step?.id && step.id !== 0 ? { id: step.id } : {}),
              ...(branchType ? { branchType, parentStepId } : {}),
            })
          }
        >
          {upsert.isPending ? "Saving…" : isNew ? "Add Step" : "Save Step"}
        </Button>
      </div>
    </div>
  );
}

// ─── Branch Fork Display ──────────────────────────────────────────────────────

function BranchFork({
  step,
  sequenceId,
}: {
  step: DripStep;
  sequenceId: number;
}) {
  const [editingBranch, setEditingBranch] = useState<"positive" | "negative" | null>(null);
  const positiveBranch = step.branchSteps?.find((b) => b.branchType === "positive");
  const negativeBranch = step.branchSteps?.find((b) => b.branchType === "negative");
  const hasBranches = positiveBranch || negativeBranch;

  if (!hasBranches && !step.branchSteps) return null;

  return (
    <div className="ml-10 mt-1 mb-2 space-y-2">
      {/* Fork indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <GitBranch className="h-3.5 w-3.5" />
        <span>Lead replies → A/B branch</span>
      </div>

      {/* Positive branch */}
      <div className="border-l-2 border-emerald-500/40 pl-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <ThumbsUp className="h-3 w-3" />
          Positive reply (Yes / Interested / Sure)
        </div>
        {positiveBranch ? (
          <div>
            <div
              className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-colors"
              onClick={() => setEditingBranch(editingBranch === "positive" ? null : "positive")}
            >
              <p className="text-xs font-medium text-foreground">{positiveBranch.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{positiveBranch.body}</p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                {positiveBranch.delayAmount} {positiveBranch.delayUnit}
              </p>
            </div>
            {editingBranch === "positive" && (
              <div className="mt-2">
                <StepEditor
                  step={positiveBranch as unknown as DripStep}
                  sequenceId={sequenceId}
                  branchType="positive"
                  parentStepId={step.id}
                  onSaved={() => setEditingBranch(null)}
                  onDeleted={() => setEditingBranch(null)}
                />
              </div>
            )}
          </div>
        ) : (
          editingBranch === "positive" ? (
            <StepEditor
              sequenceId={sequenceId}
              nextStepNumber={step.stepNumber}
              branchType="positive"
              parentStepId={step.id}
              onSaved={() => setEditingBranch(null)}
            />
          ) : (
            <button
              onClick={() => setEditingBranch("positive")}
              className="text-xs text-emerald-400/60 hover:text-emerald-400 flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add positive reply message
            </button>
          )
        )}
      </div>

      {/* Negative branch */}
      <div className="border-l-2 border-amber-500/40 pl-3 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
          <ThumbsDown className="h-3 w-3" />
          Negative reply (Not now / Maybe later / No)
        </div>
        {negativeBranch ? (
          <div>
            <div
              className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-colors"
              onClick={() => setEditingBranch(editingBranch === "negative" ? null : "negative")}
            >
              <p className="text-xs font-medium text-foreground">{negativeBranch.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{negativeBranch.body}</p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">
                <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                {negativeBranch.delayAmount} {negativeBranch.delayUnit}
              </p>
            </div>
            {editingBranch === "negative" && (
              <div className="mt-2">
                <StepEditor
                  step={negativeBranch as unknown as DripStep}
                  sequenceId={sequenceId}
                  branchType="negative"
                  parentStepId={step.id}
                  onSaved={() => setEditingBranch(null)}
                  onDeleted={() => setEditingBranch(null)}
                />
              </div>
            )}
          </div>
        ) : (
          editingBranch === "negative" ? (
            <StepEditor
              sequenceId={sequenceId}
              nextStepNumber={step.stepNumber}
              branchType="negative"
              parentStepId={step.id}
              onSaved={() => setEditingBranch(null)}
            />
          ) : (
            <button
              onClick={() => setEditingBranch("negative")}
              className="text-xs text-amber-400/60 hover:text-amber-400 flex items-center gap-1 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add negative reply message
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({ seq, onDeleted }: { seq: DripSequence; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const [editingDelayId, setEditingDelayId] = useState<number | null>(null);
  const [delayEditAmount, setDelayEditAmount] = useState(0);
  const [delayEditUnit, setDelayEditUnit] = useState<"minutes" | "days">("days");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(seq.name);
  const [abTestOpen, setAbTestOpen] = useState(false);
  const [abVariantName, setAbVariantName] = useState(`${seq.name} Variant B`);
  const utils = trpc.useUtils();

  const upsertStep = trpc.drip.upsertStep.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      setEditingDelayId(null);
    },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.drip.deleteSequence.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      onDeleted();
      toast.success("Sequence deleted");
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleActive = trpc.drip.updateSequence.useMutation({
    onSuccess: () => utils.drip.listSequences.invalidate(),
    onError: (e) => toast.error(e.message),
  });
  const rename = trpc.drip.updateSequence.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      setRenaming(false);
      toast.success("Sequence renamed");
    },
    onError: (e) => toast.error(e.message),
  });
  const clone = trpc.drip.cloneSequence.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      toast.success(`"${seq.name}" cloned successfully!`, {
        description: "A copy has been added below. You can now rename and edit it.",
        duration: 4000,
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const abTest = trpc.drip.cloneSequence.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      setAbTestOpen(false);
      toast.success(`A/B Variant created!`, {
        description: `"${abVariantName}" has been added below. Edit it to test a different approach, then compare reply rates.`,
        duration: 5000,
      });
    },
    onError: (e) => toast.error(e.message),
  });

  const isInterested = seq.triggerCategory === "Interested";
  const categoryColor = isInterested
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-blue-500/15 text-blue-300 border-blue-500/30";
  const nextStepNumber = (seq.steps?.length ?? 0) + 1;
  const duration = totalDuration(seq.steps ?? []);
  const hasBranches = seq.steps?.some((s) => s.branchSteps && s.branchSteps.length > 0);

  return (
    <div className={`border rounded-xl overflow-hidden bg-card transition-all ${seq.isActive ? "border-border" : "border-border/50 opacity-70"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isInterested ? "bg-emerald-500/15" : "bg-blue-500/15"}`}>
          <Zap className={`h-4 w-4 ${isInterested ? "text-emerald-400" : "text-blue-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); rename.mutate({ id: seq.id, name: renameValue }); }}
            >
              <input
                autoFocus
                className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setRenaming(false); }}
              />
              <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={rename.isPending}>Save</Button>
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRenaming(false)}>Cancel</Button>
            </form>
          ) : (
            <p className="font-semibold text-foreground truncate">{seq.name}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColor}`}>
              {seq.triggerCategory}
            </span>
            <span className="text-xs text-muted-foreground">
              {seq.steps?.length ?? 0} step{(seq.steps?.length ?? 0) !== 1 ? "s" : ""}
            </span>
            {(seq.steps?.length ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration}
              </span>
            )}
            {hasBranches && (
              <span className="inline-flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                <GitBranch className="h-3 w-3" />
                A/B branches
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">{seq.isActive ? "Active" : "Paused"}</span>
            <Switch
              checked={!!seq.isActive}
              onCheckedChange={(v) => toggleActive.mutate({ id: seq.id, isActive: v })}
            />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setRenameValue(seq.name); setRenaming(true); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rename</TooltipContent>
            </Tooltip>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => clone.mutate({ id: seq.id })}
              disabled={clone.isPending}
            >
              <Copy className="h-3.5 w-3.5" />
              Clone
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
              onClick={() => { setAbVariantName(`${seq.name} Variant B`); setAbTestOpen(true); }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              A/B Test
            </Button>
          </TooltipProvider>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded: timeline + editor */}
      {expanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border">
            {/* Left: step builder */}
            <div className="px-5 py-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Steps</p>

              {seq.steps && seq.steps.length > 0 ? (
                <div className="relative space-y-0">
                  <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" />
                  {seq.steps.map((step, idx) => (
                    <div key={step.id} className="relative">
                      <div
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                      >
                        <div className="h-7 w-7 rounded-full bg-card border-2 border-violet-500/50 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0 z-10">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground">{step.name}</p>
                            {editingDelayId === step.id ? (
                              <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  type="number"
                                  min={0}
                                  value={delayEditAmount}
                                  onChange={(e) => setDelayEditAmount(parseInt(e.target.value) || 0)}
                                  className="h-6 w-14 text-xs px-1.5 py-0"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      upsertStep.mutate({ id: step.id, sequenceId: seq.id, stepNumber: step.stepNumber, delayAmount: delayEditAmount, delayUnit: delayEditUnit, name: step.name, body: step.body });
                                    }
                                    if (e.key === "Escape") setEditingDelayId(null);
                                  }}
                                />
                                <Select value={delayEditUnit} onValueChange={(v) => setDelayEditUnit(v as "minutes" | "days")}>
                                  <SelectTrigger className="h-6 w-24 text-xs px-1.5">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minutes">Minutes</SelectItem>
                                    <SelectItem value="days">Days</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="sm" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); upsertStep.mutate({ id: step.id, sequenceId: seq.id, stepNumber: step.stepNumber, delayAmount: delayEditAmount, delayUnit: delayEditUnit, name: step.name, body: step.body }); }} disabled={upsertStep.isPending}>
                                  {upsertStep.isPending ? "…" : "Save"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 px-1 text-xs" onClick={(e) => { e.stopPropagation(); setEditingDelayId(null); }}>✕</Button>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/50 hover:text-foreground transition-colors"
                                title="Click to edit delay"
                                onClick={(e) => { e.stopPropagation(); setDelayEditAmount(step.delayAmount ?? step.delayDays ?? 0); setDelayEditUnit((step.delayUnit ?? "days") as "minutes" | "days"); setEditingDelayId(step.id); }}
                              >
                                <Clock className="h-3 w-3" />
                                {step.delayAmount ?? step.delayDays} {step.delayUnit ?? "days"}
                                <Pencil className="h-2.5 w-2.5 opacity-50" />
                              </span>
                            )}
                            {step.branchSteps && step.branchSteps.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded">
                                <GitBranch className="h-3 w-3" />
                                {step.branchSteps.length} branch{step.branchSteps.length !== 1 ? "es" : ""}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{step.body}</p>
                        </div>
                      </div>

                      {editingStepId === step.id && (
                        <div className="ml-10 mb-2">
                          <StepEditor
                            step={step}
                            sequenceId={seq.id}
                            onSaved={() => setEditingStepId(null)}
                            onDeleted={() => setEditingStepId(null)}
                            sequenceName={seq.name}
                            triggerCategory={seq.triggerCategory ?? "Interested"}
                            previousSteps={(seq.steps ?? []).filter((s) => s.stepNumber < step.stepNumber).map((s) => ({ stepNumber: s.stepNumber, name: s.name, body: s.body, delayAmount: s.delayAmount ?? 0, delayUnit: s.delayUnit ?? "days" }))}
                          />
                        </div>
                      )}

                      {/* A/B Branch Fork */}
                      <BranchFork step={step} sequenceId={seq.id} />

                      {idx < seq.steps.length - 1 && (
                        <div className="flex items-center gap-2 ml-10 my-1">
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground/50">
                            then wait {seq.steps[idx + 1].delayAmount ?? seq.steps[idx + 1].delayDays} {seq.steps[idx + 1].delayUnit ?? "days"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground border border-dashed border-border rounded-lg">
                  <MessageSquare className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No steps yet</p>
                  <p className="text-xs mt-0.5 opacity-70">Add your first follow-up message below</p>
                </div>
              )}

              {addingStep ? (
                <StepEditor
                  sequenceId={seq.id}
                  nextStepNumber={nextStepNumber}
                  onSaved={() => setAddingStep(false)}
                  sequenceName={seq.name}
                  triggerCategory={seq.triggerCategory ?? "Interested"}
                  previousSteps={(seq.steps ?? []).map((s) => ({ stepNumber: s.stepNumber, name: s.name, body: s.body, delayAmount: s.delayAmount ?? 0, delayUnit: s.delayUnit ?? "days" }))}
                />
              ) : (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingStep(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Step
                </Button>
              )}

              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => del.mutate({ id: seq.id })}
                  disabled={del.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete Sequence
                </Button>
              </div>
            </div>

            {/* Right: lead's view */}
            <div className="px-5 py-4 space-y-3 bg-muted/5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Lead's View
              </p>
              {seq.steps && seq.steps.length > 0 ? (
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {seq.steps.map((step, idx) => (
                    <div key={step.id} className="space-y-2">
                      <SmsBubble
                        body={step.body}
                        delay={step.delayAmount ?? step.delayDays ?? 0}
                        unit={step.delayUnit ?? "days"}
                        stepNum={step.stepNumber}
                      />

                      {/* Show A/B branches in preview */}
                      {step.branchSteps && step.branchSteps.length > 0 && (
                        <div className="ml-2 pl-3 border-l-2 border-violet-500/20 space-y-2">
                          <p className="text-xs text-violet-300/60 flex items-center gap-1">
                            <GitBranch className="h-3 w-3" /> Lead replies…
                          </p>
                          {step.branchSteps.map((branch) => (
                            <SmsBubble
                              key={branch.id}
                              body={branch.body}
                              delay={branch.delayAmount}
                              unit={branch.delayUnit}
                              stepNum={step.stepNumber}
                              branchType={branch.branchType}
                            />
                          ))}
                        </div>
                      )}

                      {idx < seq.steps.length - 1 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50 pl-2">
                          <ArrowDown className="h-3 w-3" />
                          <span>
                            {seq.steps[idx + 1].delayAmount ?? seq.steps[idx + 1].delayDays} {seq.steps[idx + 1].delayUnit ?? "days"} pass…
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-1">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Sequence ends or stops early if lead replies
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground/40 text-sm">
                  <MessageSquare className="h-8 w-8 mb-2" />
                  Add steps to see the lead's view
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* A/B Test Modal */}
      <Dialog open={abTestOpen} onOpenChange={setAbTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              Create A/B Test Variant
            </DialogTitle>
            <DialogDescription>
              A copy of <span className="font-medium text-foreground">"{seq.name}"</span> will be created. Rename it, then tweak one thing tone, timing, or CTA and compare reply rates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Variant Name</Label>
              <Input
                autoFocus
                value={abVariantName}
                onChange={(e) => setAbVariantName(e.target.value)}
                placeholder={`${seq.name} Variant B`}
                className="text-sm"
              />
            </div>

            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" /> What to change in your variant
              </p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">→</span> <span><strong className="text-foreground">Tone:</strong> Try casual vs. professional, or short vs. detailed</span></li>
                <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">→</span> <span><strong className="text-foreground">Timing:</strong> Adjust delays e.g. same day vs. 3 days later</span></li>
                <li className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">→</span> <span><strong className="text-foreground">CTA:</strong> "Reply YES" vs. "Click my link" vs. "Call me"</span></li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setAbTestOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
              onClick={() => abTest.mutate({ id: seq.id, name: abVariantName || `${seq.name} Variant B` })}
              disabled={abTest.isPending || !abVariantName.trim()}
            >
              {abTest.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creating…</> : <><Sparkles className="h-3.5 w-3.5" /> Create Variant</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Quick Start Templates ─────────────────────────────────────────────────────

const QUICK_STARTS = [
  {
    label: "Insurance Agent Form Lead",
    icon: "🛡️",
    description: "Thank form fill → A/B branch on reply",
    steps: [
      { name: "Thank You + Availability Ask", delayAmount: 0, delayUnit: "days" as const, body: "Hi {{firstName}}, thanks so much for filling out the form! I'd love to connect is Monday a good time for a quick 10-min call? Just reply YES or let me know what works!" },
    ],
  },
  {
    label: "3-Step Follow-up",
    icon: "🚀",
    description: "Immediate + Day 3 + Day 7",
    steps: [
      { name: "Immediate Follow-up", delayAmount: 0, delayUnit: "days" as const, body: "Hi {{firstName}}, thanks for your interest! I'd love to get you a quote. When's a good time to connect?" },
      { name: "Day 3 Check-in", delayAmount: 3, delayUnit: "days" as const, body: "Hey {{firstName}}, just circling back did you get a chance to think about your quote? Happy to answer any questions." },
      { name: "Day 7 Final", delayAmount: 7, delayUnit: "days" as const, body: "Hi {{firstName}}, last follow-up from me. If you're still interested, I'm here to help. Just reply and I'll get you taken care of!" },
    ],
  },
  {
    label: "5-Day Nurture",
    icon: "🌱",
    description: "Day 1 + Day 3 + Day 5",
    steps: [
      { name: "Day 1 Intro", delayAmount: 1, delayUnit: "days" as const, body: "Hi {{firstName}}, I wanted to share a bit more about what we offer. Would love to walk you through it reply anytime!" },
      { name: "Day 3 Value", delayAmount: 3, delayUnit: "days" as const, body: "Hey {{firstName}}, here's a quick link to see what others are saying: {{link}} let me know if you have questions!" },
      { name: "Day 5 CTA", delayAmount: 5, delayUnit: "days" as const, body: "Hi {{firstName}}, ready to move forward? Just reply YES and I'll get your quote ready within the hour." },
    ],
  },
  {
    label: "Quick Minute Drip",
    icon: "⚡",
    description: "5 min + 30 min + 2 hr",
    steps: [
      { name: "5 Min Follow-up", delayAmount: 5, delayUnit: "minutes" as const, body: "Hi {{firstName}}, just wanted to make sure you got my last message. I'm standing by to help any questions?" },
      { name: "30 Min Check-in", delayAmount: 30, delayUnit: "minutes" as const, body: "Hey {{firstName}}, still here if you need me! Takes just 2 minutes to get your quote started." },
      { name: "2 Hr Final", delayAmount: 120, delayUnit: "minutes" as const, body: "Hi {{firstName}}, I'll leave the door open whenever you're ready, just reply and I'll take care of you right away." },
    ],
  },
];

// ─── Create Wizard ────────────────────────────────────────────────────────────

function CreateWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Interested" | "Wants More Info">("Interested");
  const [quickStart, setQuickStart] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const upsertStep = trpc.drip.upsertStep.useMutation();

  const create = trpc.drip.createSequence.useMutation({
    onSuccess: async (seq) => {
      utils.drip.listSequences.invalidate();
      if (quickStart !== null && seq) {
        const qs = QUICK_STARTS[quickStart];
        for (let i = 0; i < qs.steps.length; i++) {
          const s = qs.steps[i];
          await upsertStep.mutateAsync({
            sequenceId: (seq as unknown as { id: number }).id,
            stepNumber: i + 1,
            name: s.name,
            delayAmount: s.delayAmount,
            delayUnit: s.delayUnit,
            body: s.body,
          });
        }
      }
      toast.success("Sequence created!");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">New Drip Sequence</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">×</button>
          </div>
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
                <span className={`text-xs ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s === 1 ? "Setup" : "Quick Start"}
                </span>
                {s < 2 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label className="font-medium">Sequence Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Insurance Form Lead Follow-up"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Give it a name you'll recognize later.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-1.5">
                  Trigger When should this drip start?
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        When a lead replies to your initial outreach, the AI reads their message and decides if they're <strong>Interested</strong> (positive, wants to proceed) or <strong>Wants More Info</strong> (curious but not committed yet). Pick the one this sequence should respond to.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["Interested", "Wants More Info"] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl border text-left transition-all ${category === cat ? "border-violet-500 bg-violet-500/10" : "border-border bg-muted/10 hover:bg-muted/20"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`h-2 w-2 rounded-full ${cat === "Interested" ? "bg-emerald-400" : "bg-blue-400"}`} />
                        <span className="text-sm font-medium text-foreground">{cat}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-snug">
                        {cat === "Interested"
                          ? "Lead replied positively ready to move forward or get a quote."
                          : "Lead is curious but wants details before committing."}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground mb-0.5">Choose a Quick Start (optional)</p>
                <p className="text-xs text-muted-foreground">Pre-fill your sequence with a proven follow-up pattern, or skip to build from scratch.</p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {QUICK_STARTS.map((qs, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setQuickStart(quickStart === i ? null : i)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${quickStart === i ? "border-violet-500 bg-violet-500/10" : "border-border bg-muted/10 hover:bg-muted/20"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{qs.icon}</span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{qs.label}</p>
                          <p className="text-xs text-muted-foreground">{qs.description}</p>
                        </div>
                      </div>
                      {quickStart === i && <Check className="h-4 w-4 text-violet-400 shrink-0" />}
                    </div>
                    {quickStart === i && (
                      <div className="mt-2 space-y-1">
                        {qs.steps.map((s, si) => (
                          <div key={si} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="h-4 w-4 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 font-bold text-[10px]">{si + 1}</span>
                            <span><strong>{s.name}</strong> {s.delayAmount} {s.delayUnit} delay</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuickStart(null)}
                  className={`w-full p-3 rounded-xl border text-left transition-all ${quickStart === null ? "border-violet-500 bg-violet-500/10" : "border-border bg-muted/10 hover:bg-muted/20"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✏️</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">Start from Scratch</p>
                      <p className="text-xs text-muted-foreground">Build your own steps after creating</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex justify-between gap-3">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button disabled={!name} onClick={() => setStep(2)}>
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button
                disabled={create.isPending}
                onClick={() => create.mutate({ name, triggerCategory: category })}
              >
                {create.isPending ? "Creating…" : quickStart !== null ? `Create with ${QUICK_STARTS[quickStart].label}` : "Create Sequence"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DripPage() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const { data: sequences = [], isLoading } = trpc.drip.listSequences.useQuery();
  const utils = trpc.useUtils();

  const interestedSeqs = sequences.filter((s) => s.triggerCategory === "Interested");
  const wantsMoreSeqs = sequences.filter((s) => s.triggerCategory === "Wants More Info");

  return (
    <TooltipProvider>
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Text Drip Sequences</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Build automated follow-up sequences that trigger when the AI detects a lead's intent.
              Each sequence sends messages on your schedule and stops the moment a lead replies.
            </p>
          </div>
          <Button onClick={() => setWizardOpen(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            New Sequence
          </Button>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-violet-300 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4" /> How the full flow works
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { icon: <MessageSquare className="h-4 w-4" />, label: "Lead replies to outreach" },
              { icon: <Zap className="h-4 w-4" />, label: "AI classifies intent" },
              { icon: <ArrowRight className="h-4 w-4" />, label: "Auto-Flow sends instant reply" },
              { icon: <User className="h-4 w-4" />, label: "Lead enrolled in drip" },
              { icon: <GitBranch className="h-4 w-4" />, label: "A/B branch on reply" },
              { icon: <Check className="h-4 w-4 text-emerald-400" />, label: "Stops on reply or opt-out", highlight: true },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center text-center gap-1.5 p-2 rounded-lg text-xs ${item.highlight ? "bg-emerald-500/10 text-emerald-300" : "bg-muted/20 text-muted-foreground"}`}>
                {item.icon}
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
            <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No drip sequences yet</p>
            <p className="text-xs mt-1 max-w-xs mx-auto">
              Create your first sequence to start sending automated follow-ups when leads show interest.
            </p>
            <Button className="mt-4" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Sequence
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {interestedSeqs.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-sm font-semibold text-foreground">Interested</span>
                  <span className="text-xs text-muted-foreground"> lead replied positively</span>
                  <Badge variant="outline" className="text-xs ml-auto">{interestedSeqs.length} sequence{interestedSeqs.length !== 1 ? "s" : ""}</Badge>
                </div>
                {interestedSeqs.map((seq) => (
                  <SequenceCard key={seq.id} seq={seq as unknown as DripSequence} onDeleted={() => utils.drip.listSequences.invalidate()} />
                ))}
              </section>
            )}
            {wantsMoreSeqs.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-semibold text-foreground">Wants More Info</span>
                  <span className="text-xs text-muted-foreground"> lead is curious, not committed</span>
                  <Badge variant="outline" className="text-xs ml-auto">{wantsMoreSeqs.length} sequence{wantsMoreSeqs.length !== 1 ? "s" : ""}</Badge>
                </div>
                {wantsMoreSeqs.map((seq) => (
                  <SequenceCard key={seq.id} seq={seq as unknown as DripSequence} onDeleted={() => utils.drip.listSequences.invalidate()} />
                ))}
              </section>
            )}
          </div>
        )}

        {wizardOpen && <CreateWizard onClose={() => { setWizardOpen(false); utils.drip.listSequences.invalidate(); }} />}

        {/* ─── A/B Test Lightbulb Tip ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-300">Pro Tip: A/B Test Your Message Styles</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              It's a great idea to A/B test what message styles work best for your leads. Clone a sequence below, tweak the tone or timing, then compare reply rates. Clone, edit, and measure the results!
            </p>
          </div>
        </div>

        {/* ─── Embedded Template Library ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">Template Library</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <EmbeddedLibrary />
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Embedded Template Library ───────────────────────────────────────────────



const LIB_CATEGORIES = ["Interested", "Not Interested", "Wants More Info", "Unsubscribe"] as const;
type LibCategory = (typeof LIB_CATEGORIES)[number];

const LIB_CATEGORY_META: Record<LibCategory, { color: string; bg: string; border: string; icon: string }> = {
  Interested: { color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "✅" },
  "Not Interested": { color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20", icon: "❌" },
  "Wants More Info": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "🤔" },
  Unsubscribe: { color: "text-muted-foreground", bg: "bg-muted/20", border: "border-border", icon: "🚫" },
};

function EmbeddedLibrary() {
  const [activeCategory, setActiveCategory] = useState<LibCategory>("Interested");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{ id: number; name: string; category: string; body: string; isActive: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: allTemplates = [], isLoading } = trpc.flowTemplates.list.useQuery(undefined);
  const { data: flowRules = [] } = trpc.flowRules.list.useQuery();

  const seedMutation = trpc.flowTemplates.seed.useMutation({
    onSuccess: () => { toast.success("Default templates loaded"); utils.flowTemplates.list.invalidate(); utils.flowRules.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.flowTemplates.delete.useMutation({
    onSuccess: () => { toast.success("Template deleted"); utils.flowTemplates.list.invalidate(); utils.flowRules.list.invalidate(); setDeleteTarget(null); },
    onError: (e) => toast.error(e.message),
  });

  const categoryTemplates = allTemplates.filter((t) => t.category === activeCategory);
  const linkedTemplateIds = new Set(flowRules.map((r) => r.templateId).filter(Boolean));

  return (
    <div className="space-y-5">
      {/* Category tabs + actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1 bg-muted/30 border border-border rounded-lg p-1 flex-wrap">
          {LIB_CATEGORIES.map((cat) => {
            const meta = LIB_CATEGORY_META[cat];
            const count = allTemplates.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeCategory === cat ? "bg-card text-foreground shadow-sm border border-border" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{meta.icon}</span>
                <span>{cat}</span>
                {count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          {allTemplates.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="text-xs">
              {seedMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Load Defaults
            </Button>
          )}
          <Button size="sm" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> New Template
          </Button>
        </div>
      </div>

      {/* Template list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : categoryTemplates.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No templates for {activeCategory} yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Template
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {categoryTemplates.map((t) => {
            const isLinked = linkedTemplateIds.has(t.id);
            const meta = LIB_CATEGORY_META[activeCategory];
            const expanded = expandedId === t.id;
            return (
              <div key={t.id} className="border border-border rounded-xl bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`h-8 w-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 text-sm`}>{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                      {isLinked && (
                        <span className="inline-flex items-center gap-1 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                          <Zap className="h-3 w-3" /> Auto-Flow
                        </span>
                      )}
                      {!t.isActive && (
                        <span className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {!expanded && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.body}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingTemplate(t); setEditorOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedId(expanded ? null : t.id)}>
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-border px-4 py-3 bg-muted/5">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{t.body}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Template Editor Modal */}
      <EmbeddedTemplateEditor
        open={editorOpen}
        defaultCategory={activeCategory}
        template={editingTemplate}
        onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
        onSuccess={() => { utils.flowTemplates.list.invalidate(); }}
      />

      {/* Delete Confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Template?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This template will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget !== null && deleteMutation.mutate({ id: deleteTarget })} className="bg-rose-600 hover:bg-rose-500 text-white">
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmbeddedTemplateEditor({
  open,
  defaultCategory,
  template,
  onClose,
  onSuccess,
}: {
  open: boolean;
  defaultCategory: string;
  template: { id: number; name: string; category: string; body: string; isActive: number } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState(template?.category ?? defaultCategory);
  const [body, setBody] = useState(template?.body ?? "");
  const [isActive, setIsActive] = useState(template?.isActive !== 0);
  const utils = trpc.useUtils();

  const createMutation = trpc.flowTemplates.create.useMutation({
    onSuccess: () => { toast.success("Template created"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.flowTemplates.update.useMutation({
    onSuccess: () => { toast.success("Template updated"); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  // Reset form when template changes
  const prevTemplate = useRef(template);
  if (prevTemplate.current !== template) {
    prevTemplate.current = template;
    setName(template?.name ?? "");
    setCategory(template?.category ?? defaultCategory);
    setBody(template?.body ?? "");
    setIsActive(template?.isActive !== 0);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (template) {
      updateMutation.mutate({ id: template.id, name, category: category as any, body, isActive: isActive });
    } else {
      createMutation.mutate({ name, category: category as any, body, isActive: isActive });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground">{template ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warm Follow-Up" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-foreground">Message Body</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {name}, just following up…" rows={4} required />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label className="text-sm text-foreground">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {template ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
