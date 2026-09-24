"use client";

import { cn } from "@/lib/utils";

export interface ErpGanttRow {
  id: string;
  label: string;
  subtitle?: string;
  start: string | null;
  end: string | null;
  color?: string;
  onClick?: () => void;
}

export interface ErpGanttProps {
  rows: ErpGanttRow[];
  className?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_WIDTH = 22;

function dateKey(iso: string): number {
  const date = new Date(iso);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function ErpGantt({ rows, className }: ErpGanttProps) {
  const dated = rows.filter((row) => row.start || row.end);

  if (dated.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
        No dated items to display
      </div>
    );
  }

  const starts = dated.map((row) => dateKey(row.start ?? row.end!));
  const ends = dated.map((row) => dateKey(row.end ?? row.start!));
  const minStart = Math.min(...starts);
  const maxEnd = Math.max(...ends);
  const dayCount = Math.round((maxEnd - minStart) / DAY_MS) + 1;
  const trackWidth = dayCount * DAY_WIDTH;

  const days: { date: Date; day: number; monthLabel: string | null }[] = [];
  for (let i = 0; i < dayCount; i++) {
    const date = new Date(minStart + i * DAY_MS);
    days.push({
      date,
      day: date.getDate(),
      monthLabel:
        date.getDate() === 1
          ? date.toLocaleDateString("en-IN", { month: "short" })
          : null,
    });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white",
        className
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex border-b border-gray-200 bg-gray-50">
            <div className="w-64 shrink-0 border-r border-gray-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Shutdown
            </div>
            <div className="flex">
              {days.map((cell, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex h-10 flex-col items-center justify-center border-r border-gray-100 text-[10px] leading-none",
                    cell.date.getDay() === 0 || cell.date.getDay() === 6
                      ? "bg-gray-100/70"
                      : ""
                  )}
                  style={{ width: DAY_WIDTH }}
                >
                  {cell.monthLabel && (
                    <span className="font-semibold text-gray-500">
                      {cell.monthLabel}
                    </span>
                  )}
                  <span className="mt-0.5 tabular-nums text-gray-400">
                    {cell.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {dated.map((row, rowIndex) => {
            const start = dateKey(row.start ?? row.end!);
            const end = dateKey(row.end ?? row.start!);
            const offset = Math.round((start - minStart) / DAY_MS);
            const length = Math.max(1, Math.round((end - start) / DAY_MS) + 1);

            return (
              <div
                key={row.id}
                className={cn(
                  "flex border-b border-gray-100",
                  rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                )}
              >
                <div
                  className="flex w-64 shrink-0 items-center gap-2 border-r border-gray-200 px-4 py-2"
                  onClick={row.onClick}
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm font-medium text-gray-800",
                        row.onClick && "cursor-pointer hover:text-blue-600"
                      )}
                    >
                      {row.label}
                    </p>
                    {row.subtitle && (
                      <p className="truncate text-xs text-gray-400">
                        {row.subtitle}
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="relative shrink-0"
                  style={{ width: trackWidth }}
                >
                  <div
                    className="absolute top-1/2 h-5 -translate-y-1/2 rounded-full px-1.5 shadow-sm"
                    style={{
                      left: offset * DAY_WIDTH,
                      width: Math.max(length * DAY_WIDTH - 4, DAY_WIDTH / 2),
                      backgroundColor: row.color ?? "#3b82f6",
                    }}
                    title={`${row.label} · ${row.subtitle ?? ""}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}