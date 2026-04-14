import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type DripStep = {
  id: number;
  sequenceId: number;
  stepNumber: number;
  delayDays: number;
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

// ─── Step Editor ──────────────────────────────────────────────────────────────

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
  const [delayDays, setDelayDays] = useState(isNew ? 3 : step.delayDays);
  const stepNumber = isNew ? (nextStepNumber ?? 1) : step!.stepNumber;

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

  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Step Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Day 3 Follow-up"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Send After (days)</Label>
          <Input
            type="number"
            min={0}
            value={delayDays}
            onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Message Body</Label>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Hi {{firstName}}, just following up..."
          rows={3}
          className="text-sm resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Variables: {"{{firstName}}"}, {"{{company}}"}, {"{{link}}"}
        </p>
      </div>
      <div className="flex justify-between items-center">
        {step && (
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
            upsert.mutate({ sequenceId, stepNumber, delayDays, name, body })
          }
        >
          {upsert.isPending ? "Saving…" : isNew ? "Add Step" : "Save"}
        </Button>
      </div>
    </div>
  );
}

// ─── Sequence Card ────────────────────────────────────────────────────────────

function SequenceCard({
  seq,
  onDeleted,
}: {
  seq: DripSequence;
  onDeleted: () => void;
}) {
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

  const categoryColor =
    seq.triggerCategory === "Interested"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : "bg-blue-500/15 text-blue-300 border-blue-500/30";

  const nextStepNumber = (seq.steps?.length ?? 0) + 1;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="h-9 w-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
          <Zap className="h-4 w-4 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{seq.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColor}`}
            >
              Trigger: {seq.triggerCategory}
            </span>
            <span className="text-xs text-muted-foreground">
              {seq.steps?.length ?? 0} step{(seq.steps?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {seq.isActive ? "Active" : "Paused"}
            </span>
            <Switch
              checked={!!seq.isActive}
              onCheckedChange={(v) =>
                toggleActive.mutate({ id: seq.id, isActive: v })
              }
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Steps */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Flow visualization */}
          {seq.steps && seq.steps.length > 0 ? (
            <div className="space-y-2">
              {seq.steps.map((step, idx) => (
                <div key={step.id}>
                  <div
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() =>
                      setEditingStepId(
                        editingStepId === step.id ? null : step.id
                      )
                    }
                  >
                    <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0 mt-0.5">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {step.name}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Day {step.delayDays}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {step.body}
                      </p>
                    </div>
                  </div>
                  {editingStepId === step.id && (
                    <div className="mt-2">
                      <StepEditor
                        step={step}
                        sequenceId={seq.id}
                        onSaved={() => setEditingStepId(null)}
                        onDeleted={() => setEditingStepId(null)}
                      />
                    </div>
                  )}
                  {idx < seq.steps.length - 1 && (
                    <div className="flex justify-center my-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No steps yet. Add the first follow-up message below.</p>
            </div>
          )}

          {/* Add step */}
          {addingStep ? (
            <StepEditor
              sequenceId={seq.id}
              nextStepNumber={nextStepNumber}
              onSaved={() => setAddingStep(false)}
            />
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setAddingStep(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Step
            </Button>
          )}

          {/* Delete sequence */}
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
      )}
    </div>
  );
}

// ─── Create Sequence Dialog ───────────────────────────────────────────────────

function CreateSequenceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"Interested" | "Wants More Info">(
    "Interested"
  );
  const utils = trpc.useUtils();
  const create = trpc.drip.createSequence.useMutation({
    onSuccess: () => {
      utils.drip.listSequences.invalidate();
      setName("");
      onClose();
      toast.success("Sequence created");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Drip Sequence</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Sequence Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Interested Follow-up Drip"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Trigger — When lead replies as…</Label>
            <Select
              value={category}
              onValueChange={(v) =>
                setCategory(v as "Interested" | "Wants More Info")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Wants More Info">Wants More Info</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When the LLM classifies a reply as this category, the lead is
              automatically enrolled in this sequence.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name || create.isPending}
            onClick={() => create.mutate({ name, triggerCategory: category })}
          >
            {create.isPending ? "Creating…" : "Create Sequence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DripPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: sequences = [], isLoading } = trpc.drip.listSequences.useQuery();
  const utils = trpc.useUtils();

  const interestedSeqs = sequences.filter(
    (s) => s.triggerCategory === "Interested"
  );
  const wantsMoreSeqs = sequences.filter(
    (s) => s.triggerCategory === "Wants More Info"
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Text Drip Sequences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automated follow-up messages triggered by LLM reply classification.
            Drips stop automatically when a lead replies again.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Sequence
        </Button>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <p className="text-sm font-medium text-violet-300 mb-2">How it works</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="bg-muted/30 px-2 py-1 rounded">Lead replies to outreach</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="bg-muted/30 px-2 py-1 rounded">LLM classifies reply</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="bg-muted/30 px-2 py-1 rounded">Auto-Flow sends immediate reply</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="bg-violet-500/20 text-violet-300 px-2 py-1 rounded">Drip enrolls lead</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="bg-muted/30 px-2 py-1 rounded">Follow-ups sent on schedule</span>
          <ArrowRight className="h-3 w-3 shrink-0" />
          <span className="bg-rose-500/15 text-rose-300 px-2 py-1 rounded">Stops on reply / opt-out</span>
        </div>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-20 bg-card border border-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Zap className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No drip sequences yet</p>
          <p className="text-xs mt-1">
            Create a sequence to start automating follow-up messages.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create First Sequence
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Interested */}
          {interestedSeqs.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Interested
                </span>
                <span className="text-xs text-muted-foreground">
                  {interestedSeqs.length} sequence
                  {interestedSeqs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {interestedSeqs.map((seq) => (
                <SequenceCard
                  key={seq.id}
                  seq={seq}
                  onDeleted={() => utils.drip.listSequences.invalidate()}
                />
              ))}
            </section>
          )}

          {/* Wants More Info */}
          {wantsMoreSeqs.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Wants More Info
                </span>
                <span className="text-xs text-muted-foreground">
                  {wantsMoreSeqs.length} sequence
                  {wantsMoreSeqs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {wantsMoreSeqs.map((seq) => (
                <SequenceCard
                  key={seq.id}
                  seq={seq}
                  onDeleted={() => utils.drip.listSequences.invalidate()}
                />
              ))}
            </section>
          )}
        </div>
      )}

      <CreateSequenceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
