"use client";

import { cn } from "@/lib/utils";

export interface ErpKanbanLane {
  value: string;
  label: string;
  color?: string;
}

export interface ErpKanbanProps<T> {
  lanes: ErpKanbanLane[];
  items: T[];
  idKey: (item: T) => string;
  getGroup: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
  className?: string;
}

export function ErpKanban<T>({
  lanes,
  items,
  idKey,
  getGroup,
  renderCard,
  onCardClick,
  className,
}: ErpKanbanProps<T>) {
  return (
    <div className={cn("flex items-start gap-4 overflow-x-auto pb-4", className)}>
      {lanes.map((lane) => {
        const laneItems = items.filter((item) => getGroup(item) === lane.value);
        return (
          <div
            key={lane.value}
            className="flex min-h-[320px] w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", lane.color)} />
                <span className="text-sm font-medium text-gray-700">
                  {lane.label}
                </span>
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-gray-600">
                {laneItems.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {laneItems.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
                  No items
                </div>
              ) : (
                laneItems.map((item) => {
                  const card = (
                    <div
                      className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow"
                      onClick={
                        onCardClick ? () => onCardClick(item) : undefined
                      }
                    >
                      {renderCard(item)}
                    </div>
                  );
                  return (
                    <div
                      key={idKey(item)}
                      className={onCardClick ? "cursor-pointer" : undefined}
                    >
                      {card}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}