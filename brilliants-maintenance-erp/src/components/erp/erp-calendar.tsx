"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErpCalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  color?: string;
  onClick?: () => void;
}

export interface ErpCalendarProps {
  events: ErpCalendarEvent[];
  className?: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toKey(iso: string): string {
  return iso.slice(0, 10);
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ErpCalendar({ events, className }: ErpCalendarProps) {
  const now = new Date();
  const [cursor, setCursor] = useState(() =>
    new Date(now.getFullYear(), now.getMonth(), 1)
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthLabel = cursor.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  const eventsByDay = new Map<string, ErpCalendarEvent[]>();
  for (const event of events) {
    const key = toKey(event.startDate);
    const list = eventsByDay.get(key) ?? [];
    list.push(event);
    eventsByDay.set(key, list);
  }

  const cells: { day: number | null }[] = [];
  for (let i = 0; i < cellCount; i++) {
    const dayNumber = i - firstWeekday + 1;
    cells.push({ day: dayNumber >= 1 && dayNumber <= daysInMonth ? dayNumber : null });
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-gray-200 bg-white",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-800">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="px-2 py-1.5 text-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, index) => {
          const key =
            cell.day === null
              ? `blank-${index}`
              : `${year}-${String(month + 1).padStart(2, "0")}-${String(
                  cell.day
                ).padStart(2, "0")}`;
          const dayEvents = cell.day === null ? [] : (eventsByDay.get(key) ?? []);
          const isToday = key === todayKey();

          return (
            <div
              key={key}
              className={cn(
                "min-h-24 border-b border-r border-gray-100 p-1",
                index % 7 === 6 && "border-r-0",
                cell.day === null && "bg-gray-50/50"
              )}
            >
              {cell.day !== null && (
                <>
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-blue-600 text-white"
                        : "text-gray-600"
                    )}
                  >
                    {cell.day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={event.onClick}
                        className={cn(
                          "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] leading-tight",
                          event.color ?? "bg-blue-100 text-blue-700"
                        )}
                        title={event.title}
                      >
                        {event.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="px-1 text-[11px] font-medium text-gray-400">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}