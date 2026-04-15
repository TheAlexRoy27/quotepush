import { toast } from "sonner";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  FolderOpen,
  Folder,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Link,
  Flame,
  CalendarClock,
  Lightbulb,
  Handshake,
  ShieldCheck,
  BellOff,
  BookOpen,
  Loader2,
  ExternalLink,
  FolderPlus,
  Search,
} from "lucide-react";

const REPLY_CATEGORIES = ["Interested", "Not Interested", "Wants More Info", "Unsubscribe"] as const;
type ReplyCategory = typeof REPLY_CATEGORIES[number];

const CATEGORY_COLORS: Record<ReplyCategory, string> = {
  "Interested": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Not Interested": "bg-rose-100 text-rose-800 border-rose-200",
  "Wants More Info": "bg-blue-100 text-blue-800 border-blue-200",
  "Unsubscribe": "bg-gray-100 text-gray-700 border-gray-200",
};

const FOLDER_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame, CalendarClock, Lightbulb, Handshake, ShieldCheck, BellOff, Folder, FolderOpen, BookOpen,
};

const FOLDER_COLOR_MAP: Record<string, string> = {
  red: "text-red-500",
  blue: "text-blue-500",
  amber: "text-amber-500",
  green: "text-emerald-500",
  purple: "text-purple-500",
  gray: "text-gray-400",
};

