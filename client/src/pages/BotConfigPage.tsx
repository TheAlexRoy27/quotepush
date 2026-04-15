import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Zap, MessageSquare, Info, Save, Sparkles, Send, RotateCcw, FlaskConical } from "lucide-react";

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly", description: "Warm, approachable, conversational" },
  { value: "professional", label: "Professional", description: "Polished, business-like, formal" },
  { value: "casual", label: "Casual", description: "Relaxed, like texting a friend" },
  { value: "empathetic", label: "Empathetic", description: "Understanding, patient, supportive" },
  { value: "direct", label: "Direct", description: "Concise, no-fluff, to the point" },
] as const;

const DEFAULT_OPENING = "Hey {firstName}! This is {botName} - I just wanted to reach out real quick. We only need about 10 minutes of your time to gather a little info and get you the most ideal quote possible. No pressure at all - just here to help! Feel free to ask me anything. 😊";

const DEFAULT_IDENTITY = "You are {botName}, a friendly insurance advisor. You help leads understand their options and schedule a quick 10-minute call with the agent. You are warm, respectful of their time, and never pushy.";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function BotConfigPage() {
  const { data: config, isLoading } = trpc.bot.getConfig.useQuery();
  const saveConfig = trpc.bot.saveConfig.useMutation({
    onSuccess: () => {
      toast.success("Bot settings saved!");
      utils.bot.getConfig.invalidate();
    },
    onError: (e) => toast.error(e.message ?? "Failed to save"),
  });
  const testMessage = trpc.bot.testMessage.useMutation();
  const utils = trpc.useUtils();

  const [enabled, setEnabled] = useState(false);
  const [botName, setBotName] = useState("Alex");
  const [tone, setTone] = useState<"friendly" | "professional" | "casual" | "empathetic" | "direct">("friendly");
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [openingMessage, setOpeningMessage] = useState(DEFAULT_OPENING);
  const [businessContext, setBusinessContext] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [maxReplies, setMaxReplies] = useState(10);

  // Test bot state
  const [testLeadName, setTestLeadName] = useState("Sarah");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState("");
  const [testStarted, setTestStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setBotName(config.botName ?? "Alex");
      setTone((config.tone as typeof tone) ?? "friendly");
      setIdentity(config.identity ?? DEFAULT_IDENTITY);
      setOpeningMessage(config.openingMessage ?? DEFAULT_OPENING);
      setBusinessContext(config.businessContext ?? "");
      setCustomInstructions(config.customInstructions ?? "");
      setMaxReplies(config.maxRepliesPerLead ?? 10);
    }
  }, [config]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, testMessage.isPending]);

  const handleSave = () => {
    saveConfig.mutate({
      enabled,
      botName: botName.trim() || "Alex",
      tone,
      identity: identity.trim() || undefined,
      openingMessage: openingMessage.trim() || undefined,
      businessContext: businessContext.trim() || undefined,
      customInstructions: customInstructions.trim() || undefined,
      maxRepliesPerLead: maxReplies,
    });
  };

  const startTest = () => {
    const resolvedOpening = openingMessage
      .replace(/\{botName\}/g, botName || "Alex")
      .replace(/\{firstName\}/g, testLeadName || "there");
    setChatHistory([{ role: "assistant", content: resolvedOpening }]);
    setTestStarted(true);
  };

  const resetTest = () => {
    setChatHistory([]);
    setTestInput("");
    setTestStarted(false);
  };

  const sendTestMessage = async () => {
    const msg = testInput.trim();
    if (!msg || testMessage.isPending) return;
    setTestInput("");
    const newHistory: ChatMessage[] = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    try {
      const result = await testMessage.mutateAsync({
        botName: botName || "Alex",
        tone,
        identity: identity || undefined,
        businessContext: businessContext || undefined,
        customInstructions: customInstructions || undefined,
        history: newHistory.slice(0, -1), // exclude the just-added user message (it's in `message`)
        message: msg,
        leadName: testLeadName || "there",
      });
      setChatHistory([...newHistory, { role: "assistant", content: result.reply }]);
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "Bot failed to respond");
      setChatHistory(newHistory); // keep user message
    }
  };

  const previewOpening = openingMessage
    .replace(/\{botName\}/g, botName || "Alex")
    .replace(/\{firstName\}/g, "Sarah");

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground">
        <Bot className="w-5 h-5 animate-pulse" />
        Loading bot settings...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6 text-violet-500" />
            AI Text Bot
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure your bot to automatically text new leads and answer their questions - 24/7, on autopilot.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm text-muted-foreground">{enabled ? "Active" : "Inactive"}</span>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
            className="data-[state=checked]:bg-violet-600"
          />
          {enabled && (
            <Badge className="bg-violet-600/20 text-violet-400 border-violet-600/30">
              <Zap className="w-3 h-3 mr-1" /> Live
            </Badge>
          )}
        </div>
      </div>

      {/* How it works */}
      <Card className="border-violet-600/20 bg-violet-600/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">How it works</p>
              <p>When a new lead is added, the bot automatically sends the <strong>Opening Message</strong>. If the lead replies with a question, the bot responds using your <strong>Business Context</strong> and configured tone - up to {maxReplies} replies per lead before handing off to you.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" /> Bot Identity
          </CardTitle>
          <CardDescription>Give your bot a name and define who it is.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bot Name</Label>
              <Input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">This name appears in messages. Use {"{botName}"} in templates to insert it.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tone</Label>
              <Select value={tone} onValueChange={(v) => setTone(v as typeof tone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground text-xs ml-2">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Persona / Identity</Label>
            <Textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={DEFAULT_IDENTITY}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">Describe who the bot is. Use {"{botName}"} as a placeholder. This becomes the bot's system prompt.</p>
          </div>
        </CardContent>
      </Card>

      {/* Opening Message */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-500" /> Opening Message
          </CardTitle>
          <CardDescription>The first text sent automatically when a new lead is added.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Message Template</Label>
            <Textarea
              value={openingMessage}
              onChange={(e) => setOpeningMessage(e.target.value)}
              rows={4}
              maxLength={1000}
              className="resize-none"
              placeholder={DEFAULT_OPENING}
            />
            <p className="text-xs text-muted-foreground">
              Available variables: <code className="bg-muted px-1 rounded">{"{firstName}"}</code> <code className="bg-muted px-1 rounded">{"{botName}"}</code>
            </p>
          </div>

          {/* Live preview */}
          <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
            <div className="flex gap-2 items-start">
              <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <p className="text-sm leading-relaxed">{previewOpening || "(no message set)"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Context */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Context</CardTitle>
          <CardDescription>What the bot knows about your business, products, and services. The more detail, the better the answers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            rows={5}
            maxLength={3000}
            className="resize-none"
            placeholder={`e.g.\nWe specialize in auto, home, and life insurance.\nWe work with carriers like Progressive, Allstate, and State Farm.\nA typical quote call takes 10 minutes.\nWe serve clients in Texas, Florida, and Georgia.\nOur agency name is Sunrise Insurance Group.`}
          />
          <p className="text-xs text-muted-foreground">{businessContext.length}/3000 characters</p>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Custom Instructions</Label>
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              rows={3}
              maxLength={2000}
              className="resize-none"
              placeholder={`e.g.\n- Never quote specific prices\n- Always encourage booking a call\n- If asked about competitors, stay neutral\n- Do not discuss claims processes`}
            />
            <p className="text-xs text-muted-foreground">Rules and guardrails for the bot. What it should or shouldn't say.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Max Replies Per Lead</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={50}
                value={maxReplies}
                onChange={(e) => setMaxReplies(Math.min(50, Math.max(1, Number(e.target.value))))}
                className="w-24"
              />
              <p className="text-sm text-muted-foreground">After this many bot replies, the conversation is handed off to you.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Test the Bot ─────────────────────────────────────────────────── */}
      <Card className="border-emerald-600/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-500" /> Test the Bot
          </CardTitle>
          <CardDescription>
            Chat with your bot using the current settings above - no real SMS is sent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead name input + start/reset */}
          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1">
              <Label>Simulated Lead Name</Label>
              <Input
                value={testLeadName}
                onChange={(e) => setTestLeadName(e.target.value)}
                placeholder="e.g. Sarah"
                maxLength={50}
                disabled={testStarted}
              />
            </div>
            {!testStarted ? (
              <Button
                onClick={startTest}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shrink-0"
              >
                <FlaskConical className="w-4 h-4" /> Start Test
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={resetTest}
                className="gap-2 shrink-0"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>

          {/* Chat window */}
          {testStarted && (
            <>
              {/* Disclaimer */}
              <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-600/10 border border-emerald-600/20 rounded-lg px-3 py-2">
                <FlaskConical className="w-3 h-3 shrink-0" />
                Test mode - no real SMS is sent. Replies use your current (unsaved) settings.
              </div>

              {/* SMS thread */}
              <div className="rounded-xl border bg-muted/20 p-4 h-72 overflow-y-auto flex flex-col gap-3">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-0.5 ${msg.role === "assistant" ? "items-start" : "items-end"}`}
                  >
                    {msg.role === "assistant" && (
                      <span className="text-[10px] text-muted-foreground ml-1 flex items-center gap-1">
                        <Bot className="w-3 h-3 text-violet-400" /> {botName || "Bot"}
                      </span>
                    )}
                    {msg.role === "user" && (
                      <span className="text-[10px] text-muted-foreground mr-1">{testLeadName || "Lead"}</span>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === "assistant"
                          ? "bg-violet-600/20 text-foreground rounded-bl-sm border border-violet-600/20"
                          : "bg-primary text-primary-foreground rounded-br-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {testMessage.isPending && (
                  <div className="flex items-start gap-2">
                    <div className="bg-violet-600/20 border border-violet-600/20 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </span>
                      {botName || "Bot"} is typing...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input row */}
              <div className="flex gap-2">
                <Input
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTestMessage(); } }}
                  placeholder={`Reply as ${testLeadName || "the lead"}...`}
                  disabled={testMessage.isPending}
                  maxLength={500}
                />
                <Button
                  onClick={sendTestMessage}
                  disabled={!testInput.trim() || testMessage.isPending}
                  className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={saveConfig.isPending}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
        >
          <Save className="w-4 h-4" />
          {saveConfig.isPending ? "Saving..." : "Save Bot Settings"}
        </Button>
      </div>
    </div>
  );
}
