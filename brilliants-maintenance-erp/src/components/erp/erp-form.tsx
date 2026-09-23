"use client";

import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ERPFormSectionProps {
  title: string;
  description?: string;
  icon?: ElementType;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ERPFormSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: ERPFormSectionProps) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-blue-600" />}
          <div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
        </div>
        {actions}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export interface ERPFormGridProps {
  children: ReactNode;
  cols?: 2 | 3;
  className?: string;
}

export function ERPFormGrid({ children, cols = 2, className }: ERPFormGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        cols === 2 ? "md:grid-cols-2" : "md:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ERPFormActionsProps {
  children: ReactNode;
  className?: string;
}

export function ERPFormActions({ children, className }: ERPFormActionsProps) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      {children}
    </div>
  );
}