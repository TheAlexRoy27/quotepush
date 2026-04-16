import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  CalendarDays, Clock, User, CheckCircle2, XCircle, Loader2, Copy,
  ChevronDown, PhoneOff, CheckCheck, Ban,
} from "lucide-react";
import { toast } from "sonner";

type AppointmentStatus = "pending" | "booked" | "cancelled" | "completed" | "no_answer";

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
  switch (status) {
    case "booked":
      return <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">Booked</Badge>;
    case "completed":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "no_answer":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">No Answer</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

const STATUS_ACTIONS: { label: string; value: AppointmentStatus; icon: React.ReactNode; className?: string }[] = [
  { label: "Mark Completed", value: "completed", icon: <CheckCheck className="h-3.5 w-3.5" />, className: "text-blue-600" },
  { label: "No Answer", value: "no_answer", icon: <PhoneOff className="h-3.5 w-3.5" />, className: "text-amber-600" },
  { label: "Mark Cancelled", value: "cancelled", icon: <Ban className="h-3.5 w-3.5" />, className: "text-destructive" },
];

export default function BookingsPage() {
  const utils = trpc.useUtils();
  const { data: bookings, isLoading } = trpc.booking.list.useQuery();
  const updateStatus = trpc.booking.updateStatus.useMutation({
    onSuccess: () => {
      utils.booking.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [confirmAction, setConfirmAction] = useState<{ id: number; status: AppointmentStatus; label: string } | null>(null);

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/book/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Booking link copied to clipboard!");
  };

  const handleStatusChange = (id: number, status: AppointmentStatus, label: string) => {
    setConfirmAction({ id, status, label });
  };

  const confirmStatusChange = () => {
    if (!confirmAction) return;
    updateStatus.mutate(
      { id: confirmAction.id, status: confirmAction.status },
      {
        onSuccess: () => {
          toast.success(`Booking marked as ${confirmAction.label.toLowerCase().replace("mark ", "")}.`);
          setConfirmAction(null);
        },
      }
    );
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

  // Stats
  const completed = bookings?.filter(b => b.status === "completed").length ?? 0;
  const noAnswer = bookings?.filter(b => b.status === "no_answer").length ?? 0;
  const booked = bookings?.filter(b => b.status === "booked").length ?? 0;
  const pending = bookings?.filter(b => b.status === "pending").length ?? 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track all booking links you've sent to leads. When a lead picks a time, their status updates to Scheduled automatically.
        </p>
      </div>

      {/* Stats row */}
      {(bookings?.length ?? 0) > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-500">{booked}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Booked</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-500">{completed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-500">{noAnswer}</p>
            <p className="text-xs text-muted-foreground mt-0.5">No Answer</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-muted-foreground">{pending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
          </div>
        </div>
      )}

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
                    <div className="flex items-center gap-2 flex-wrap">
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
                    {b.status !== "cancelled" && b.status !== "completed" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={updateStatus.isPending}>
                            Update Status
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUS_ACTIONS.filter(a => a.value !== b.status).map(action => (
                            <DropdownMenuItem
                              key={action.value}
                              className={`gap-2 cursor-pointer ${action.className ?? ""}`}
                              onClick={() => handleStatusChange(b.id, action.value, action.label)}
                            >
                              {action.icon}
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      {/* Confirm status change dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will update the booking status. You can change it again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updateStatus.isPending}
              className={confirmAction?.status === "cancelled" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {updateStatus.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
