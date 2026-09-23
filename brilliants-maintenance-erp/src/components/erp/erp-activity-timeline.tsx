"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";

export interface ERPActivityItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  timestamp?: ReactNode;
  icon?: ReactNode;
}

export interface ERPActivityTimelineProps {
  items: ERPActivityItem[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function ERPActivityTimeline({
  items,
  loading,
  emptyTitle = "No activity yet",
  emptyDescription,
  className,
}: ERPActivityTimelineProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className={cn("relative space-y-0", className)}>
      {items.map((item, idx) => (
        <div key={item.id} className="relative flex gap-4 py-3">
          {idx !== items.length - 1 && (
            <span className="absolute left-2.5 top-6 -bottom-3 w-px bg-gray-200" />
          )}
          <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
            {item.icon ?? null}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium text-gray-900">{item.title}</div>
              {item.timestamp && (
                <div className="text-xs text-gray-500">{item.timestamp}</div>
              )}
            </div>
            {item.description && (
              <div className="text-sm text-gray-600">{item.description}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}