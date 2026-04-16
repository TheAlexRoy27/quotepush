import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, User, Link2, CheckCircle2, XCircle, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

function formatSlot(slot: string) {
  return new Date(slot).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "booked") return <Badge className="bg-green-100 text-green-700 border-green-200">Booked</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

export default function BookingsPage() {
  const { data: bookings, isLoading, refetch } = trpc.booking.list.useQuery();
  const cancelMutation = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      toast.success("Booking cancelled.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/book/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const active = bookings?.filter(b => b.status !== "cancelled") ?? [];
  const cancelled = bookings?.filter(b => b.status === "cancelled") ?? [];

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all booking links you've sent to leads. When a lead picks a time, their status updates to Scheduled automatically.
        </p>
      </div>

      {active.length === 0 && (
        <Card className="text-center py-16">
          <CardContent>
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-sm text-muted-foreground">
              Go to a lead's conversation and click "Send Booking Link" to get started.
            </p>
          </CardContent>
        </Card>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((b) => (
            <Card key={b.id} className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm text-foreground">{b.agentName}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    {b.bookedSlot ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{formatSlot(b.bookedSlot)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Waiting for lead to pick a time</span>
                      </div>
                    )}
                    {b.agentNote && (
                      <p className="text-xs text-muted-foreground italic">{b.agentNote}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => copyLink(b.token)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Link
                    </Button>
                    {b.status !== "booked" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:text-destructive"
                        disabled={cancelMutation.isPending}
                        onClick={() => cancelMutation.mutate({ id: b.id })}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {cancelled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Cancelled</h2>
          <div className="space-y-2">
            {cancelled.map((b) => (
              <Card key={b.id} className="opacity-50 shadow-none">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{b.agentName}</span>
                    <StatusBadge status={b.status} />
                    {b.bookedSlot && <span className="text-xs">({formatSlot(b.bookedSlot)})</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
