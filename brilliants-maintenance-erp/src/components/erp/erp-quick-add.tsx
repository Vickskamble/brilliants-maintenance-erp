"use client";

import type { ElementType, ReactNode } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ERPModal } from "./erp-modal";

export interface ERPQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  addLabel?: string;
  cancelLabel?: string;
  icon?: ElementType;
  isSaving?: boolean;
  error?: string;
  onAdd: () => void;
  children: ReactNode;
  className?: string;
}

export function ERPQuickAdd({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  addLabel = "Add",
  cancelLabel = "Cancel",
  icon: Icon,
  isSaving,
  error,
  onAdd,
  children,
  className,
}: ERPQuickAddProps) {
  return (
    <>
      <Button size="sm" onClick={() => onOpenChange(true)}>
        {Icon ? <Icon className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
        {title}
      </Button>
      <ERPModal
        open={open}
        onClose={() => onOpenChange(false)}
        title={title}
        description={description}
        size={size}
        className={className}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              {cancelLabel}
            </Button>
            <Button onClick={onAdd} isLoading={isSaving}>
              {addLabel}
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-4">{children}</div>
      </ERPModal>
    </>
  );
}