import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  statusMeta?: { value: string; label: string; color?: string } | null;
  className?: string;
}

export function StatusBadge({ statusMeta, className }: StatusBadgeProps) {
  if (!statusMeta) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusMeta.color ?? "bg-gray-100 text-gray-800",
        className
      )}
    >
      {statusMeta.label}
    </span>
  );
}