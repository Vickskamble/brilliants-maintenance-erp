import { createClient } from "@/lib/supabase/client";
import type {
  SearchGroup,
  SearchModule,
  SearchResponse,
  SearchResultItem,
} from "./types";

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function orFilter(escaped: string, fields: string[]): string {
  return fields.map((field) => `${field}.ilike.%${escaped}%`).join(",");
}

async function searchTabled(
  table: "work_orders" | "equipment" | "spare_parts" | "vendors" | "maintenance_schedules" | "breakdowns",
  module: SearchModule,
  fields: string[],
  select: Record<string, string>,
  scopes: Array<"org" | "plant">,
  orgId: string | null,
  plantId: string | null,
  q: string
): Promise<SearchGroup | null> {
  if (q.trim().length < 2) return null;
  const supabase = createClient();
  const escaped = escapeLike(q.trim());

  let query = supabase
    .from(table)
    .select(Object.keys(select).join(", "))
    .or(orFilter(escaped, fields))
    .limit(5);

  if (scopes.includes("org") && orgId) query = query.eq("organization_id", orgId);
  if (scopes.includes("plant") && plantId) query = query.eq("plant_id", plantId);

  const { data, error } = await query;
  if (error || !data) return null;

  const rows = data as unknown as Record<string, unknown>[];
  const items: SearchResultItem[] = rows.map((row) => ({
    id: String(row.id),
    title: String(row[select.title] ?? ""),
    subtitle: select.subtitle ? (row[select.subtitle] as string | null) : null,
    badge: select.badge ? (row[select.badge] as string | null) : null,
  }));

  if (items.length === 0) return null;
  return { module, items };
}

export async function searchGlobal(
  orgId: string | null,
  plantId: string | null,
  q: string
): Promise<SearchResponse> {
  const results = await Promise.all([
    searchTabled(
      "equipment",
      "equipment",
      ["equipment_code", "equipment_name"],
      { title: "equipment_name", subtitle: "equipment_code", badge: "status" },
      ["org", "plant"],
      orgId,
      plantId,
      q
    ),
    searchTabled(
      "work_orders",
      "work_orders",
      ["work_order_no", "title"],
      { title: "title", subtitle: "work_order_no", badge: "status" },
      ["org", "plant"],
      orgId,
      plantId,
      q
    ),
    searchTabled(
      "spare_parts",
      "spare_parts",
      ["part_code", "part_name"],
      { title: "part_name", subtitle: "part_code", badge: "category" },
      ["plant"],
      orgId,
      plantId,
      q
    ),
    searchTabled(
      "vendors",
      "vendors",
      ["vendor_code", "name"],
      { title: "name", subtitle: "vendor_code", badge: "vendor_type" },
      ["org"],
      orgId,
      plantId,
      q
    ),
    searchTabled(
      "maintenance_schedules",
      "maintenance",
      ["schedule_no", "task_type"],
      { title: "schedule_no", subtitle: "task_type" },
      [],
      orgId,
      plantId,
      q
    ),
    searchTabled(
      "breakdowns",
      "breakdowns",
      ["breakdown_no", "problem_description"],
      { title: "problem_description", subtitle: "breakdown_no", badge: "status" },
      ["org", "plant"],
      orgId,
      plantId,
      q
    ),
  ]);

  return { groups: results.filter((group): group is SearchGroup => group !== null) };
}