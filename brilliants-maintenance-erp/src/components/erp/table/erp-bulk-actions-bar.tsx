"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ERPBulkAction } from "./erp-table-types";

interface ERPBulkActionsBarProps<T> {
  count: number;
  rows: T[];
  actions: ERPBulkAction<T>[];
  onClear: () => void;
}

export function ERPBulkActionsBar<T>({
  count,
  rows,
  actions,
  onClear,
}: ERPBulkActionsBarProps<T>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/60 px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-blue-700">{count} selected</span>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded text-xs text-gray-500 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action, i) => {
          const Icon = action.icon;
          const variant =
            action.variant === "danger"
              ? "danger"
              : action.variant === "ghost"
                ? "ghost"
                : action.variant === "secondary"
                  ? "secondary"
                  : "primary";
          return (
            <Button
              key={`${action.label}-${i}`}
              type="button"
              size="sm"
              variant={variant}
              onClick={() => action.onClick(rows)}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}