"use client";

import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ERPLineItemColumn<T> {
  key: string;
  header: string;
  className?: string;
  width?: number | string;
  render: (row: T, index: number) => ReactNode;
}

export interface ERPLineItemTableProps<T> {
  columns: ERPLineItemColumn<T>[];
  data: T[];
  getKey?: (row: T, index: number) => string | number;
  emptyState?: ReactNode;
  className?: string;
}

export function ERPLineItemTable<T>({
  columns,
  data,
  getKey,
  emptyState,
  className,
}: ERPLineItemTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={col.className}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-6">
                {emptyState ?? "No items"}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, idx) => (
              <TableRow key={getKey ? getKey(row, idx) : idx}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(row, idx)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}