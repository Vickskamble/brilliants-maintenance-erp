export type SearchModule =
  | "work_orders"
  | "equipment"
  | "spare_parts"
  | "vendors"
  | "maintenance"
  | "breakdowns";

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
}

export interface SearchGroup {
  module: SearchModule;
  items: SearchResultItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}