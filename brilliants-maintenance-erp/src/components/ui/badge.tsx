import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const variants = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  archived: "bg-gray-100 text-gray-800",
  draft: "bg-gray-100 text-gray-800",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-indigo-100 text-indigo-800",
  planned: "bg-purple-100 text-purple-800",
  assigned: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  on_hold: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  verified: "bg-teal-100 text-teal-800",
  closed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
  reported: "bg-red-100 text-red-800",
  diagnosing: "bg-yellow-100 text-yellow-800",
  repairing: "bg-orange-100 text-orange-800",
  restored: "bg-green-100 text-green-800",
  under_maintenance: "bg-yellow-100 text-yellow-800",
  standby: "bg-blue-100 text-blue-800",
  breakdown: "bg-red-100 text-red-800",
  decommissioned: "bg-gray-100 text-gray-800",
  pass: "bg-green-100 text-green-800",
  fail: "bg-red-100 text-red-800",
  conditional: "bg-yellow-100 text-yellow-800",
  observation: "bg-blue-100 text-blue-800",
  scheduled: "bg-blue-100 text-blue-800",
  overdue: "bg-red-100 text-red-800",
  missed: "bg-orange-100 text-orange-800",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
