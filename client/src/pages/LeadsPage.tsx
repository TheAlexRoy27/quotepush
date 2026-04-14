import { useState, useRef, useCallback } from "react";
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
  Users, Clock, CheckCircle2, Calendar, ChevronRight, X, Loader2, SendHorizonal
} from "lucide-react";
import type { Lead, Message } from "../../../drizzle/schema";

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

function CsvImportModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: () => void;
}) {
  const [preview, setPreview] = useState<Array<{ name: string; phone: string; company?: string; email?: string }>>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const bulkCreate = trpc.leads.bulkCreate.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${preview.length} leads successfully`);
      onSuccess();
      onClose();
      setPreview([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const parseCSV = useCallback((text: string) => {
    setError("");
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) { setError("CSV must have a header row and at least one data row."); return; }

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("tel"));
    const companyIdx = headers.findIndex(h => h.includes("company") || h.includes("org"));
    const emailIdx = headers.findIndex(h => h.includes("email"));

    if (nameIdx === -1 || phoneIdx === -1) {
      setError("CSV must have 'name' and 'phone' columns.");
      return;
    }

    const rows = lines.slice(1).map(line => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      return {
        name: cols[nameIdx] ?? "",
        phone: cols[phoneIdx] ?? "",
        company: companyIdx >= 0 ? cols[companyIdx] : undefined,
        email: emailIdx >= 0 ? cols[emailIdx] : undefined,
      };
    }).filter(r => r.name && r.phone);

    if (rows.length === 0) { setError("No valid rows found."); return; }
    setPreview(rows);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target?.result as string);
    reader.readAsText(file);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Import Leads from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <code className="text-primary">name</code>, <code className="text-primary">phone</code>, and optionally <code className="text-primary">company</code>, <code className="text-primary">email</code>.
          </p>
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{preview.length} leads ready to import:</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      {["Name", "Phone", "Company", "Email"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-1.5 text-foreground">{row.name}</td>
                        <td className="px-3 py-1.5 text-foreground">{row.phone}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.company ?? "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{row.email ?? "—"}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr className="border-t border-border">
                        <td colSpan={4} className="px-3 py-1.5 text-muted-foreground text-center">
                          +{preview.length - 10} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-border text-foreground">Cancel</Button>
          <Button
            onClick={() => bulkCreate.mutate(preview)}
            disabled={preview.length === 0 || bulkCreate.isPending}
          >
            {bulkCreate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Import {preview.length > 0 ? `${preview.length} Leads` : ""}
          </Button>
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

      {/* Status changer */}
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        <Select
          value={lead.status}
          onValueChange={(val) => updateStatus.mutate({ id: lead.id, status: val as Lead["status"] })}
        >
          <SelectTrigger className="h-7 text-xs w-36 bg-input border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {["Pending", "Sent", "Replied", "Scheduled"].map(s => (
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
            <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
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
            <SelectTrigger className="w-36 bg-input border-border text-foreground">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-foreground">All Statuses</SelectItem>
              {["Pending", "Sent", "Replied", "Scheduled"].map(s => (
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
                  {["Name", "Phone", "Company", "Email", "Status", "Added", ""].map((h) => (
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
