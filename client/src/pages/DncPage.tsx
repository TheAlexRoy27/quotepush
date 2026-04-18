import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, Upload, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Info, ExternalLink } from "lucide-react";

export default function DncPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: stats, refetch: refetchStats } = trpc.dnc.getStats.useQuery(undefined, { refetchOnWindowFocus: false });

  const uploadMutation = trpc.dnc.uploadRegistry.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully loaded ${data.inserted.toLocaleString()} numbers into your DNC registry.`);
      refetchStats();
      setIsUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed. Please check the file format.");
      setIsUploading(false);
    },
  });

  const bulkScrubMutation = trpc.dnc.bulkScrub.useMutation({
    onSuccess: (data) => {
      toast.success(`Scrub complete. ${data.flagged} of ${data.total} leads flagged as DNC.`);
      refetchStats();
    },
    onError: () => toast.error("Scrub failed. Please try again."),
  });

  const clearMutation = trpc.dnc.clearRegistry.useMutation({
    onSuccess: () => {
      toast.success("DNC registry cleared.");
      refetchStats();
    },
    onError: () => toast.error("Failed to clear registry."),
  });

  const handleFile = async (file: File) => {
    if (!file) return;
    setIsUploading(true);
    const text = await file.text();
    uploadMutation.mutate({ fileContent: text });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <ShieldCheck className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Do Not Call Registry</h1>
          <p className="text-sm text-muted-foreground">Scrub your leads against the FTC National DNC Registry to stay compliant.</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-200 space-y-1">
              <p className="font-medium">How to get your FTC registry file</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-300">
                <li>Go to <a href="https://www.donotcall.gov/business.html" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">donotcall.gov/business.html <ExternalLink className="h-3 w-3" /></a></li>
                <li>Create a Subscription Account (fees apply per area code)</li>
                <li>Download the <strong>.txt</strong> file for each area code you need</li>
                <li>Upload it below — repeat for each area code file</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.totalNumbers.toLocaleString() ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Numbers in Registry</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats?.flaggedLeads.toLocaleString() ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Flagged Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-foreground">
              {stats?.lastUploadedAt ? new Date(stats.lastUploadedAt).toLocaleDateString() : "Never"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Last Upload</p>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Registry File
          </CardTitle>
          <CardDescription>Upload a .txt file downloaded from the FTC DNC Subscription portal. One file per area code.</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileInput} />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Processing numbers...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Drop your FTC .txt file here</p>
                <p className="text-xs text-muted-foreground">or click to browse</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bulk Scrub */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Scrub All Leads
          </CardTitle>
          <CardDescription>
            Check every lead in your account against the current registry. Leads that match will be flagged with a red DNC badge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats?.totalNumbers === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Upload a registry file first before running a scrub.</span>
            </div>
          )}
          <Button
            onClick={() => bulkScrubMutation.mutate()}
            disabled={bulkScrubMutation.isPending || !stats?.totalNumbers}
            className="w-full"
          >
            {bulkScrubMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Scrubbing...</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Run DNC Scrub on All Leads</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            This will update the DNC status on all your leads. It may take a moment for large lists.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-400">
            <Trash2 className="h-4 w-4" />
            Clear Registry
          </CardTitle>
          <CardDescription>Remove all uploaded DNC numbers. This does not unflag existing leads.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to clear your entire DNC registry? This cannot be undone.")) {
                clearMutation.mutate();
              }
            }}
            disabled={clearMutation.isPending || !stats?.totalNumbers}
            className="w-full"
          >
            {clearMutation.isPending ? "Clearing..." : "Clear All Registry Numbers"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
