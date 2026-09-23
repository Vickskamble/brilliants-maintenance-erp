"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";

export interface ERPAuditEntry {
  id: string;
  action: ReactNode;
  actor?: ReactNode;
  timestamp?: ReactNode;
  details?: ReactNode;
}

export interface ERPAuditHistoryProps {
  entries: ERPAuditEntry[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ERPAuditHistory({
  entries,
  loading,
  emptyTitle = "No audit history",
  emptyDescription,
  className,
}: ERPAuditHistoryProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded-lg border border-gray-200 bg-gray-50/60 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-medium text-gray-900">{entry.action}</div>
            {entry.timestamp && (
              <div className="text-xs text-gray-500">{entry.timestamp}</div>
            )}
          </div>
          {entry.actor && (
            <div className="mt-1 text-xs text-gray-600">{entry.actor}</div>
          )}
          {entry.details && (
            <div className="mt-2 text-sm text-gray-600">{entry.details}</div>
          )}
        </div>
      ))}
    </div>
  );
}