import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Mic, Clock, BarChart2, Users, Lock, ExternalLink, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PERSONA_PREVIEWS = [
  { name: "Brianna", location: "Syosset, NY", voice: "East Coast, direct, Long Island energy", color: "violet" },
  { name: "Kayla", location: "San Diego, CA", voice: "West Coast, chill, sunny and breezy", color: "sky" },
  { name: "Marcus", location: "Orlando, FL", voice: "Southern hustle, smooth and confident", color: "emerald" },
];

const FEATURE_CARDS = [
  {
    icon: PhoneOutgoing,
    title: "Outbound AI Calls",
    desc: "Your AI persona calls leads automatically. Same script as your texts, but spoken in a real voice. Leaves voicemails when no answer.",
    color: "blue",
  },
  {
    icon: PhoneIncoming,
    title: "Inbound AI Calls",
    desc: "When a lead calls your Twilio number, the AI picks up as your chosen persona. Qualifies, answers questions, and books appointments.",
    color: "violet",
  },
  {
    icon: Mic,
    title: "Full Transcripts",
    desc: "Every call is transcribed and saved to the lead's conversation history. Review what was said, flag outcomes, and hand off to a human agent.",
    color: "emerald",
  },
  {
    icon: BarChart2,
    title: "Call Analytics",
    desc: "Track call volume, average duration, answer rates, and booking conversions by persona so you know which voice works best for your leads.",
    color: "amber",
  },
];

export default function VoiceCallsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhoneCall className="w-5 h-5 text-blue-400" />
            <h1 className="text-xl font-bold text-foreground">AI Voice Calls</h1>
            <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">Coming Soon</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Real AI voices that call your leads, answer inbound calls, and book appointments - automatically.
          </p>
        </div>
        <a
          href="https://elevenlabs.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0">
            <ExternalLink className="w-4 h-4" />
            Get ElevenLabs Key
          </Button>
        </a>
      </div>

      {/* Setup Banner */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-500/8 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Lock className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold text-blue-400">Unlock Voice Calls</span>
        </div>
        <p className="text-sm text-muted-foreground flex-1">
          Sign up at <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline underline-offset-2">ElevenLabs</a> (Creator plan ~$22/mo), get your API key, and add it in <strong className="text-foreground">Settings</strong>. That's it - your AI personas will be able to make and receive real calls.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURE_CARDS.map((f) => (
          <Card key={f.title} className={`border-${f.color}-500/20 bg-${f.color}-500/5 relative overflow-hidden`}>
            <div className="absolute top-3 right-3">
              <Badge className="bg-muted/60 text-muted-foreground border-border text-[10px]">Coming Soon</Badge>
            </div>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <f.icon className={`w-4 h-4 text-${f.color}-400`} />
                {f.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Voice Personas Preview */}
      <Card className="border-violet-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" /> Your Voice Personas
          </CardTitle>
          <CardDescription>
            Each persona has a distinct voice matched to their character. Brianna sounds like Long Island. Kayla sounds like San Diego. Marcus sounds like Orlando.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PERSONA_PREVIEWS.map((p) => (
              <div
                key={p.name}
                className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 opacity-70"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">{p.name}</span>
                  <Badge className="bg-muted/60 text-muted-foreground border-border text-[10px]">Coming Soon</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{p.location}</p>
                <p className="text-xs text-muted-foreground italic">"{p.voice}"</p>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-1 bg-violet-400/40 rounded-full" style={{ height: `${8 + Math.sin(i * 1.5) * 4}px` }} />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">ElevenLabs voice</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Call Log Preview (empty state) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Recent Calls
          </CardTitle>
          <CardDescription>All inbound and outbound AI calls will appear here with transcripts and outcomes.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border bg-muted/10 py-12 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Phone className="w-6 h-6 text-blue-400/60" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">No calls yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Once voice calls are enabled, every call your AI makes or receives will show up here with a full transcript.
              </p>
            </div>
            <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 mt-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Sign up for ElevenLabs to get started
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Stats preview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Calls", value: "--", icon: PhoneCall },
          { label: "Avg Duration", value: "--", icon: Clock },
          { label: "Answer Rate", value: "--", icon: Users },
          { label: "Bookings from Calls", value: "--", icon: BarChart2 },
        ].map((s) => (
          <Card key={s.label} className="opacity-50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
