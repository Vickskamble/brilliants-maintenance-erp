import type { ERPSavedView } from "./erp-table-types";

const STORAGE_PREFIX = "erp:saved-view:";

function storageKey(tableKey: string): string {
  return `${STORAGE_PREFIX}${tableKey}`;
}

export function loadSavedViews(tableKey: string): ERPSavedView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(tableKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ERPSavedView[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedViews(
  tableKey: string,
  views: ERPSavedView[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(tableKey), JSON.stringify(views));
  } catch {
    // storage may be unavailable (private mode / quota) — ignore
  }
}