import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function formatSlot(slot: string) {
  const d = new Date(slot);
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export default function BookingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading, error } = trpc.booking.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  const confirmMutation = trpc.booking.confirmSlot.useMutation({
    onSuccess: () => {
      setConfirmed(true);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efe6dd]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efe6dd] p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Link Not Found</h2>
            <p className="text-gray-500 text-sm">
              This booking link may have expired or already been used. Reach out to your agent directly for a new one.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.status === "booked" && !confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efe6dd] p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Already Booked</h2>
            <p className="text-gray-500 text-sm">
              This slot has already been confirmed. If you need to reschedule, reach out to {data.agentName} directly.
            </p>
            {data.bookedSlot && (
              <Badge variant="secondary" className="mt-4 text-sm px-3 py-1">
                {formatSlot(data.bookedSlot)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#efe6dd] p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-10 pb-8">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">You're all set!</h2>
            <p className="text-gray-600 mb-4">
              {data.agentName} will reach out to confirm. Talk soon!
            </p>
            {selected && (
              <Badge variant="secondary" className="text-sm px-4 py-2">
                {formatSlot(selected)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#efe6dd] flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-100 mb-4">
            <CalendarDays className="h-7 w-7 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hey! Let's grab 10 minutes.
          </h1>
          <p className="text-gray-600 mt-2 text-sm leading-relaxed">
            {data.agentNote
              ? data.agentNote
              : `${data.agentName} just needs a quick call to gather a bit more info and get you the most ideal quote. No pressure, no pitch - just 10 minutes and we're done.`}
          </p>
        </div>

        {/* Slot picker */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-gray-700">
              <Clock className="h-4 w-4 text-purple-500" />
              Pick a time that works for you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.availableSlots.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelected(slot)}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  selected === slot
                    ? "border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-200"
                    : "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50 text-gray-700"
                }`}
              >
                {formatSlot(slot)}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Confirm button */}
        <Button
          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-base font-semibold"
          disabled={!selected || confirmMutation.isPending}
          onClick={() => {
            if (selected) confirmMutation.mutate({ token, slot: selected });
          }}
        >
          {confirmMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</>
          ) : (
            "Confirm this time"
          )}
        </Button>

        <p className="text-center text-xs text-gray-400">
          Powered by QuotePush.io
        </p>
      </div>
    </div>
  );
}
