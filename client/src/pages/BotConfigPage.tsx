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
import { Bot, Zap, MessageSquare, Info, Save, Sparkles, Send, RotateCcw, FlaskConical, HelpCircle, AlertTriangle, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Lock } from "lucide-react";
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
  { value: "friendly", label: "Friendly", description: "Warm, upbeat, uses first names and the occasional emoji", example: "Hey Sarah! Totally happy to help with this. Quick question - what kind of coverage are you thinking about? 😊" },
  { value: "professional", label: "Professional", description: "Polished, no slang, no emoji, formal but brief", example: "Hello Sarah. I would be glad to assist you in reviewing your options. Please let me know when you are available for a brief call." },
  { value: "casual", label: "Casual", description: "Texts like a friend, lowercase, fragments, real slang", example: "ok so ngl this is actually super easy lol. like 10 mins and you're done. you free this week?" },
  { value: "empathetic", label: "Empathetic", description: "Leads with validation, never pushes, soft and patient", example: "I totally get it, this stuff can feel overwhelming. No rush at all. Whenever you're ready, I'm here to make it as easy as possible for you." },
  { value: "direct", label: "Direct", description: "One sentence, no filler, just the ask", example: "Hi Sarah. 10 minutes. I'll get you a quote. Free this week?" },
  { value: "karen", label: "Karen", description: "Aggressively helpful, ALL CAPS emphasis, lovably relentless", example: "Sarah. I NEED you to know I have already pulled 3 options for you. Honestly I would be doing you a disservice if I did not follow up. Can we talk today?" },
  { value: "kevin", label: "Clumsy Kevin", description: "Typo opener, self-aware, goofy but weirdly effective", example: "ok so I promise I can type normally haha. anyway but seriously though - super easy process and I actually think we can save you some money. you free tmrw?" },
  { value: "brianna", label: "Brianna (Syosset, NY)", description: "Long Island energy, sassy, direct, gets things done", example: "Ok so here's the thing hon, I'm not gonna lie, this is literally the easiest thing you'll do today. Real talk, 10 minutes and we're done. When works?" },
  { value: "kayla", label: "Kayla (San Diego)", description: "Chill, sunny, zero pressure, breezy West Coast vibes", example: "Hey! So like, no rush at all but honestly it's super easy and totally worth it. Whenever the vibes are right for you just lmk! 🌊" },
  { value: "marcus", label: "Marcus (Orlando)", description: "Smooth, confident, Southern hustle, feels like a hookup from a friend", example: "Hey, I got you straight up. Real talk, I've helped a ton of people down here and this is honestly the move. No cap. When can we connect?" },
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
  const [tone, setTone] = useState<"friendly" | "professional" | "casual" | "empathetic" | "direct" | "karen" | "kevin" | "brianna" | "kayla" | "marcus">("friendly");
  const [identity, setIdentity] = useState(DEFAULT_IDENTITY);
  const [openingMessage, setOpeningMessage] = useState(DEFAULT_OPENING);
  const [businessContext, setBusinessContext] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [maxReplies, setMaxReplies] = useState(10);
  const [replyDelay, setReplyDelay] = useState<"instant" | "1min" | "random">("instant");
  const [firstMessageDelay, setFirstMessageDelay] = useState<"instant" | "1min" | "random">("instant");
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietHoursStart, setQuietHoursStart] = useState(8);
  const [quietHoursEnd, setQuietHoursEnd] = useState(21);
  const [quietHoursTimezone, setQuietHoursTimezone] = useState("America/New_York");

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
      setQuietHoursEnabled((config as any).quietHoursEnabled ?? true);
      setQuietHoursStart((config as any).quietHoursStart ?? 8);
      setQuietHoursEnd((config as any).quietHoursEnd ?? 21);
      setQuietHoursTimezone((config as any).quietHoursTimezone ?? "America/New_York");
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
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      quietHoursTimezone,
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

  const { data: twilioConfig } = trpc.org.getTwilioConfig.useQuery();
  const twilioMissing = !twilioConfig?.accountSid || !twilioConfig?.phoneNumber;

  const previewOpening = openingMessage
    .replace(/\{botName\}/g, botName || "Alex")
    .replace(/\{firstName\}/g, "Sarah");

  const selectedTone = TONE_OPTIONS.find(t => t.value === tone);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-muted-foreground">
        <Bot className="w-5 h-5 animate-pulse" />
        Loading bot settings...
      </div>
    );
  }

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
                      <div className="flex flex-col">
                        <span className="font-medium">{t.label}</span>
                        <span className="text-muted-foreground text-xs">{t.description}</span>
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
            <Label>Bot Backstory <FieldHelp text="Describe who the bot is. The more specific you are, the more consistent its replies will be. Use {botName} as a placeholder for the bot's name." /></Label>
            <Textarea
              value={identity}
              onChange={(e) => setIdentity(e.target.value)}
              placeholder={DEFAULT_IDENTITY}
              rows={3}
              maxLength={2000}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">This becomes the bot's personality. Use {"{botName}"} as a placeholder for the bot's name.</p>
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
              <div className="rounded-xl border bg-muted/20 p-3 h-72 overflow-y-auto flex flex-col gap-3">
                {chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-0.5 w-full ${msg.role === "assistant" ? "items-start" : "items-end"}`}
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
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed break-words ${
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

      {/* ─── Quiet Hours (TCPA Compliance) ─────────────────────────────── */}
      <Card className="border-amber-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Quiet Hours
            <Badge className="ml-1 bg-amber-500/15 text-amber-500 border-amber-500/30 text-xs">TCPA Required</Badge>
          </CardTitle>
          <CardDescription>
            Block all outbound messages outside these hours. Under TCPA law, sending SMS before 8am or after 9pm in the recipient's timezone is a violation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enforce Quiet Hours</p>
              <p className="text-xs text-muted-foreground">No messages will be sent outside the window below</p>
            </div>
            <Switch checked={quietHoursEnabled} onCheckedChange={setQuietHoursEnabled} />
          </div>

          {quietHoursEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Start Hour
                  <FieldHelp text="No messages before this hour. 8 = 8:00 AM" />
                </Label>
                <Select value={String(quietHoursStart)} onValueChange={(v) => setQuietHoursStart(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  End Hour
                  <FieldHelp text="No messages after this hour. 21 = 9:00 PM" />
                </Label>
                <Select value={String(quietHoursEnd)} onValueChange={(v) => setQuietHoursEnd(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1">
                  Timezone
                  <FieldHelp text="All quiet hours are enforced in this timezone" />
                </Label>
                <Select value={quietHoursTimezone} onValueChange={setQuietHoursTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Default window is 8:00 AM - 9:00 PM. Keeping this enabled is strongly recommended to stay TCPA compliant.</span>
          </div>
        </CardContent>
      </Card>

      {/* ─── Voice Call Agent (Coming Soon) ─────────────────────────────── */}
      <Card className="border-blue-500/20 relative overflow-hidden">
        {/* Coming Soon overlay */}
        <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-xl">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-full px-4 py-2">
            <Lock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold text-blue-400">Coming Soon</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
            Sign up for <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">ElevenLabs</a> and add your API key in Settings to unlock AI voice calls.
          </p>
        </div>

        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-blue-400" /> AI Voice Call Agent
            <Badge className="ml-1 bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">Coming Soon</Badge>
          </CardTitle>
          <CardDescription>
            Let your AI persona make and receive real phone calls - same character, same script, but spoken out loud in a real voice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Voice persona selector */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Voice Call Persona
              <FieldHelp text="Choose which voice handles phone calls. Defaults to match your text persona. You can set a different voice for calls if you want." />
            </Label>
            <p className="text-xs text-muted-foreground">By default, your voice call uses the same persona as your text bot. Override it here if you want a different voice on calls.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {[
                { value: "match", label: "Match Text Persona", desc: "Same persona as your text bot", icon: MessageSquare },
                { value: "brianna", label: "Brianna (Syosset, NY)", desc: "Direct, Long Island energy", icon: PhoneCall },
                { value: "kayla", label: "Kayla (San Diego)", desc: "Chill, sunny, West Coast", icon: PhoneCall },
                { value: "marcus", label: "Marcus (Orlando)", desc: "Smooth, Southern hustle", icon: PhoneCall },
              ].map((opt) => (
                <div
                  key={opt.value}
                  className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 opacity-60 cursor-not-allowed"
                >
                  <opt.icon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call type toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 opacity-60">
              <div className="flex items-center gap-2">
                <PhoneOutgoing className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Outbound Calls</p>
                  <p className="text-xs text-muted-foreground">AI calls leads on your behalf</p>
                </div>
              </div>
              <Switch disabled checked={false} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3 opacity-60">
              <div className="flex items-center gap-2">
                <PhoneIncoming className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Inbound Calls</p>
                  <p className="text-xs text-muted-foreground">AI answers calls from leads</p>
                </div>
              </div>
              <Switch disabled checked={false} />
            </div>
          </div>

          {/* ElevenLabs key input */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              ElevenLabs API Key
              <FieldHelp text="Get your API key from elevenlabs.io. Required for AI voice synthesis on calls." />
            </Label>
            <div className="flex gap-2">
              <Input
                disabled
                placeholder="sk_... (add in Settings once you have your key)"
                className="font-mono text-xs opacity-60"
              />
              <Button disabled variant="outline" className="shrink-0 opacity-60">
                Save Key
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Don't have a key yet? <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">Sign up at ElevenLabs</a> - the Creator plan (~$22/mo) is enough for real usage.
            </p>
          </div>
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
