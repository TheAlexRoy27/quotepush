import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import Papa from "papaparse";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Plus, Upload, Search, Send, Trash2, MessageSquare, RefreshCw,
  Users, Clock, CheckCircle2, Calendar, ChevronRight, ChevronLeft, X, Loader2, SendHorizonal,
  Download, AlertTriangle, CheckCheck, FileText, RotateCcw, ChevronDown, ChevronUp, ExternalLink,
  Zap, StopCircle, NotebookPen, Save, Phone, Sparkles, UserCheck, MessageSquarePlus, Trash2 as TrashIcon
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
  const [form, setForm] = useState({ name: "", phone: "", company: "", email: "", notes: "", consentUrl: "", source: "", state: "", productType: "", age: "" });
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => { toast.success("Lead added successfully"); onSuccess(); onClose(); setForm({ name: "", phone: "", company: "", email: "", notes: "", consentUrl: "", source: "", state: "", productType: "", age: "" }); setConsentConfirmed(false); },
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
          {/* Source, Age, State, Product Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source" className="text-sm text-foreground">Lead Source</Label>
              <select
                id="source"
                value={form.source}
                onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="">Select source...</option>
                <option value="Facebook">Facebook</option>
                <option value="Zillow">Zillow</option>
                <option value="Referral">Referral</option>
                <option value="Website">Website</option>
                <option value="Cold Call">Cold Call</option>
                <option value="CSV Import">CSV Import</option>
                <option value="Webhook">Webhook</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="age" className="text-sm text-foreground">Age</Label>
              <Input
                id="age"
                type="number"
                placeholder="e.g. 45"
                value={form.age}
                onChange={(e) => setForm(f => ({ ...f, age: e.target.value }))}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                min={0} max={120}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state" className="text-sm text-foreground">State</Label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="">Select state...</option>
                {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="productType" className="text-sm text-foreground">Product Type</Label>
              <select
                id="productType"
                value={form.productType}
                onChange={(e) => setForm(f => ({ ...f, productType: e.target.value }))}
                className="w-full h-9 rounded-md border border-border bg-input px-3 text-sm text-foreground"
              >
                <option value="">Select product...</option>
                <option value="Life Insurance">Life Insurance</option>
                <option value="Health Insurance">Health Insurance</option>
                <option value="Auto Insurance">Auto Insurance</option>
                <option value="Home Insurance">Home Insurance</option>
                <option value="Medicare">Medicare</option>
                <option value="Annuity">Annuity</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

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
          <div className="space-y-1.5">
            <Label htmlFor="consentUrl" className="text-sm text-foreground flex items-center gap-1.5">
              Consent Proof URL
              <span className="text-xs text-muted-foreground font-normal">(opt-in documentation)</span>
            </Label>
            <Input
              id="consentUrl"
              placeholder="https://example.com/consent-screenshot.png"
              value={form.consentUrl}
              onChange={(e) => setForm(f => ({ ...f, consentUrl: e.target.value }))}
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">Link to a webpage, screenshot, or document proving the lead gave consent to receive SMS.</p>
          </div>
          {/* TCPA Consent Checkbox */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-3">
            <input
              type="checkbox"
              id="tcpa-consent"
              checked={consentConfirmed}
              onChange={(e) => setConsentConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600 cursor-pointer shrink-0"
            />
            <label htmlFor="tcpa-consent" className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed cursor-pointer">
              <strong>TCPA Consent Required:</strong> I confirm this lead has given express written consent to receive SMS marketing messages from my business. I have documentation on file. Sending without consent may violate federal law.
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">Cancel</Button>
          <Button
            onClick={() => createLead.mutate({ ...form, consentConfirmed, age: form.age ? parseInt(form.age) : undefined })}
            disabled={!form.name || !form.phone || !consentConfirmed || createLead.isPending}
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
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="h-8 w-8 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Download className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Not sure how to format your file?</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Download our ready-made template. Just open it in Excel or Google Sheets, fill in your leads, save as CSV, and upload it here.</p>
                  <Button variant="outline" size="sm" onClick={downloadSampleCSV} className="mt-2 gap-1.5 text-xs h-7">
                    <Download className="h-3 w-3" /> Download Template
                  </Button>
                </div>
              </div>
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

          {/* ── Step 2: Column Mapping (drag-and-drop) ── */}
          {step === "map" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Detected <strong className="text-foreground">{rawRows.length} rows</strong> and <strong className="text-foreground">{headers.length} columns</strong>.
                Drag a column chip onto a target field, or click a chip to cycle through assignments.
              </p>

              {/* Unassigned chips pool */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CSV Columns</p>
                <div className="flex flex-wrap gap-2 min-h-[40px] bg-muted/20 border border-border rounded-lg p-2">
                  {headers.filter(h => !Object.values(columnMap).includes(h)).map(h => (
                    <div
                      key={h}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", h)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 cursor-grab active:cursor-grabbing select-none hover:bg-indigo-500/25 transition-colors"
                      title={`Sample: ${rawRows[0]?.[h] ?? "(empty)"}`}
                    >
                      {h}
                      {rawRows[0]?.[h] && (
                        <span className="ml-1.5 text-indigo-300/60 font-normal">{String(rawRows[0][h]).slice(0, 12)}{String(rawRows[0][h]).length > 12 ? "..." : ""}</span>
                      )}
                    </div>
                  ))}
                  {headers.filter(h => !Object.values(columnMap).includes(h)).length === 0 && (
                    <p className="text-xs text-muted-foreground italic">All columns assigned</p>
                  )}
                </div>
              </div>

              {/* Drop zones */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map(field => {
                  const assigned = columnMap[field];
                  return (
                    <div key={field} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {FIELD_LABELS[field]}
                        {FIELD_REQUIRED[field] && <span className="text-rose-400 ml-1">*</span>}
                      </Label>
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const dragged = e.dataTransfer.getData("text/plain");
                          if (!dragged) return;
                          // Remove from any existing field
                          const prev = { ...columnMap };
                          (Object.keys(prev) as (keyof ColumnMap)[]).forEach(k => {
                            if (prev[k] === dragged) prev[k] = "";
                          });
                          setColumnMap({ ...prev, [field]: dragged });
                        }}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 min-h-[40px] transition-colors ${
                          assigned
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-muted/20 border-dashed border-border hover:border-indigo-500/50"
                        }`}
                      >
                        {assigned ? (
                          <>
                            <span className="text-xs font-medium text-emerald-400 truncate">{assigned}</span>
                            <button
                              onClick={() => setColumnMap(prev => ({ ...prev, [field]: "" }))}
                              className="shrink-0 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Drop column here</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live preview row */}
              {(columnMap.name || columnMap.phone) && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground font-medium">Live preview (first row)</div>
                  <div className="grid grid-cols-4 gap-0 divide-x divide-border">
                    {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map(field => (
                      <div key={field} className="px-3 py-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{FIELD_LABELS[field]}</p>
                        <p className={`text-xs truncate ${
                          columnMap[field] && rawRows[0]?.[columnMap[field]]
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/50 italic"
                        }`}>
                          {columnMap[field] && rawRows[0]?.[columnMap[field]]
                            ? rawRows[0][columnMap[field]]
                            : "(not mapped)"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                        <td className="px-3 py-1.5 text-muted-foreground">{row.company ?? ""}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.email ?? ""}</td>
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

function ConversationPanel({ lead, onClose, onStatusChange, orgMembers, currentUserId, onAssign }: {
  lead: Lead & { assignedToId?: number | null };
  onClose: () => void;
  onStatusChange: () => void;
  orgMembers: { userId: number; name: string | null; role: string }[];
  currentUserId?: number;
  onAssign: (leadId: number, assignedToId: number | null) => void;
}) {
  const [schedulingLink, setSchedulingLink] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlots, setBookingSlots] = useState("");
  const [bookingNote, setBookingNote] = useState("");
  const [bookingCreated, setBookingCreated] = useState<string | null>(null);
  const [dripOpen, setDripOpen] = useState(false);
  const [dripConfirmSeq, setDripConfirmSeq] = useState<{ id: number; name: string; steps: unknown[] } | null>(null);
  const [notesText, setNotesText] = useState(lead.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [internalNoteOpen, setInternalNoteOpen] = useState(false);
  const utils = trpc.useUtils();
  // Internal notes
  const { data: internalNotes = [] } = trpc.notes.list.useQuery({ leadId: lead.id });
  const createNote = trpc.notes.create.useMutation({
    onSuccess: () => {
      setInternalNoteText("");
      setInternalNoteOpen(false);
      utils.notes.list.invalidate({ leadId: lead.id });
      toast.success("Note added");
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteNote = trpc.notes.delete.useMutation({
    onSuccess: () => utils.notes.list.invalidate({ leadId: lead.id }),
    onError: (e) => toast.error(e.message),
  });

  const saveNotes = trpc.leads.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      setNotesDirty(false);
      utils.leads.list.invalidate();
      utils.leads.getById.invalidate({ id: lead.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleDNC = trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      utils.leads.getById.invalidate({ id: lead.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const dncCheckMutation = trpc.dnc.checkLead.useMutation({
    onSuccess: () => {
      utils.leads.getById.invalidate({ id: lead.id });
      utils.leads.list.invalidate();
      toast.success("DNC check complete");
    },
    onError: () => toast.error("DNC check failed -- upload registry files first"),
  });

  // Drip sequences
  const { data: sequences } = trpc.drip.listSequences.useQuery();
  const { data: enrollments } = trpc.drip.leadEnrollments.useQuery({ leadId: lead.id });
  const activeEnrollment = enrollments?.find(e => e.status === "active" || e.status === "paused");
  const activeSequence = sequences?.find(s => s.id === activeEnrollment?.sequenceId);

  const enrollDrip = trpc.drip.enrollLead.useMutation({
    onSuccess: () => {
      toast.success("Drip sequence applied!");
      setDripOpen(false);
      setDripConfirmSeq(null);
      utils.drip.leadEnrollments.invalidate({ leadId: lead.id });
    },
    onError: (e) => toast.error(e.message),
  });

  const stopDrip = trpc.drip.stopLead.useMutation({
    onSuccess: () => {
      toast.success("Removed from drip sequence.");
      utils.drip.leadEnrollments.invalidate({ leadId: lead.id });
    },
    onError: (e) => toast.error(e.message),
  });
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (result) => {
      const url = `${window.location.origin}/book/${result.token}`;
      setBookingCreated(url);
    },
    onError: (e) => toast.error(e.message),
  });
  const sendBookingLinkSms = trpc.sms.send.useMutation({
    onSuccess: () => {
      toast.success("Booking link sent!");
      setBookingOpen(false);
      setBookingCreated(null);
      setBookingSlots("");
      setBookingNote("");
      utils.leads.getById.invalidate({ id: lead.id });
      utils.leads.list.invalidate();
      onStatusChange();
    },
    onError: (e) => toast.error(e.message),
  });

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

  // AI next-action suggestion
  const lastMessages = messages.slice(-6).map(m => ({
    direction: m.direction as "inbound" | "outbound",
    body: m.body,
    classification: (m as Message & { classification?: string }).classification,
  }));
  const { data: suggestionData, isLoading: suggestionLoading, refetch: refetchSuggestion } = trpc.leads.suggestNextAction.useQuery(
    { leadName: lead.name, leadStatus: lead.status, lastMessages, hasActiveEnrollment: !!activeEnrollment },
    { enabled: messages.length > 0, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false }
  );

  return (
    <div className="flex flex-col h-full bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-3 border-b border-border gap-2 min-h-[56px]">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground text-sm sm:text-base truncate">{lead.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.phone}{lead.company ? ` · ${lead.company}` : ""}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={lead.status} />
          {/* AI Call button - Coming Soon */}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  disabled
                  className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium opacity-60 cursor-not-allowed"
                  aria-label="AI Voice Call - Coming Soon"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">AI Call</span>
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 rounded px-1 py-0.5 leading-none">SOON</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                AI voice calls are coming soon. Sign up for ElevenLabs to unlock this feature.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {/* Back arrow on mobile, X on desktop */}
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-accent transition-colors text-muted-foreground" aria-label="Close">
            <span className="sm:hidden"><ChevronLeft className="h-5 w-5" /></span>
            <span className="hidden sm:block"><X className="h-4 w-4" /></span>
          </button>
        </div>
      </div>

      {/* Assignment Row */}
      <div className="px-3 sm:px-4 py-2 border-b border-border flex items-center gap-2">
        <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground shrink-0">Assigned to:</span>
        <Select
          value={String(lead.assignedToId ?? "unassigned")}
          onValueChange={(val) => onAssign(lead.id, val === "unassigned" ? null : Number(val))}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0 bg-input border-border text-foreground">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="unassigned" className="text-xs text-muted-foreground">Unassigned</SelectItem>
            {orgMembers.map((m) => (
              <SelectItem key={m.userId} value={String(m.userId)} className="text-xs text-foreground">
                {m.name ?? `Member #${m.userId}`}{m.userId === currentUserId ? " (me)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Opted Out Warning Banner */}
      {(data?.lead as any)?.optedOut && (
        <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-500 font-medium">
            This lead has opted out. No further SMS messages will be sent to them.
            {(data?.lead as any)?.optedOutAt && (
              <span className="font-normal text-rose-400"> (opted out {new Date((data?.lead as any).optedOutAt).toLocaleDateString()})</span>
            )}
          </p>
        </div>
      )}

      {/* Consent URL */}
      {data?.lead?.consentUrl && (
        <div className="px-5 py-2 border-b border-border flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Consent:</span>
          <a
            href={data.lead.consentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate flex items-center gap-1"
          >
            {data.lead.consentUrl}
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>
      )}

      {/* Lead Details (source, DNC, age, state, product) */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Lead Details</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {(data?.lead as any)?.source && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Source:</span>
              <span className="font-medium text-foreground">{(data?.lead as any).source}</span>
            </div>
          )}
          {(data?.lead as any)?.age && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Age:</span>
              <span className="font-medium text-foreground">{(data?.lead as any).age}</span>
            </div>
          )}
          {(data?.lead as any)?.state && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">State:</span>
              <span className="font-medium text-foreground">{(data?.lead as any).state}</span>
            </div>
          )}
          {(data?.lead as any)?.productType && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Product:</span>
              <span className="font-medium text-foreground">{(data?.lead as any).productType}</span>
            </div>
          )}
        </div>
        {/* DNC Registry Check */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div>
            <span className="text-xs font-medium text-foreground">National DNC Registry</span>
            <p className="text-[10px] text-muted-foreground">
              {(data?.lead as any)?.dncCheckedAt
                ? `Last checked ${new Date((data?.lead as any).dncCheckedAt).toLocaleDateString()}`
                : "Not yet checked"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(data?.lead as any)?.dncFlagged && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-600/15 text-red-500 border border-red-500/30">DNC</span>
            )}
            <button
              onClick={() => dncCheckMutation.mutate({ leadId: lead.id })}
              disabled={dncCheckMutation.isPending}
              className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              {dncCheckMutation.isPending ? "Checking..." : "Check"}
            </button>
          </div>
        </div>
        {/* DNC Toggle */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <div>
            <span className="text-xs font-medium text-foreground">Do Not Contact</span>
            <p className="text-[10px] text-muted-foreground">Blocks all automated messages to this lead</p>
          </div>
          <button
            onClick={() => {
              const current = (data?.lead as any)?.doNotContact ?? false;
              toggleDNC.mutate({ id: lead.id, doNotContact: !current });
              if (!current) toast.warning("Lead marked as Do Not Contact");
              else toast.success("Do Not Contact removed");
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              (data?.lead as any)?.doNotContact ? "bg-rose-500" : "bg-muted"
            }`}
            title={(data?.lead as any)?.doNotContact ? "DNC is ON - click to remove" : "Click to mark as Do Not Contact"}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              (data?.lead as any)?.doNotContact ? "translate-x-4" : "translate-x-0.5"
            }`} />
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
            {["Pending", "Sent", "Replied", "Scheduled", "Future Date"].map(s => (
              <SelectItem key={s} value={s} className="text-xs text-foreground">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="px-4 py-3 border-b border-border space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <NotebookPen className="h-3.5 w-3.5" /> Agent Notes
          </label>
          {notesDirty && (
            <button
              onClick={() => saveNotes.mutate({ id: lead.id, notes: notesText })}
              disabled={saveNotes.isPending}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {saveNotes.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          )}
        </div>
        <Textarea
          value={notesText}
          onChange={(e) => { setNotesText(e.target.value); setNotesDirty(true); }}
          placeholder="Log call outcomes, context, follow-up reminders..."
          rows={2}
          className="text-xs resize-none bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>

      {/* Internal Team Notes */}
      <div className="px-4 py-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MessageSquarePlus className="h-3.5 w-3.5" /> Team Notes
          </label>
          <button
            onClick={() => setInternalNoteOpen(!internalNoteOpen)}
            className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add Note
          </button>
        </div>
        {internalNoteOpen && (
          <div className="space-y-1.5">
            <Textarea
              value={internalNoteText}
              onChange={(e) => setInternalNoteText(e.target.value)}
              placeholder="Add a team note... Use @name to mention a teammate"
              rows={2}
              className="text-xs resize-none bg-input border-border text-foreground placeholder:text-muted-foreground"
              autoFocus
            />
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="h-6 text-[10px] px-2"
                disabled={!internalNoteText.trim() || createNote.isPending}
                onClick={() => createNote.mutate({ leadId: lead.id, body: internalNoteText })}
              >
                {createNote.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] px-2 text-muted-foreground"
                onClick={() => { setInternalNoteOpen(false); setInternalNoteText(""); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {internalNotes.length > 0 && (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {internalNotes.map((note: { id: number; body: string; createdAt: Date; authorName?: string | null; authorColor?: string | null }) => {
              const noteColor = note.authorColor ?? "#f59e0b";
              return (
                <div key={note.id} className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: `${noteColor}15`, border: `1px solid ${noteColor}40` }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground leading-snug flex-1">{note.body}</p>
                    <button
                      onClick={() => deleteNote.mutate({ id: note.id })}
                      className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0 mt-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: noteColor }}>
                      {(note.authorName ?? "T").charAt(0).toUpperCase()}
                    </span>
                    <p className="text-muted-foreground">
                      {note.authorName ?? "Team member"} · {new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
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
        ) : (() => {
          // Group messages by calendar date for date dividers
          const today = new Date();
          const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
          const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          const todayStr = fmt(today);
          const yestStr = fmt(yesterday);
          const getDateLabel = (ts: Date) => {
            const s = fmt(new Date(ts));
            if (s === todayStr) return "Today";
            if (s === yestStr) return "Yesterday";
            return s;
          };
          const fmtTime = (ts: Date) =>
            new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

          let lastDateLabel = "";
          return messages.map((msg) => {
            const dateLabel = getDateLabel(msg.sentAt);
            const showDivider = dateLabel !== lastDateLabel;
            lastDateLabel = dateLabel;
            return (
              <div key={msg.id}>
                {showDivider && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2">{dateLabel}</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                <div className={`flex flex-col gap-1 ${msg.direction === "outbound" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm leading-relaxed ${
                    msg.direction === "outbound"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-xs mt-1 ${msg.direction === "outbound" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {fmtTime(msg.sentAt)}
                      {msg.twilioStatus && msg.twilioStatus !== "simulated" ? ` · ${msg.twilioStatus}` : ""}
                      {msg.twilioStatus === "simulated" ? " · simulated" : ""}
                    </p>
                  </div>
                  {/* Bot badge for bot-sent outbound messages */}
                  {msg.direction === "outbound" && (msg as unknown as Message & { isBot?: boolean }).isBot && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-violet-500/40 bg-violet-500/10 text-violet-400 flex items-center gap-1">
                      <span>🤖</span> Bot
                    </span>
                  )}
                  {/* AI classification badge for inbound messages */}
                  {msg.direction === "inbound" && (msg as Message & { classification?: string }).classification && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      CATEGORY_COLORS[(msg as Message & { classification?: string }).classification!] ?? "text-muted-foreground bg-muted border-border"
                    }`}>
                      {(msg as Message & { classification?: string }).classification}
                    </span>
                  )}
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* AI Next-Action Suggestion Bar */}
      {(suggestionLoading || suggestionData?.suggestion) && (
        <div className="px-3 sm:px-4 py-2 border-t border-border bg-violet-500/5">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wide mb-0.5">Suggested next step</p>
              {suggestionLoading ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              ) : (
                <p className="text-xs text-foreground leading-snug">{suggestionData?.suggestion}</p>
              )}
            </div>
            {!suggestionLoading && (
              <button
                onClick={() => refetchSuggestion()}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh suggestion"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Send area - sticky on mobile */}
      <div className="p-3 sm:p-4 border-t border-border space-y-2 bg-card">
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
        <Button
          variant="outline"
          className="w-full gap-2 text-sm"
          onClick={() => setBookingOpen(true)}
        >
          <Calendar className="h-4 w-4" />
          Send Booking Link
        </Button>
        {/* Drip sequence button */}
        {activeEnrollment ? (
          <div className="flex items-center justify-between rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-xs text-violet-400 font-medium truncate">
                {activeSequence?.name ?? "Drip active"}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                activeEnrollment.status === "active" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
              }`}>{activeEnrollment.status}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-destructive hover:text-destructive shrink-0"
              disabled={stopDrip.isPending}
              onClick={() => stopDrip.mutate({ leadId: lead.id })}
            >
              <StopCircle className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 text-sm border-violet-500/30 text-violet-500 hover:bg-violet-500/10 hover:text-violet-500"
            onClick={() => setDripOpen(true)}
          >
            <Zap className="h-4 w-4" />
            Apply Drip Sequence
          </Button>
        )}
      </div>

      {/* Booking Link Dialog */}
      <Dialog open={bookingOpen} onOpenChange={(o) => { setBookingOpen(o); if (!o) { setBookingCreated(null); setBookingSlots(""); setBookingNote(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Send Booking Link to {lead.name}</DialogTitle>
          </DialogHeader>
          {!bookingCreated ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Enter 2-4 available time slots. The lead will pick one from a friendly booking page.</p>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Available Time Slots</Label>
                <Textarea
                  placeholder={"Monday Apr 21 at 10am CDT\nMonday Apr 21 at 2pm CDT\nTuesday Apr 22 at 11am CDT"}
                  value={bookingSlots}
                  onChange={(e) => setBookingSlots(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">One slot per line. Plain text is fine.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-foreground">Personal Note <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder={`Hey ${lead.name?.split(' ')[0] || 'there'}, just need 10 minutes to get your quote sorted out. No pressure at all.`}
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
                  rows={2}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingOpen(false)} className="border-border">Cancel</Button>
                <Button
                  disabled={!bookingSlots.trim() || createBooking.isPending}
                  onClick={() => {
                    const slots = bookingSlots.split("\n").map(s => s.trim()).filter(Boolean);
                    createBooking.mutate({ leadId: lead.id, availableSlots: slots, agentNote: bookingNote || undefined });
                  }}
                >
                  {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Generate Link
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">Booking link ready</p>
                <p className="text-xs text-green-600 dark:text-green-500 break-all font-mono">{bookingCreated}</p>
              </div>
              <p className="text-sm text-muted-foreground">Send this link to {lead.name} via SMS now?</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBookingOpen(false)} className="border-border">Close</Button>
                <Button
                  disabled={sendBookingLinkSms.isPending}
                  onClick={() => sendBookingLinkSms.mutate({ leadId: lead.id, schedulingLink: bookingCreated })}
                >
                  {sendBookingLinkSms.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SendHorizonal className="h-4 w-4 mr-2" />}
                  Send via SMS
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Drip Confirm AlertDialog */}
      {dripConfirmSeq && (
        <AlertDialog open={!!dripConfirmSeq} onOpenChange={(o) => { if (!o) setDripConfirmSeq(null); }}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-violet-400" />
                Apply Drip Sequence?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Enroll <span className="font-medium text-foreground">{lead.name}</span> in{" "}
                <span className="font-medium text-foreground">{dripConfirmSeq.name}</span>?{" "}
                Messages will begin sending automatically on the sequence schedule.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border" onClick={() => setDripConfirmSeq(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={enrollDrip.isPending}
                onClick={() => enrollDrip.mutate({ leadId: lead.id, sequenceId: dripConfirmSeq.id })}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                {enrollDrip.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Yes, Apply Sequence
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Apply Drip Sequence Dialog */}
      <Dialog open={dripOpen} onOpenChange={setDripOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              Apply Drip Sequence
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Choose a sequence to enroll <span className="font-medium text-foreground">{lead.name}</span> in. Messages will send automatically on the schedule you defined.
            </p>
            {!sequences || sequences.length === 0 ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">No drip sequences yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create one in the Drip Sequences page first.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sequences.map((seq) => (
                  <button
                    key={seq.id}
                    disabled={enrollDrip.isPending}
                    onClick={() => setDripConfirmSeq(seq as { id: number; name: string; steps: unknown[] })}
                    className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors px-4 py-3 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{seq.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                          {seq.triggerCategory ? ` · ${seq.triggerCategory}` : ""}
                        </p>
                      </div>
                      <Zap className="h-4 w-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDripOpen(false)} className="border-border">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Bulk Drip Confirm ───────────────────────────────────────────────────────

function BulkDripConfirm({
  seq, count, leadIds, onCancel, onSuccess,
}: {
  seq: { id: number; name: string };
  count: number;
  leadIds: number[];
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const bulkEnroll = trpc.drip.bulkEnrollLeads.useMutation({
    onSuccess: (result) => {
      toast.success(`Enrolled ${result.enrolled} lead${result.enrolled !== 1 ? "s" : ""} in "${seq.name}"${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`);
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <div className="py-2 space-y-4">
      <p className="text-sm text-muted-foreground">
        Enroll <span className="font-medium text-foreground">{count} lead{count !== 1 ? "s" : ""}</span> in{" "}
        <span className="font-medium text-foreground">{seq.name}</span>? Messages will begin sending automatically on the sequence schedule.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} className="border-border">Back</Button>
        <Button
          disabled={bulkEnroll.isPending}
          onClick={() => bulkEnroll.mutate({ leadIds, sequenceId: seq.id })}
          className="bg-violet-600 hover:bg-violet-500 text-white"
        >
          {bulkEnroll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
          Yes, Enroll {count} Lead{count !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Leads Page ──────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<(Lead & { assignedToName?: string | null; assignedToColor?: string | null; dncFlagged?: boolean; dncCheckedAt?: Date | null }) | null>(null);
  const [bulkLink, setBulkLink] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDripOpen, setBulkDripOpen] = useState(false);
  const [bulkDripSeq, setBulkDripSeq] = useState<{ id: number; name: string } | null>(null);

  const utils = trpc.useUtils();

  const { data: allLeads = [], isLoading } = trpc.leads.list.useQuery({
    search: search || undefined,
    status: (statusFilter !== "all" && statusFilter !== "opted-out" ? statusFilter : undefined) as Lead["status"] | undefined,
    optedOut: statusFilter === "opted-out" ? true : undefined,
  });
  const leads = useMemo(() => {
    if (!myLeadsOnly || !user) return allLeads;
    return allLeads.filter((l: Lead & { assignedToId?: number | null }) => l.assignedToId === user.id);
  }, [allLeads, myLeadsOnly, user]);

  const { data: sequences = [] } = trpc.drip.listSequences.useQuery();
  const { data: orgMembers = [] } = trpc.org.members.useQuery();
  const assignLead = trpc.leads.assign.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); utils.leads.getById.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Deselect all when filter/search changes
  const prevFilterRef = useRef({ search, statusFilter });
  useEffect(() => {
    if (prevFilterRef.current.search !== search || prevFilterRef.current.statusFilter !== statusFilter) {
      setSelectedIds(new Set());
      prevFilterRef.current = { search, statusFilter };
    }
  }, [search, statusFilter]);

  const { data: stats } = trpc.leads.stats.useQuery();
  const { data: twilioConfigured } = trpc.sms.isConfigured.useQuery();

  const quickUpdateStatus = trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      utils.leads.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

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
    <div className="relative flex h-[calc(100vh-56px)] gap-0 overflow-hidden">
      {/* Main panel */}
      <div className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage and reach out to your prospects</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!twilioConfigured && (
              <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                Twilio not configured
              </span>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={!leads.length} className="border-border text-foreground hover:bg-accent">
              <Download className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Export{leads.length > 0 ? ` ${leads.length}` : ""}</span><span className="sm:hidden">Export</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)} className="border-border text-foreground hover:bg-accent">
              <Upload className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Import CSV</span><span className="sm:hidden">Import</span>
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Lead
            </Button>
          </div>
        </div>

        {/* Twilio Not Configured Banner */}
        {!twilioConfigured && (
          <div className="flex items-start sm:items-center gap-3 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 mb-4">
            <span className="text-amber-500 text-lg shrink-0">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Twilio is not configured</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">No SMS messages will be sent until you add your Twilio credentials. The AI bot and drip sequences are ready but inactive.</p>
            </div>
            <a href="/settings" className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 whitespace-nowrap">Go to Settings</a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Leads" value={stats?.total ?? 0} icon={Users} color="bg-primary/15 text-primary" />
          <StatCard label="Pending" value={stats?.pending ?? 0} icon={Clock} color="bg-amber-500/15 text-amber-400" />
          <StatCard label="Replied" value={stats?.replied ?? 0} icon={CheckCircle2} color="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="Scheduled" value={stats?.scheduled ?? 0} icon={Calendar} color="bg-violet-500/15 text-violet-400" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 sm:w-40 bg-input border-border text-foreground">
              <SelectValue placeholder="All Milestones" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-foreground">All Milestones</SelectItem>
              {["Pending", "Sent", "Replied", "Scheduled", "X-Dated"].map(s => (
                <SelectItem key={s} value={s} className="text-foreground">{s}</SelectItem>
              ))}
              <SelectItem value="opted-out" className="text-rose-500">Opted Out</SelectItem>
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
          <Button
            variant={myLeadsOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setMyLeadsOnly(!myLeadsOnly)}
            className={myLeadsOnly ? "" : "border-border text-muted-foreground hover:text-foreground"}
          >
            <UserCheck className="h-4 w-4 mr-1.5" />
            My Leads
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
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <Button
                size="sm"
                onClick={() => setBulkDripOpen(true)}
                className="bg-violet-600 hover:bg-violet-500 text-white"
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Apply Drip Sequence
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            </div>
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
            <>
              {/* Mobile card list - visible on small screens */}
              <div className="block sm:hidden divide-y divide-border/50">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className={`px-4 py-3 cursor-pointer transition-colors ${selectedLead?.id === lead.id ? "bg-accent/40" : "hover:bg-accent/20"}`}
                    onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{lead.phone}</p>
                        {lead.company && <p className="text-xs text-muted-foreground truncate">{lead.company}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(lead as any).assignedToName && (
                          <span
                            title={`Assigned to ${(lead as any).assignedToName}`}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border-2 border-background"
                            style={{ backgroundColor: (lead as any).assignedToColor ?? "#6366f1" }}
                          >
                            {((lead as any).assignedToName as string).charAt(0).toUpperCase()}
                          </span>
                        )}
                        <StatusBadge status={lead.status} />
                        {(lead as any).optedOut && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">Opted Out</span>
                        )}
                        {(lead as any).dncFlagged && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-red-600/15 text-red-500 border border-red-500/30" title="On National Do Not Call Registry">DNC</span>
                        )}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                            title="View conversation"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete ${lead.name}?`)) deleteLead.mutate({ id: lead.id }); }}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete lead"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Quick action row */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/40" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => quickUpdateStatus.mutate({ id: lead.id, status: "Scheduled" })}
                        className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
                        title="Mark as Scheduled"
                      >
                        <Calendar className="h-3 w-3" /> Book a Call
                      </button>
                      <button
                        onClick={() => quickUpdateStatus.mutate({ id: lead.id, status: "X-Dated" })}
                        className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors border border-amber-500/20"
                        title="Mark as Future Date"
                      >
                        <Clock className="h-3 w-3" /> Future Date
                      </button>
                      <button
                        onClick={() => quickUpdateStatus.mutate({ id: lead.id, status: "Pending" })}
                        className="flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors border border-border"
                        title="Mark as Not Interested"
                      >
                        <X className="h-3 w-3" /> Not Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table - hidden on small screens */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="pl-4 pr-2 py-3 w-8">
                        <Checkbox
                          checked={leads.length > 0 && leads.every(l => selectedIds.has(l.id))}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds(new Set(leads.map(l => l.id)));
                            else setSelectedIds(new Set());
                          }}
                          aria-label="Select all"
                        />
                      </th>
                      {["Name", "Phone", "Company", "Email", "Milestone", "Added", ""].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">
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
                        } ${selectedIds.has(lead.id) ? "bg-violet-500/5" : ""}`}
                        onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                      >
                        <td className="pl-4 pr-2 py-3 w-8" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={(checked) => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (checked) next.add(lead.id); else next.delete(lead.id);
                                return next;
                              });
                            }}
                            aria-label={`Select ${lead.name}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{lead.phone}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.company ?? ""}</td>
                        <td className="px-4 py-3 text-muted-foreground">{lead.email ?? ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StatusBadge status={lead.status} />
                            {(lead as any).optedOut && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">Opted Out</span>
                            )}
                            {(lead as any).dncFlagged && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold bg-red-600/15 text-red-500 border border-red-500/30" title="On National Do Not Call Registry">DNC</span>
                            )}
                            {(lead as any).assignedToName && (
                              <span
                                title={`Assigned to ${(lead as any).assignedToName}`}
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ backgroundColor: (lead as any).assignedToColor ?? "#6366f1" }}
                              >
                                {((lead as any).assignedToName as string).charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
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
              </div>
            </>
          )}
        </div>
      </div>

      {/* Conversation panel */}
      {selectedLead && (
        <div className="w-full sm:w-96 shrink-0 sm:ml-4 rounded-xl overflow-hidden border border-border fixed sm:relative inset-0 sm:inset-auto z-20 sm:z-auto bg-background sm:bg-transparent">
          <ConversationPanel
            lead={selectedLead as Lead & { assignedToId?: number | null }}
            onClose={() => setSelectedLead(null)}
            onStatusChange={() => {
              utils.leads.list.invalidate();
              utils.leads.stats.invalidate();
              if (selectedLead) {
                utils.leads.getById.invalidate({ id: selectedLead.id });
              }
            }}
            orgMembers={(orgMembers as unknown as { userId: number; user: { name: string | null }; role: string }[]).map(m => ({ userId: m.userId, name: m.user?.name ?? null, role: m.role }))}
            currentUserId={user?.id}
            onAssign={(leadId, assignedToId) => assignLead.mutate({ id: leadId, assignedToId })}
          />
        </div>
      )}

      {/* Modals */}
      <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={refresh} />
      <CsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} onSuccess={refresh} />

      {/* Bulk Drip Dialog */}
      <Dialog open={bulkDripOpen} onOpenChange={(o) => { setBulkDripOpen(o); if (!o) setBulkDripSeq(null); }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              Apply Drip Sequence to {selectedIds.size} Lead{selectedIds.size !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          {!bulkDripSeq ? (
            <div className="space-y-2 py-2 max-h-80 overflow-y-auto">
              {sequences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No drip sequences yet. Create one in Drip Sequences first.</p>
              ) : sequences.map((seq) => (
                <button
                  key={seq.id}
                  onClick={() => setBulkDripSeq({ id: seq.id, name: seq.name })}
                  className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors px-4 py-3 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{seq.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}
                        {seq.triggerCategory ? ` · ${seq.triggerCategory}` : ""}
                      </p>
                    </div>
                    <Zap className="h-4 w-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <BulkDripConfirm
              seq={bulkDripSeq}
              count={selectedIds.size}
              leadIds={Array.from(selectedIds)}
              onCancel={() => setBulkDripSeq(null)}
              onSuccess={() => {
                setBulkDripOpen(false);
                setBulkDripSeq(null);
                setSelectedIds(new Set());
              }}
            />
          )}
          {!bulkDripSeq && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkDripOpen(false)} className="border-border">Cancel</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

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