function renderBody(body: string) {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s,]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(body)) !== null) {
    if (match.index > last) {
      parts.push(<span key={key++}>{body.slice(last, match.index)}</span>);
    }
    if (match[1] && match[2]) {
      parts.push(
        <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-blue-400">
          {match[1]}<ExternalLink className="h-3 w-3" />
        </a>
      );
    } else if (match[3]) {
      parts.push(
        <a key={key++} href={match[3]} target="_blank" rel="noopener noreferrer"
          className="text-blue-500 underline underline-offset-2 inline-flex items-center gap-0.5 hover:text-blue-400 break-all">
          {match[3]}<ExternalLink className="h-3 w-3" />
        </a>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push(<span key={key++}>{body.slice(last)}</span>);
  return <span className="whitespace-pre-wrap">{parts}</span>;
}

interface TemplateEditorProps {
  open: boolean;
  onClose: () => void;
  folders: Array<{ id: number; name: string }>;
  initial?: {
    id?: number;
    name: string;
    category: ReplyCategory;
    body: string;
    folderId?: number | null;
  };
  onSave: (data: { name: string; category: ReplyCategory; body: string; folderId: number | null }) => void;
  saving?: boolean;
}

function TemplateEditor({ open, onClose, folders, initial, onSave, saving }: TemplateEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState<ReplyCategory>(initial?.category ?? "Interested");
  const [body, setBody] = useState(initial?.body ?? "");
  const [folderId, setFolderId] = useState<number | null>(initial?.folderId ?? null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initial?.name ?? "");
      setCategory(initial?.category ?? "Interested");
      setBody(initial?.body ?? "");
      setFolderId(initial?.folderId ?? null);
    }
  }

  function insertLink() {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.slice(start, end) || "Link Text";
    const insertion = `[${selected}](https://yoursite.com)`;
    const newBody = body.slice(0, start) + insertion + body.slice(end);
    setBody(newBody);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + selected.length + 3, start + insertion.length - 1);
    }, 0);
  }

  const VARIABLE_TAGS = ["{{firstName}}", "{{name}}", "{{company}}", "{{link}}"];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Template Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot Lead — Book Now" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as ReplyCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPLY_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Folder</label>
              <Select value={folderId?.toString() ?? "none"} onValueChange={(v) => setFolderId(v === "none" ? null : Number(v))}>
                <SelectTrigger><SelectValue placeholder="No folder" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Message Body</label>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={insertLink}>
                <Link className="h-3 w-3" /> Insert Link
              </Button>
            </div>
            <Textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={7}
              placeholder={"Hi {{firstName}}, ...\n\nUse [Label](https://url) to add hyperlinks."}
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {VARIABLE_TAGS.map((tag) => (
                <button key={tag} type="button"
                  onClick={() => setBody((b) => b + tag)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Hyperlinks: <code className="bg-muted px-1 rounded">[Label](https://url)</code> or paste a bare URL
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, category, body, folderId })} disabled={!name.trim() || !body.trim() || saving}>
            {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Saving…</> : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FOLDER_ICONS = ["Folder", "Flame", "CalendarClock", "Lightbulb", "Handshake", "ShieldCheck", "BellOff", "BookOpen"];
const FOLDER_COLORS = ["blue", "red", "amber", "green", "purple", "gray"];

interface FolderDialogProps {
  open: boolean;
  onClose: () => void;
  initial?: { id?: number; name: string; icon: string; color: string };
  onSave: (data: { name: string; icon: string; color: string }) => void;
  saving?: boolean;
}

function FolderDialog({ open, onClose, initial, onSave, saving }: FolderDialogProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "Folder");
  const [color, setColor] = useState(initial?.color ?? "blue");
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setName(initial?.name ?? "");
      setIcon(initial?.icon ?? "Folder");
      setColor(initial?.color ?? "blue");
    }
  }

  const colorBg: Record<string, string> = {
    blue: "bg-blue-400", red: "bg-red-400", amber: "bg-amber-400",
    green: "bg-emerald-400", purple: "bg-purple-400", gray: "bg-gray-400",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Rename Folder" : "New Folder"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Folder Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot Leads" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Icon</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map((ic) => {
                const Ic = FOLDER_ICON_MAP[ic] ?? Folder;
                return (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={`p-2 rounded-lg border-2 transition-colors ${icon === ic ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground"}`}>
                    <Ic className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Color</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"} ${colorBg[c]}`} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ name, icon, color })} disabled={!name.trim() || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {initial?.id ? "Save" : "Create Folder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LibraryPage() {
  
  const utils = trpc.useUtils();

  const { data: folders = [], isLoading: foldersLoading } = trpc.templateFolders.list.useQuery();
  const { data: allTemplates = [], isLoading: templatesLoading } = trpc.flowTemplates.list.useQuery(undefined);

  const [selectedFolderId, setSelectedFolderId] = useState<number | "all" | "unfiled">("all");
  const [search, setSearch] = useState("");

  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<typeof allTemplates[0] | null>(null);
  const [deleteTemplateId, setDeleteTemplateId] = useState<number | null>(null);

  const createTemplateMutation = trpc.flowTemplates.create.useMutation({
    onSuccess: () => { utils.flowTemplates.list.invalidate(); setTemplateEditorOpen(false); toast.success("Template created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateTemplateMutation = trpc.flowTemplates.update.useMutation({
    onSuccess: () => { utils.flowTemplates.list.invalidate(); setTemplateEditorOpen(false); setEditingTemplate(null); toast.success("Template saved"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTemplateMutation = trpc.flowTemplates.delete.useMutation({
    onSuccess: () => { utils.flowTemplates.list.invalidate(); setDeleteTemplateId(null); toast.success("Template deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<typeof folders[0] | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);

  const createFolderMutation = trpc.templateFolders.create.useMutation({
    onSuccess: () => { utils.templateFolders.list.invalidate(); setFolderDialogOpen(false); toast.success("Folder created"); },
    onError: (e) => toast.error(e.message),
  });
  const updateFolderMutation = trpc.templateFolders.update.useMutation({
    onSuccess: () => { utils.templateFolders.list.invalidate(); setFolderDialogOpen(false); setEditingFolder(null); toast.success("Folder renamed"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteFolderMutation = trpc.templateFolders.delete.useMutation({
    onSuccess: () => { utils.templateFolders.list.invalidate(); utils.flowTemplates.list.invalidate(); setDeleteFolderId(null); toast.success("Folder deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const seedMutation = trpc.flowTemplates.seed.useMutation({
    onSuccess: () => { utils.templateFolders.list.invalidate(); utils.flowTemplates.list.invalidate(); toast.success("Sample templates loaded!"); },
  });

  const filteredTemplates = allTemplates.filter((t) => {
    const matchesFolder =
      selectedFolderId === "all" ? true :
      selectedFolderId === "unfiled" ? !t.folderId :
      t.folderId === selectedFolderId;
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.body.toLowerCase().includes(search.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  const sortedFolders = [...folders].sort((a, b) => a.sortOrder - b.sortOrder);
  const isLoading = foldersLoading || templatesLoading;
  const isSaving = createTemplateMutation.isPending || updateTemplateMutation.isPending;
  const isFolderSaving = createFolderMutation.isPending || updateFolderMutation.isPending;

  function openNewTemplate() { setEditingTemplate(null); setTemplateEditorOpen(true); }
  function openEditTemplate(t: typeof allTemplates[0]) { setEditingTemplate(t); setTemplateEditorOpen(true); }

  function handleSaveTemplate(data: { name: string; category: ReplyCategory; body: string; folderId: number | null }) {
    if (editingTemplate?.id) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, ...data });
    } else {
      createTemplateMutation.mutate({ ...data, isActive: true, folderId: data.folderId ?? undefined });
    }
  }

  function handleSaveFolder(data: { name: string; icon: string; color: string }) {
    if (editingFolder?.id) {
      updateFolderMutation.mutate({ id: editingFolder.id, ...data });
    } else {
      createFolderMutation.mutate({ ...data, sortOrder: folders.length });
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Folder Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border flex flex-col bg-card/50">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Folders</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="New Folder"
              onClick={() => { setEditingFolder(null); setFolderDialogOpen(true); }}>
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <button onClick={() => setSelectedFolderId("all")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${selectedFolderId === "all" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}>
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="truncate">All Templates</span>
            <span className="ml-auto text-xs text-muted-foreground">{allTemplates.length}</span>
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sortedFolders.map((folder) => {
            const IconComp = FOLDER_ICON_MAP[folder.icon] ?? Folder;
            const colorClass = FOLDER_COLOR_MAP[folder.color] ?? "text-blue-500";
            const count = allTemplates.filter((t) => t.folderId === folder.id).length;
            return (
              <div key={folder.id} className="group relative">
                <button onClick={() => setSelectedFolderId(folder.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left pr-8 ${selectedFolderId === folder.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"}`}>
                  <IconComp className={`h-4 w-4 shrink-0 ${colorClass}`} />
                  <span className="truncate">{folder.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{count}</span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingFolder(folder); setFolderDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteFolderId(folder.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Folder
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}

          {allTemplates.some((t) => !t.folderId) && (
            <button onClick={() => setSelectedFolderId("unfiled")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${selectedFolderId === "unfiled" ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"}`}>
              <Folder className="h-4 w-4 shrink-0" />
              <span className="truncate">Unfiled</span>
              <span className="ml-auto text-xs">{allTemplates.filter((t) => !t.folderId).length}</span>
            </button>
          )}
        </nav>

        {allTemplates.length === 0 && (
          <div className="p-3 border-t border-border">
            <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Load Sample Templates
            </Button>
          </div>
        )}
      </aside>

      {/* Template Grid */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates…" className="pl-9 h-9" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {folders.length === 0 && allTemplates.length === 0 && (
              <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Load Samples
              </Button>
            )}
            <Button size="sm" onClick={openNewTemplate} className="gap-1">
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
              <BookOpen className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">No templates here yet</p>
                <p className="text-sm text-muted-foreground/70 mt-0.5">
                  {search ? "Try a different search" : "Create a template or load the sample library"}
                </p>
              </div>
              {!search && allTemplates.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
                  Load Sample Templates
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => {
                const folder = folders.find((f) => f.id === t.folderId);
                const FolderIconComp = folder ? (FOLDER_ICON_MAP[folder.icon] ?? Folder) : null;
                const folderColor = folder ? (FOLDER_COLOR_MAP[folder.color] ?? "text-blue-500") : "";
                return (
                  <div key={t.id} className="group bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug truncate">{t.name}</p>
                        {folder && FolderIconComp && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <FolderIconComp className={`h-3 w-3 ${folderColor}`} />
                            <span className="text-xs text-muted-foreground truncate">{folder.name}</span>
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditTemplate(t)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTemplateId(t.id)}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <Badge variant="outline" className={`text-xs self-start ${CATEGORY_COLORS[t.category as ReplyCategory] ?? ""}`}>
                      {t.category}
                    </Badge>

                    <div className="text-sm text-muted-foreground leading-relaxed line-clamp-4 flex-1">
                      {renderBody(t.body)}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <span className={`text-xs ${t.isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                        {t.isActive ? "● Active" : "○ Inactive"}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditTemplate(t)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <TemplateEditor
        open={templateEditorOpen}
        onClose={() => { setTemplateEditorOpen(false); setEditingTemplate(null); }}
        folders={folders}
        initial={editingTemplate ? {
          id: editingTemplate.id,
          name: editingTemplate.name,
          category: editingTemplate.category as ReplyCategory,
          body: editingTemplate.body,
          folderId: editingTemplate.folderId,
        } : selectedFolderId !== "all" && selectedFolderId !== "unfiled" ? {
          name: "", category: "Interested", body: "", folderId: selectedFolderId,
        } : undefined}
        onSave={handleSaveTemplate}
        saving={isSaving}
      />

      <FolderDialog
        open={folderDialogOpen}
        onClose={() => { setFolderDialogOpen(false); setEditingFolder(null); }}
        initial={editingFolder ? { id: editingFolder.id, name: editingFolder.name, icon: editingFolder.icon, color: editingFolder.color } : undefined}
        onSave={handleSaveFolder}
        saving={isFolderSaving}
      />

      <AlertDialog open={deleteTemplateId !== null} onOpenChange={(v) => !v && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate({ id: deleteTemplateId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteFolderId !== null} onOpenChange={(v) => !v && setDeleteFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>Templates inside will become unfiled. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFolderId && deleteFolderMutation.mutate({ id: deleteFolderId })}>
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
