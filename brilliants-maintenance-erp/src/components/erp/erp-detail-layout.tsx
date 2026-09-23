"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ERPDetailSectionProps {
  title: string;
  description?: string;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ERPDetailSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: ERPDetailSectionProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

export interface ERPDetailLayoutProps {
  children: ReactNode;
  className?: string;
}

export function ERPDetailLayout({ children, className }: ERPDetailLayoutProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>;
}