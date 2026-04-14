import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  MessageSquare,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  User,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DripStep = {
  id: number;
  sequenceId: number;
  stepNumber: number;
  delayDays: number;
  delayAmount: number;
  delayUnit: "minutes" | "days";
  name: string;
  body: string;
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
    .replace(/\{\{link\}\}/g, "https://quotenudge.com/quote/abc123");
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

function SmsBubble({ body, delay, unit, stepNum }: { body: string; delay: number; unit: string; stepNum: number }) {
  const preview = renderPreview(body);
  const delayLabel = delay === 0 ? "Immediately" : `After ${delay} ${unit}`;
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-xs text-muted-foreground self-start flex items-center gap-1">
        <Clock className="h-3 w-3" /> Step {stepNum} — {delayLabel}
      </span>
      <div className="max-w-[220px] bg-[#1a8cff] text-white text-sm px-3 py-2 rounded-2xl rounded-tr-sm shadow-sm leading-snug">
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
  onSaved,
  onDeleted,
}: {
  step?: DripStep;
  sequenceId: number;
  nextStepNumber?: number;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const isNew = !step || step.id === 0;
  const [name, setName] = useState(isNew ? "" : step.name);
  const [body, setBody] = useState(isNew ? "" : step.body);
  const [delayAmount, setDelayAmount] = useState(
    isNew ? (nextStepNumber === 1 ? 0 : 3) : (step.delayAmount ?? step.delayDays ?? 3)
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

  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-xl border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Step Label</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`e.g. Follow-up ${stepNumber}`}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium flex items-center gap-1">
            Send After
            {stepNumber === 1 && (
              <span className="text-muted-foreground font-normal">(0 = send immediately on enrollment)</span>
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
          <span className={`text-xs ${chars > 160 ? "text-amber-400" : "text-muted-foreground"}`}>
            {chars} chars · {segments} SMS segment{segments !== 1 ? "s" : ""}
          </span>
        </div>
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Hi {{firstName}}, just following up on my last message…"
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

      {/* Live preview */}
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
            upsert.mutate({ sequenceId, stepNumber, delayAmount, delayUnit, name, body })
          }
        >
          {upsert.isPending ? "Saving…" : isNew ? "Add Step" : "Save Step"}
        </Button>
      </div>
    </div>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({ seq, onDeleted }: { seq: DripSequence; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [addingStep, setAddingStep] = useState(false);
  const [editingStepId, setEditingStepId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const toggleActive = trpc.drip.updateSequence.useMutation({
    onSuccess: () => utils.drip.listSequences.invalidate(),
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

  const isInterested = seq.triggerCategory === "Interested";
  const categoryColor = isInterested
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-blue-500/15 text-blue-300 border-blue-500/30";
  const nextStepNumber = (seq.steps?.length ?? 0) + 1;
  const duration = totalDuration(seq.steps ?? []);

  return (
    <div className={`border rounded-xl overflow-hidden bg-card transition-all ${seq.isActive ? "border-border" : "border-border/50 opacity-70"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${isInterested ? "bg-emerald-500/15" : "bg-blue-500/15"}`}>
          <Zap className={`h-4 w-4 ${isInterested ? "text-emerald-400" : "text-blue-400"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{seq.name}</p>
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
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{seq.isActive ? "Active" : "Paused"}</span>
            <Switch
              checked={!!seq.isActive}
              onCheckedChange={(v) => toggleActive.mutate({ id: seq.id, isActive: v })}
            />
          </div>
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
                  {/* Vertical line */}
                  <div className="absolute left-[15px] top-6 bottom-6 w-px bg-border" />
                  {seq.steps.map((step, idx) => (
                    <div key={step.id} className="relative">
                      <div
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                      >
                        {/* Node */}
                        <div className="h-7 w-7 rounded-full bg-card border-2 border-violet-500/50 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0 z-10">
                          {step.stepNumber}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-foreground">{step.name}</p>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">
                              <Clock className="h-3 w-3" />
                              {step.delayAmount ?? step.delayDays} {step.delayUnit ?? "days"}
                            </span>
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
                          />
                        </div>
                      )}
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
                <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                  {seq.steps.map((step, idx) => (
                    <div key={step.id} className="space-y-1.5">
                      <SmsBubble
                        body={step.body}
                        delay={step.delayAmount ?? step.delayDays ?? 0}
                        unit={step.delayUnit ?? "days"}
                        stepNum={step.stepNumber}
                      />
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
                    Sequence ends — or stops early if lead replies
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
    </div>
  );
}

// ─── Quick Start Templates ─────────────────────────────────────────────────────

const QUICK_STARTS = [
  {
    label: "3-Step Follow-up",
    icon: "🚀",
    description: "Immediate + Day 3 + Day 7",
    steps: [
      { name: "Immediate Follow-up", delayAmount: 0, delayUnit: "days" as const, body: "Hi {{firstName}}, thanks for your interest! I'd love to get you a quote. When's a good time to connect?" },
      { name: "Day 3 Check-in", delayAmount: 3, delayUnit: "days" as const, body: "Hey {{firstName}}, just circling back — did you get a chance to think about your quote? Happy to answer any questions." },
      { name: "Day 7 Final", delayAmount: 7, delayUnit: "days" as const, body: "Hi {{firstName}}, last follow-up from me. If you're still interested, I'm here to help. Just reply and I'll get you taken care of!" },
    ],
  },
  {
    label: "5-Day Nurture",
    icon: "🌱",
    description: "Day 1 + Day 3 + Day 5",
    steps: [
      { name: "Day 1 Intro", delayAmount: 1, delayUnit: "days" as const, body: "Hi {{firstName}}, I wanted to share a bit more about what we offer at {{company}}. Would love to walk you through it — reply anytime!" },
      { name: "Day 3 Value", delayAmount: 3, delayUnit: "days" as const, body: "Hey {{firstName}}, here's a quick link to see what others are saying: {{link}} — let me know if you have questions!" },
      { name: "Day 5 CTA", delayAmount: 5, delayUnit: "days" as const, body: "Hi {{firstName}}, ready to move forward? Just reply YES and I'll get your quote ready within the hour." },
    ],
  },
  {
    label: "Quick Minute Drip",
    icon: "⚡",
    description: "5 min + 30 min + 2 hr",
    steps: [
      { name: "5 Min Follow-up", delayAmount: 5, delayUnit: "minutes" as const, body: "Hi {{firstName}}, just wanted to make sure you got my last message. I'm standing by to help — any questions?" },
      { name: "30 Min Check-in", delayAmount: 30, delayUnit: "minutes" as const, body: "Hey {{firstName}}, still here if you need me! Takes just 2 minutes to get your quote started." },
      { name: "2 Hr Final", delayAmount: 120, delayUnit: "minutes" as const, body: "Hi {{firstName}}, I'll leave the door open — whenever you're ready, just reply and I'll take care of you right away." },
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

  const create = trpc.drip.createSequence.useMutation({
    onSuccess: async (seq) => {
      utils.drip.listSequences.invalidate();
      // If a quick-start was selected, seed the steps
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

  const upsertStep = trpc.drip.upsertStep.useMutation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Wizard header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">New Drip Sequence</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none">×</button>
          </div>
          {/* Step indicator */}
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
                  placeholder="e.g. Interested Lead Follow-up"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Give it a name you'll recognize later.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-1.5">
                  Trigger — When should this drip start?
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
                          ? "Lead replied positively — ready to move forward or get a quote."
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
              <div className="space-y-2">
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
                            <span><strong>{s.name}</strong> — {s.delayAmount} {s.delayUnit} delay</span>
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
              Each sequence sends messages on your schedule — and stops the moment a lead replies.
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
              { icon: <Clock className="h-4 w-4" />, label: "Steps sent on schedule" },
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
                  <span className="text-xs text-muted-foreground">— lead replied positively</span>
                  <Badge variant="outline" className="text-xs ml-auto">{interestedSeqs.length} sequence{interestedSeqs.length !== 1 ? "s" : ""}</Badge>
                </div>
                {interestedSeqs.map((seq) => (
                  <SequenceCard key={seq.id} seq={seq} onDeleted={() => utils.drip.listSequences.invalidate()} />
                ))}
              </section>
            )}
            {wantsMoreSeqs.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-semibold text-foreground">Wants More Info</span>
                  <span className="text-xs text-muted-foreground">— lead is curious, not committed</span>
                  <Badge variant="outline" className="text-xs ml-auto">{wantsMoreSeqs.length} sequence{wantsMoreSeqs.length !== 1 ? "s" : ""}</Badge>
                </div>
                {wantsMoreSeqs.map((seq) => (
                  <SequenceCard key={seq.id} seq={seq} onDeleted={() => utils.drip.listSequences.invalidate()} />
                ))}
              </section>
            )}
          </div>
        )}

        {wizardOpen && <CreateWizard onClose={() => { setWizardOpen(false); utils.drip.listSequences.invalidate(); }} />}
      </div>
    </TooltipProvider>
  );
}
