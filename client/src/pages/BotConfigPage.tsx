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
import { Bot, Zap, MessageSquare, Info, Save, Sparkles, Send, RotateCcw, FlaskConical, HelpCircle, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help inline-block ml-1 align-middle" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const TONE_OPTIONS = [
  { value: "friendly", label: "Friendly", description: "Warm, approachable, conversational", example: "Hey Sarah! So glad you reached out. I'd love to help you find the best option - when's a good time to chat?" },
  { value: "professional", label: "Professional", description: "Polished, business-like, formal", example: "Hello Sarah, thank you for your inquiry. I would be happy to assist you in reviewing your options at your earliest convenience." },
  { value: "casual", label: "Casual", description: "Relaxed, like texting a friend", example: "Hey! Just saw your info come through. Super easy process, promise. Got like 10 mins this week?" },
  { value: "empathetic", label: "Empathetic", description: "Understanding, patient, supportive", example: "Hi Sarah, I completely understand how overwhelming this can feel. I'm here to make it as simple as possible for you - no pressure at all." },
  { value: "direct", label: "Direct", description: "Concise, no-fluff, to the point", example: "Hi Sarah. 10-minute call. I'll get you a quote. When works?" },
  { value: "karen", label: "Karen", description: "Aggressively helpful, relentless, lovably pushy", example: "Sarah. Hi. I need you to know I WILL get you the best rate. I've already looked at 3 options. Can we talk NOW? Or in 5 minutes?" },
  { value: "kevin", label: "Clumsy Kevin", description: "Typo opener, self-correction, then somehow closes the deal", example: "Hey Sarha! Soryr - Sarah* haha. Anyway I'm Alex and I jsut wanted to say we can totally help you out. You free tmrw?" },
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
  const [tone, setTone] = useState<"friendly" | "professional" | "casual" | "empathetic" | "direct" | "karen" | "kevin">("friendly");
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [openingMessage, setOpeningMessage] = useState(DEFAULT_OPENING);
  const [businessContext, setBusinessContext] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [maxReplies, setMaxReplies] = useState(10);
  const [replyDelay, setReplyDelay] = useState<"instant" | "1min" | "random">("instant");
  const [firstMessageDelay, setFirstMessageDelay] = useState<"instant" | "1min" | "random">("instant");

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
      setReplyDelay(((config as any).replyDelay as "instant" | "1min" | "random") ?? "instant");
      setFirstMessageDelay(((config as any).firstMessageDelay as "instant" | "1min" | "random") ?? "instant");
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
      replyDelay,
      firstMessageDelay,
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

  const { data: twilioConfig } = trpc.org.getTwilioConfig.useQuery();
  const twilioMissing = !twilioConfig?.accountSid || !twilioConfig?.phoneNumber;
  const selectedTone = TONE_OPTIONS.find(t => t.value === tone);

  return (
    <div className="p-3 sm:p-6 max-w-3xl mx-auto space-y-4 sm:space-y-6">
      {/* Twilio Not Configured Warning */}
      {twilioMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Twilio is not configured</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">The bot is ready but will not send any messages until you add your Twilio credentials. Even if you turn the bot ON, nothing will happen without Twilio.</p>
          </div>
          <a href="/settings" className="shrink-0 text-xs font-semibold text-amber-700 dark:text-amber-300 underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 whitespace-nowrap">Set up Twilio</a>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bot Name <FieldHelp text="The name your bot uses when texting leads. It appears in messages wherever you write {botName}. Pick something that sounds like a real person." /></Label>
              <Input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                placeholder="e.g. Alex"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">This name appears in messages. Use {"{botName}"} in templates to insert it.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tone <FieldHelp text="Controls how the bot writes. Friendly is warm and casual, Professional is formal, Kevin is a fun persona that sends a typo then corrects himself to seem human." /></Label>
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
              {selectedTone && (
                <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Example reply in this tone:</p>
                  <p className="text-xs text-foreground italic">"{selectedTone.example}"</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Persona / Identity <FieldHelp text="A short description of who the bot is. Think of it as the bot's backstory. The more specific you are, the more consistent its replies will be." /></Label>
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
          <CardDescription>
            {tone === "kevin"
              ? "Clumsy Kevin sends 3 separate texts in quick succession. No template needed."
              : "The first text sent automatically when a new lead is added."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tone === "kevin" ? (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Kevin's Opening Sequence (auto-sent, randomly picks one variant)</p>
              <div className="space-y-2">
                {[
                  "Hey {firstName}! This is {botName}, I just saw that yo",
                  "Wow, clearly can't type today.",
                  "This is {botName}, I see you filled out our form online for a quote. Is there a good time on Monday you'd be free to connect for 10 minutes at most and we can help you out?",
                ].map((msg, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0 mt-0.5 text-white text-xs font-bold">{i + 1}</div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.replace("{firstName}", testLeadName || "Sarah").replace("{botName}", botName || "Alex")}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Delays: ~2s between text 1 and 2, ~4s between text 2 and 3. Feels like a real person fumbling their phone. &#123;botName&#125; and &#123;firstName&#125; are replaced with the actual bot name and lead's first name.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Message Template <FieldHelp text="The very first text the bot sends when a new lead is added. Use {firstName} to insert the lead's first name and {botName} for the bot's name." /></Label>
                <Textarea
                  value={openingMessage}
                  onChange={(e) => setOpeningMessage(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="resize-none"
                  placeholder={DEFAULT_OPENING}
                />
                <p className="text-xs text-muted-foreground">
                  Available variables: <code className="bg-muted px-1 rounded">{'{firstName}'}</code> <code className="bg-muted px-1 rounded">{'{botName}'}</code>
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
            </>
          )}
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
            <Label>Custom Instructions <FieldHelp text="Rules the bot must follow. For example: never quote prices, always push for a call, don't mention competitors. One rule per line works best." /></Label>
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
            <Label>Max Replies Per Lead <FieldHelp text="After this many bot replies, the bot stops responding and the conversation is handed off to you. Prevents the bot from going in circles with a lead." /></Label>
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

          <div className="space-y-2">
            <Label>First Text Delay <FieldHelp text="How long to wait before sending the opening message after a lead is added. A short delay makes the message feel less like an instant robot blast." /></Label>
            <p className="text-xs text-muted-foreground">How long to wait before sending the opening message when a new lead is added. A small delay makes it feel less automated.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {([
                { value: "instant", label: "Instant", desc: "Sends right away" },
                { value: "1min", label: "1 Minute", desc: "Waits ~60 seconds" },
                { value: "random", label: "Random (1-3 min)", desc: "Waits 1 to 3 min randomly" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFirstMessageDelay(opt.value)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                    firstMessageDelay === opt.value
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40"
                      : "border-border bg-muted/20 hover:border-violet-400/50"
                  }`}
                >
                  <span className={`text-sm font-medium ${firstMessageDelay === opt.value ? "text-violet-400" : "text-foreground"}`}>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reply Delay <FieldHelp text="How long the bot waits before replying when a lead texts back. A 1-3 minute random delay makes it feel like a real person reading and typing a response." /></Label>
            <p className="text-xs text-muted-foreground">Add a pause before the bot replies so it feels like a real person typing, not a machine.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {([
                { value: "instant", label: "Instant", desc: "Replies right away" },
                { value: "1min", label: "1 Minute", desc: "Waits ~60 seconds" },
                { value: "random", label: "Random (1-3 min)", desc: "Waits 1 to 3 min randomly" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setReplyDelay(opt.value)}
                  className={`flex flex-col items-start gap-0.5 rounded-xl border p-3 text-left transition-all ${
                    replyDelay === opt.value
                      ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/40"
                      : "border-border bg-muted/20 hover:border-violet-400/50"
                  }`}
                >
                  <span className={`text-sm font-medium ${replyDelay === opt.value ? "text-violet-400" : "text-foreground"}`}>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              ))}
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
