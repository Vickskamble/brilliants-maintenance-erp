"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function getPaginationPages(
  current: number,
  total: number
): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export function Pagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pages = getPaginationPages(page, totalPages);
  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 sm:flex-row">
      <p className="text-sm text-gray-500">
        Showing{" "}
        <span className="font-medium text-gray-900">{startItem}</span>-
        <span className="font-medium text-gray-900">{endItem}</span> of{" "}
        <span className="font-medium text-gray-900">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => page > 1 && onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            "rounded-lg border border-gray-300 p-1.5 text-gray-500",
            page > 1
              ? "hover:bg-gray-50 hover:text-gray-700"
              : "cursor-not-allowed opacity-50"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e-${i}`} className="px-2 text-sm text-gray-400">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => p !== page && onPageChange(p)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium",
                p === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => page < totalPages && onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "rounded-lg border border-gray-300 p-1.5 text-gray-500",
            page < totalPages
              ? "hover:bg-gray-50 hover:text-gray-700"
              : "cursor-not-allowed opacity-50"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}