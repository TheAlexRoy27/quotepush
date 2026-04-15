import type { Lead } from "../../../drizzle/schema";

type Status = Lead["status"];

const statusConfig: Record<Status, { label: string; className: string }> = {
  Pending: { label: "Pending", className: "status-pending" },
  Sent: { label: "Sent", className: "status-sent" },
  Replied: { label: "Replied", className: "status-replied" },
  Scheduled: { label: "Scheduled", className: "status-scheduled" },
  "X-Dated": { label: "X-Dated", className: "status-xdated" },
};

export function StatusBadge({ status }: { status: Status }) {
  const config = statusConfig[status] ?? statusConfig.Pending;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
