"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ERPDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "md" | "lg" | "xl";
  side?: "right" | "left";
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<NonNullable<ERPDrawerProps["size"]>, string> = {
  md: "w-full max-w-md",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
};

export function ERPDrawer({
  open,
  onClose,
  title,
  description,
  size = "lg",
  side = "right",
  footer,
  children,
  className,
}: ERPDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className={cn(
          "absolute top-0 flex h-full flex-col bg-white shadow-xl",
          side === "right" ? "right-0 border-l border-gray-200" : "left-0 border-r border-gray-200",
          sizeClasses[size],
          className
        )}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}