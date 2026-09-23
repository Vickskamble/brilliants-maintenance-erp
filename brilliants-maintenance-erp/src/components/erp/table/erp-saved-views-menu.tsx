"use client";

import { useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  loadSavedViews,
  persistSavedViews,
} from "./erp-table-storage";
import type { ERPSavedView, ERPSavedViewState } from "./erp-table-types";

interface ERPSavedViewsMenuProps {
  tableKey?: string;
  currentState: ERPSavedViewState;
  onApply: (state: ERPSavedViewState) => void;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `view-${Date.now()}`;
}

export function ERPSavedViewsMenu({
  tableKey,
  currentState,
  onApply,
}: ERPSavedViewsMenuProps) {
  const [views, setViews] = useState<ERPSavedView[]>(() =>
    tableKey ? loadSavedViews(tableKey) : []
  );
  const [lastAppliedId, setLastAppliedId] = useState<string | null>(null);

  function update(patch: ERPSavedView[]) {
    setViews(patch);
    if (tableKey) persistSavedViews(tableKey, patch);
  }

  function handleSave() {
    if (!tableKey) return;
    const name = window.prompt("Saved view name");
    if (!name || !name.trim()) return;
    const view: ERPSavedView = {
      id: newId(),
      name: name.trim(),
      state: currentState,
    };
    update([...views, view]);
    setLastAppliedId(view.id);
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    update(views.filter((v) => v.id !== id));
    if (lastAppliedId === id) setLastAppliedId(null);
  }

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Bookmark className="h-4 w-4" />
            Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="absolute right-0 top-full z-50 mt-1 min-w-[12rem]">
          <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {views.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-gray-500">
              No saved views yet
            </div>
          ) : (
            views.map((view) => (
              <div key={view.id} className="flex items-center">
                <DropdownMenuItem
                  className={lastAppliedId === view.id ? "bg-blue-50" : undefined}
                  onSelect={() => {
                    onApply(view.state);
                    setLastAppliedId(view.id);
                  }}
                >
                  <span className="flex-1">{view.name}</span>
                </DropdownMenuItem>
                <button
                  type="button"
                  aria-label={`Delete view ${view.name}`}
                  onClick={(e) => handleDelete(view.id, e)}
                  className="mr-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleSave}>
            <Bookmark className="h-4 w-4" />
            Save current view
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}