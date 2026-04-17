import type { Lead } from "../../../drizzle/schema";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Status = Lead["status"];

const statusConfig: Record<Status, { label: string; className: string; description: string }> = {
  Pending: {
    label: "Pending",
    className: "status-pending",
    description: "This lead has been added but no outreach has been sent yet. They are waiting in the queue.",
  },
  Sent: {
    label: "Sent",
    className: "status-sent",
    description: "The opening text has been sent to this lead. Waiting to see if they reply.",
  },
  Replied: {
    label: "Replied",
    className: "status-replied",
    description: "This lead has texted back. The AI bot may be handling the conversation, or it is ready for you to follow up.",
  },
  Scheduled: {
    label: "Scheduled",
    className: "status-scheduled",
    description: "This lead has booked a time to connect. Check the Bookings section on your Dashboard for details.",
  },
  "X-Dated": {
    label: "Future Date",
    className: "status-xdated",
    description: "Future Date (X-Date): This lead is not ready right now but has a future date when they may be interested, such as when their current policy renews. Follow up with them closer to that date.",
  },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? statusConfig.Pending;
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-default ${config.className}`}
          >
            {config.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {config.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
