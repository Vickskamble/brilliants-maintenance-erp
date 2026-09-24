"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryScope } from "@/lib/auth/query-scope";
import { searchGlobal } from "@/services/search";
import type { SearchModule, SearchGroup } from "@/services/search/types";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Factory,
  FileWarning,
  Loader2,
  Search,
  SearchX,
  Settings,
  Store,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const MODULE_CONFIG: Record<
  SearchModule,
  { label: string; icon: LucideIcon; routePrefix: string }
> = {
  equipment: { label: "Equipment", icon: Factory, routePrefix: "/equipment/" },
  work_orders: { label: "Work Orders", icon: ClipboardList, routePrefix: "/work-orders/" },
  spare_parts: { label: "Spare Parts", icon: Wrench, routePrefix: "/spare-parts/" },
  vendors: { label: "Vendors", icon: Store, routePrefix: "/vendors/" },
  maintenance: { label: "PM Schedule", icon: Settings, routePrefix: "/maintenance/" },
  breakdowns: { label: "Breakdowns", icon: FileWarning, routePrefix: "/breakdowns/" },
};

interface FlatEntry {
  group: SearchGroup;
  indexInGroup: number;
}

export function GlobalSearch() {
  const scope = useQueryScope();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const flat: FlatEntry[] = [];
  const flatIndexByKey = new Map<string, number>();
  for (const group of groups) {
    for (const [itemIndex, item] of group.items.entries()) {
      flatIndexByKey.set(`${group.module}-${item.id}`, flat.length);
      flat.push({ group, indexInGroup: itemIndex });
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key && event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setGroups([]);
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 2) {
      setGroups([]);
      setIsSearching(false);
      setError(false);
      setActiveIndex(0);
      return;
    }

    const trimmed = query.trim();
    const current = ++requestId.current;
    setIsSearching(true);
    setError(false);

    const timer = setTimeout(async () => {
      try {
        const { groups: next } = await searchGlobal(
          scope.organizationId,
          scope.plantId,
          trimmed
        );
        if (current !== requestId.current) return;
        setGroups(next);
        setActiveIndex(0);
      } catch {
        if (current !== requestId.current) return;
        setError(true);
        setGroups([]);
      } finally {
        if (current === requestId.current) setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, open, scope.organizationId, scope.plantId]);

  function openItem(entry: FlatEntry) {
    const config = MODULE_CONFIG[entry.group.module];
    router.push(`${config.routePrefix}${entry.group.items[entry.indexInGroup].id}`);
    setOpen(false);
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (flat.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      openItem(flat[activeIndex]);
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-search-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search</span>
        <kbd className="hidden rounded border border-gray-200 bg-gray-50 px-1 text-[10px] text-gray-400 md:inline">
          Ctrl K
        </kbd>
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 md:p-6 md:pt-32"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onListKeyDown}
            placeholder="Search equipment, work orders, spares, vendors, PM, breakdowns..."
            className="h-14 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
          <button
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-50"
          >
            ESC
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {isSearching && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!isSearching && error && (
            <div className="px-4 py-6 text-sm text-red-600">Search failed. Please try again.</div>
          )}

          {!isSearching && !error && query.trim().length > 0 && flat.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <SearchX className="h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-500">
                No results for &ldquo;{query.trim()}&rdquo;
              </p>
            </div>
          )}

          {!isSearching && !error && query.trim().length < 2 && (
            <div className="space-y-3 px-4 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Search across
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MODULE_CONFIG).map(([module, config]) => {
                  const Icon = config.icon;
                  return (
                    <span
                      key={module}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600"
                    >
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                      {config.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {!isSearching && !error && flat.length > 0 && (
            <div className="space-y-2">
              {groups.map((group) => {
                const config = MODULE_CONFIG[group.module];
                const Icon = config.icon;
                return (
                  <div key={group.module}>
                    <div className="flex items-center gap-3 px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </div>
                    {group.items.map((item, itemIndex) => {
                      const flatIndex = flatIndexByKey.get(`${group.module}-${item.id}`) ?? 0;
                      return (
                        <button
                          key={`${group.module}-${item.id}`}
                          data-search-index={flatIndex}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => openItem({ group, indexInGroup: itemIndex })}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 px-4 py-2 text-left",
                            flatIndex === activeIndex && "bg-blue-50"
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="truncate text-xs text-gray-500">{item.subtitle}</p>
                            )}
                          </div>
                          {item.badge && (
                            <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">
                              {item.badge.replace(/_/g, " ")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↑</kbd>{" "}
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↓</kbd> navigate
            </span>
            <span>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1">↵</kbd> open
            </span>
          </span>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">⌘/Ctrl</kbd> +
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

export { MODULE_CONFIG };