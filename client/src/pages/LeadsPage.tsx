import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Plus, Upload, Search, Send, Trash2, MessageSquare, RefreshCw,
  Users, Clock, CheckCircle2, Calendar, ChevronRight, X, Loader2, SendHorizonal,
  Download, AlertTriangle, CheckCheck, FileText, RotateCcw, ChevronDown, ChevronUp
} from "lucide-react";
import type { Lead, Message } from "../../../drizzle/schema";

const CATEGORY_COLORS: Record<string, string> = {
  "Interested": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "Not Interested": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  "Wants More Info": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Unsubscribe": "text-slate-400 bg-slate-500/10 border-slate-500/20",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Add Lead Modal ───────────────────────────────────────────────────────────

function AddLeadModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", company: "", email: "", notes: "" });
  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => { toast.success("Lead added successfully"); onSuccess(); onClose(); setForm({ name: "", phone: "", company: "", email: "", notes: "" }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {[
            { id: "name", label: "Full Name *", placeholder: "Jane Smith" },
            { id: "phone", label: "Phone Number *", placeholder: "+1 (555) 000-0000" },
            { id: "company", label: "Company", placeholder: "Acme Corp" },
            { id: "email", label: "Email", placeholder: "jane@acme.com" },
          ].map(({ id, label, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id} className="text-sm text-foreground">{label}</Label>
              <Input
                id={id}
                placeholder={placeholder}
                value={form[id as keyof typeof form]}
                onChange={(e) => setForm(f => ({ ...f, [id]: e.target.value }))}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm text-foreground">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional context..."
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">Cancel</Button>
          <Button
            onClick={() => createLead.mutate(form)}
            disabled={!form.name || !form.phone || createLead.isPending}
          >
            {createLead.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Add Lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

// ─── Field mapping types ──────────────────────────────────────────────────────
type ParsedRow = Record<string, string>;
type MappedLead = { name: string; phone: string; company?: string; email?: string };
type ColumnMap = { name: string; phone: string; company: string; email: string };

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  name: "Full Name",
  phone: "Phone Number",
  company: "Company",
  email: "Email",
};

const FIELD_REQUIRED: Record<keyof ColumnMap, boolean> = {
  name: true, phone: true, company: false, email: false,
};

function downloadSampleCSV() {
  const csv = [
    "name,phone,company,email",
    "Jane Smith,+15551234567,Acme Corp,jane@acme.com",
    "Bob Johnson,+15559876543,Globex,bob@globex.com",
    "Alice Williams,+15555551234,,",
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "quotenudge_leads_template.csv"; a.click();
  URL.revokeObjectURL(url);
}

function autoDetectMapping(headers: string[]): ColumnMap {
  const find = (patterns: string[]) =>
    headers.find(h => patterns.some(p => h.toLowerCase().includes(p))) ?? "";
  return {
    name: find(["name", "full", "first"]),
    phone: find(["phone", "mobile", "tel", "cell", "number"]),
    company: find(["company", "org", "business", "firm"]),
    email: find(["email", "mail"]),
  };
}

function applyMapping(rows: ParsedRow[], map: ColumnMap): MappedLead[] {
  return rows
    .map(row => ({
      name: (map.name ? row[map.name] : "") ?? "",
      phone: (map.phone ? row[map.phone] : "") ?? "",
      company: map.company ? (row[map.company] || undefined) : undefined,
      email: map.email ? (row[map.email] || undefined) : undefined,
    }))
    .filter(r => r.name.trim() && r.phone.trim());
}

function CsvImportModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({ name: "", phone: "", company: "", email: "" });
  const [preview, setPreview] = useState<MappedLead[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const checkDuplicates = trpc.leads.checkDuplicates.useMutation({
    onSuccess: (data) => setDuplicateCount(data.duplicateCount),
  });

  const bulkCreate = trpc.leads.bulkCreate.useMutation({
    onSuccess: () => {
      const imported = skipDuplicates ? preview.length - duplicateCount : preview.length;
      toast.success(`Successfully imported ${imported} lead${imported !== 1 ? "s" : ""}!`);
      onSuccess();
      handleReset();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleReset = () => {
    setStep("upload"); setRawRows([]); setHeaders([]); setPreview([]);
    setDuplicateCount(0); setError(""); setShowAllRows(false);
    setColumnMap({ name: "", phone: "", company: "", email: "" });
    if (fileRef.current) fileRef.current.value = "";
  };

  const parseFile = useCallback((file: File) => {
    setError("");
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) { setError("No data rows found in the file."); return; }
        const hdrs = results.meta.fields ?? [];
        if (!hdrs.length) { setError("Could not detect column headers."); return; }
        setRawRows(results.data);
        setHeaders(hdrs);
        const detected = autoDetectMapping(hdrs);
        setColumnMap(detected);
        setStep("map");
      },
      error: (err) => setError(`Parse error: ${err.message}`),
    });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".csv")) parseFile(file);
    else setError("Please drop a .csv file.");
  };

  const handleApplyMapping = () => {
    if (!columnMap.name || !columnMap.phone) {
      setError("Name and Phone columns are required."); return;
    }
    const mapped = applyMapping(rawRows, columnMap);
    if (!mapped.length) { setError("No valid rows after applying mapping."); return; }
    setPreview(mapped);
    setError("");
    checkDuplicates.mutate(mapped.map(r => r.phone));
    setStep("preview");
  };

  const handleImport = () => {
    bulkCreate.mutate(preview.map(r => ({ ...r, skipDuplicates })));
  };

  const importCount = skipDuplicates ? preview.length - duplicateCount : preview.length;
  const displayRows = showAllRows ? preview : preview.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { handleReset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              Import Leads from CSV
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={downloadSampleCSV} className="text-muted-foreground hover:text-foreground text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Sample Template
            </Button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-2">
            {(["upload", "map", "preview"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                  step === s ? "bg-indigo-600 text-white" :
                  ["upload", "map", "preview"].indexOf(step) > i ? "bg-emerald-500/20 text-emerald-400" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {["upload", "map", "preview"].indexOf(step) > i
                    ? <CheckCheck className="h-3 w-3" />
                    : <span>{i + 1}</span>}
                  {s === "upload" ? "Upload" : s === "map" ? "Map Columns" : "Preview & Import"}
                </div>
                {i < 2 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ── Step 1: Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Upload any CSV file — we'll help you map the columns to lead fields in the next step.
              </p>
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-border hover:border-indigo-500/50 hover:bg-muted/30"
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium text-foreground">Drop your CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Column Mapping ── */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We detected <strong className="text-foreground">{rawRows.length} rows</strong> and <strong className="text-foreground">{headers.length} columns</strong>. Map each field below.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map(field => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {FIELD_LABELS[field]}
                      {FIELD_REQUIRED[field] && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <Select
                      value={columnMap[field] || "__none__"}
                      onValueChange={(v) => setColumnMap(prev => ({ ...prev, [field]: v === "__none__" ? "" : v }))}
                    >
                      <SelectTrigger className="bg-background border-border text-sm h-9">
                        <SelectValue placeholder="— skip —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— skip —</SelectItem>
                        {headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {/* Preview of first 3 raw rows */}
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground font-medium">Raw data preview (first 3 rows)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/20">
                      <tr>{headers.map(h => <th key={h} className="px-3 py-1.5 text-left text-muted-foreground whitespace-nowrap">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-t border-border">
                          {headers.map(h => <td key={h} className="px-3 py-1.5 text-foreground whitespace-nowrap max-w-[120px] truncate">{row[h] ?? ""}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Preview & Import ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-foreground">{preview.length}</p>
                  <p className="text-xs text-muted-foreground">Total rows</p>
                </div>
                <div className="bg-amber-500/10 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-amber-400">{duplicateCount}</p>
                  <p className="text-xs text-muted-foreground">Duplicates</p>
                </div>
                <div className="bg-emerald-500/10 rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-emerald-400">{importCount}</p>
                  <p className="text-xs text-muted-foreground">Will import</p>
                </div>
              </div>

              {/* Duplicate handling toggle */}
              {duplicateCount > 0 && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <p className="text-sm text-amber-300 flex-1">
                    {duplicateCount} lead{duplicateCount !== 1 ? "s" : ""} already exist with the same phone number.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSkipDuplicates(!skipDuplicates)}
                    className={`text-xs border-amber-500/30 ${
                      skipDuplicates ? "bg-amber-500/20 text-amber-300" : "text-muted-foreground"
                    }`}
                  >
                    {skipDuplicates ? "Skipping duplicates" : "Import all"}
                  </Button>
                </div>
              )}

              {/* Lead preview table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      {["Name", "Phone", "Company", "Email"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.map((row, i) => (
                      <tr key={i} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-1.5 text-foreground font-medium">{row.name}</td>
                        <td className="px-3 py-1.5 text-foreground font-mono text-[11px]">{row.phone}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.company ?? "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.email ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 8 && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowAllRows(!showAllRows)}
                  className="w-full text-muted-foreground text-xs gap-1"
                >
                  {showAllRows
                    ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                    : <><ChevronDown className="h-3.5 w-3.5" /> Show all {preview.length} rows</>
                  }
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-2">
          {step !== "upload" && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="mr-auto text-muted-foreground gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Start over
            </Button>
          )}
          <Button variant="outline" onClick={() => { handleReset(); onClose(); }} className="border-border text-foreground">
            Cancel
          </Button>
          {step === "map" && (
            <Button onClick={handleApplyMapping} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              Preview Import <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === "preview" && (
            <Button
              onClick={handleImport}
              disabled={importCount === 0 || bulkCreate.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {bulkCreate.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
                : <><Upload className="h-4 w-4 mr-2" /> Import {importCount} Lead{importCount !== 1 ? "s" : ""}</>
              }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Conversation Panel ───────────────────────────────────────────────────────

function ConversationPanel({ lead, onClose, onStatusChange }: {
  lead: Lead; onClose: () => void; onStatusChange: () => void;
}) {
  const [schedulingLink, setSchedulingLink] = useState("");
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.leads.getById.useQuery({ id: lead.id });

  const sendSms = trpc.sms.send.useMutation({
    onSuccess: (result) => {
      toast.success(result.simulated ? "Message logged (Twilio not configured)" : "SMS sent successfully!");
      utils.leads.getById.invalidate({ id: lead.id });
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      onStatusChange();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      onStatusChange();
    },
  });

  const messages = data?.messages ?? [];

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h3 className="font-semibold text-foreground">{lead.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{lead.phone}{lead.company ? ` · ${lead.company}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={lead.status} />
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Milestone changer */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Milestone:</span>
        <Select
          value={lead.status}
          onValueChange={(val) => updateStatus.mutate({ id: lead.id, status: val as Lead["status"] })}
        >
          <SelectTrigger className="h-7 text-xs w-36 bg-input border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {["Pending", "Sent", "Replied", "Scheduled", "X-Dated"].map(s => (
              <SelectItem key={s} value={s} className="text-xs text-foreground">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground/60">Send the first outreach SMS below</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col gap-1 ${msg.direction === "outbound" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.direction === "outbound"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
                <p className="whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.sentAt).toLocaleString()}
                  {msg.twilioStatus && msg.twilioStatus !== "simulated" ? ` · ${msg.twilioStatus}` : ""}
                  {msg.twilioStatus === "simulated" ? " · simulated" : ""}
                </p>
              </div>
              {/* AI classification badge for inbound messages */}
              {msg.direction === "inbound" && (msg as Message & { classification?: string }).classification && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  CATEGORY_COLORS[(msg as Message & { classification?: string }).classification!] ?? "text-muted-foreground bg-muted border-border"
                }`}>
                  {(msg as Message & { classification?: string }).classification}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* Send area */}
      <div className="p-4 border-t border-border space-y-2">
        <Input
          placeholder="Calendly link (optional)..."
          value={schedulingLink}
          onChange={(e) => setSchedulingLink(e.target.value)}
          className="bg-input border-border text-foreground placeholder:text-muted-foreground text-sm h-8"
        />
        <Button
          className="w-full"
          onClick={() => sendSms.mutate({ leadId: lead.id, schedulingLink: schedulingLink || undefined })}
          disabled={sendSms.isPending}
        >
          {sendSms.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
          Send Outreach SMS
        </Button>
      </div>
    </div>
  );
}

// ─── Main Leads Page ──────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [bulkLink, setBulkLink] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: leads = [], isLoading } = trpc.leads.list.useQuery({
    search: search || undefined,
    status: (statusFilter !== "all" ? statusFilter : undefined) as Lead["status"] | undefined,
  });

  const { data: stats } = trpc.leads.stats.useQuery();
  const { data: twilioConfigured } = trpc.sms.isConfigured.useQuery();

  const deleteLead = trpc.leads.delete.useMutation({
    onSuccess: () => {
      toast.success("Lead deleted");
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      setSelectedLead(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const sendBulk = trpc.sms.sendBulk.useMutation({
    onSuccess: (result) => {
      toast.success(`Sent ${result.sent} of ${result.total} messages`);
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
      setBulkOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const refresh = () => {
    utils.leads.list.invalidate();
    utils.leads.stats.invalidate();
  };

  const exportToCSV = () => {
    if (!leads.length) { toast.error("No leads to export."); return; }
    const rows = leads.map(l => ({
      name: l.name,
      phone: l.phone,
      company: l.company ?? "",
      email: l.email ?? "",
      status: l.status,
      notes: l.notes ?? "",
      created_at: new Date(l.createdAt).toLocaleDateString(),
    }));
    const csv = Papa.unparse(rows, { header: true });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    const filterPart = statusFilter !== "all" ? `_${statusFilter.toLowerCase()}` : "";
    const searchPart = search ? `_search` : "";
    a.href = url;
    a.download = `quotenudge_leads${filterPart}${searchPart}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leads.length} lead${leads.length !== 1 ? "s" : ""} to CSV`);
  };

  return (
    <div className="flex h-[calc(100vh-2rem)] gap-0">
      {/* Main panel */}
      <div className={`flex flex-col flex-1 min-w-0 transition-all ${selectedLead ? "pr-0" : ""}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and reach out to your prospects</p>
          </div>
          <div className="flex items-center gap-2">
            {!twilioConfigured && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                Twilio not configured
              </span>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!leads.length} className="border-border text-foreground hover:bg-accent">
              <Download className="h-4 w-4 mr-1.5" /> Export{leads.length > 0 ? ` ${leads.length}` : ""}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} className="border-border text-foreground hover:bg-accent">
              <Upload className="h-4 w-4 mr-1.5" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats?.total ?? 0} icon={Users} color="bg-primary/15 text-primary" />
          <StatCard label="Pending" value={stats?.pending ?? 0} icon={Clock} color="bg-amber-500/15 text-amber-400" />
          <StatCard label="Replied" value={stats?.replied ?? 0} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="Scheduled" value={stats?.scheduled ?? 0} icon={Calendar} color="bg-violet-500/15 text-violet-400" />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, company, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-input border-border text-foreground">
              <SelectValue placeholder="All Milestones" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-foreground">All Milestones</SelectItem>
              {["Pending", "Sent", "Replied", "Scheduled", "X-Dated"].map(s => (
                <SelectItem key={s} value={s} className="text-foreground">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {(stats?.pending ?? 0) > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkOpen(true)}
              className="border-primary/40 text-primary hover:bg-primary/10"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Send to All Pending ({stats?.pending})
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Users className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">No leads found</p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> Add your first lead
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Name", "Phone", "Company", "Email", "Milestone", "Added", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className={`border-b border-border/50 hover:bg-accent/30 transition-colors cursor-pointer ${
                      selectedLead?.id === lead.id ? "bg-accent/40" : ""
                    }`}
                    onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{lead.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.company ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.email ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                          title="View conversation"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${lead.name}?`)) deleteLead.mutate({ id: lead.id });
                          }}
                          className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete lead"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform ${selectedLead?.id === lead.id ? "rotate-90" : ""}`} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Conversation panel */}
      {selectedLead && (
        <div className="w-96 shrink-0 ml-4 rounded-xl overflow-hidden border border-border">
          <ConversationPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onStatusChange={() => {
              utils.leads.list.invalidate();
              utils.leads.stats.invalidate();
              // Refresh selected lead status
              if (selectedLead) {
                utils.leads.getById.invalidate({ id: selectedLead.id });
              }
            }}
          />
        </div>
      )}

      {/* Modals */}
      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={refresh} />
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onSuccess={refresh} />

      {/* Bulk send dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Send to All Pending Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will send the outreach SMS to all <strong className="text-foreground">{stats?.pending}</strong> pending leads.
            </p>
            <div className="space-y-1.5">
              <Label className="text-sm text-foreground">Scheduling Link (optional)</Label>
              <Input
                placeholder="https://calendly.com/your-link"
                value={bulkLink}
                onChange={(e) => setBulkLink(e.target.value)}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} className="border-border text-foreground">Cancel</Button>
            <Button
              onClick={() => sendBulk.mutate({ schedulingLink: bulkLink || undefined })}
              disabled={sendBulk.isPending}
            >
              {sendBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
