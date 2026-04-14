import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Eye, Info, Loader2, RotateCcw } from "lucide-react";

const DEFAULT_BODY = `Hi {{firstName}}, I came across {{company}} and wanted to reach out personally.

I'd love to schedule a quick 15-minute call to explore how we might be able to help you. Feel free to grab a time that works for you here: {{link}}

Looking forward to connecting!`;

const VARIABLES = [
  { token: "{{firstName}}", description: "Lead's first name (auto-capitalized)" },
  { token: "{{name}}", description: "Lead's full name (auto-capitalized)" },
  { token: "{{company}}", description: "Lead's company name" },
  { token: "{{link}}", description: "Scheduling / Calendly link" },
];

function toTitleCase(str: string) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function renderPreview(body: string, name = "Jane Smith", company = "Acme Corp", link = "https://calendly.com/your-link") {
  const firstName = toTitleCase(name.trim().split(/\s+/)[0] ?? name);
  return body
    .replace(/\{\{firstName\}\}/g, firstName)
    .replace(/\{\{name\}\}/g, toTitleCase(name))
    .replace(/\{\{company\}\}/g, toTitleCase(company))
    .replace(/\{\{link\}\}/g, link);
}

export default function TemplatePage() {
  const { data: template, isLoading } = trpc.templates.get.useQuery();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [previewName, setPreviewName] = useState("Jane Smith");
  const [previewCompany, setPreviewCompany] = useState("Acme Corp");
  const [previewLink, setPreviewLink] = useState("https://calendly.com/your-link");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (template) {
      setName(template.name);
      setBody(template.body);
      setIsDirty(false);
    }
  }, [template]);

  const updateTemplate = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("Template saved successfully");
      utils.templates.get.invalidate();
      setIsDirty(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleBodyChange = (val: string) => {
    setBody(val);
    setIsDirty(true);
  };

  const handleReset = () => {
    setBody(DEFAULT_BODY);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const preview = renderPreview(body, previewName, previewCompany, previewLink);
  const charCount = preview.length;
  const smsSegments = Math.ceil(charCount / 160);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">SMS Template</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Craft your personalized outreach message. Use variable placeholders to personalize each send.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="border-border text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
          </Button>
          <Button
            size="sm"
            onClick={() => template && updateTemplate.mutate({ id: template.id, name, body })}
            disabled={!isDirty || updateTemplate.isPending || !template}
          >
            {updateTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-primary text-xs">1</span>
              Template Name
            </h2>
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
              placeholder="Template name..."
              className="bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-primary text-xs">2</span>
              Message Body
            </h2>
            <Textarea
              value={body}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder="Write your SMS template..."
              className="bg-input border-border text-foreground placeholder:text-muted-foreground resize-none font-mono text-sm leading-relaxed min-h-[200px]"
              rows={10}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{charCount} characters · ~{smsSegments} SMS segment{smsSegments !== 1 ? "s" : ""}</span>
              {isDirty && <span className="text-amber-400">Unsaved changes</span>}
            </div>
          </div>

          {/* Variable reference */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              Available Variables
            </h2>
            <div className="space-y-2">
              {VARIABLES.map(({ token, description }) => (
                <div key={token} className="flex items-center justify-between">
                  <code className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-mono">{token}</code>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              Live Preview
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Preview Name</Label>
                  <Input
                    value={previewName}
                    onChange={(e) => setPreviewName(e.target.value)}
                    className="bg-input border-border text-foreground text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Preview Company</Label>
                  <Input
                    value={previewCompany}
                    onChange={(e) => setPreviewCompany(e.target.value)}
                    className="bg-input border-border text-foreground text-xs h-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Preview Link</Label>
                <Input
                  value={previewLink}
                  onChange={(e) => setPreviewLink(e.target.value)}
                  className="bg-input border-border text-foreground text-xs h-8"
                />
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex justify-center mt-4">
              <div className="w-64 bg-muted/30 rounded-3xl border border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                    {previewName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{previewName}</p>
                    <p className="text-xs text-muted-foreground">SMS</p>
                  </div>
                </div>
                <div className="bg-primary rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <p className="text-xs text-primary-foreground leading-relaxed whitespace-pre-wrap break-words">
                    {preview || "Your message will appear here..."}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  {charCount} chars · {smsSegments} segment{smsSegments !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
