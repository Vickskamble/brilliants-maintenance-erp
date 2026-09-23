"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ColumnOption {
  id: string;
  header: string;
  hideable: boolean;
}

interface ERPColumnManagerProps {
  columns: ColumnOption[];
  visibility: Record<string, boolean>;
  onToggle: (id: string, visible: boolean) => void;
}

export function ERPColumnManager({
  columns,
  visibility,
  onToggle,
}: ERPColumnManagerProps) {
  const visibleCount = columns.filter((c) => visibility[c.id] !== false).length;

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Columns3 className="h-4 w-4" />
            Columns
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="absolute right-0 top-full z-50 mt-1">
          <DropdownMenuLabel>Column Visibility</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {columns.map((col) => (
            <DropdownMenuCheckboxItem
              key={col.id}
              checked={visibility[col.id] !== false}
              onCheckedChange={(checked: boolean) => onToggle(col.id, checked)}
            >
              {col.header}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs text-gray-500">
            {visibleCount} of {columns.length} visible
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}