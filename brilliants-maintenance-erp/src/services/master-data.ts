import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";

export type MasterTable =
  | "departments"
  | "sections"
  | "areas"
  | "locations"
  | "cost_centers"
  | "asset_categories"
  | "criticality_profiles";

// Tables scoped to a plant (in addition to the organization).
const PLANT_SCOPED: MasterTable[] = [
  "departments",
  "sections",
  "areas",
  "locations",
  "cost_centers",
];

// Tables are organization-scoped only (no plant_id column).
const ORG_ONLY: MasterTable[] = ["asset_categories", "criticality_profiles"];

export type MasterRow = Record<string, unknown>;

export async function listMasterData(
  table: MasterTable,
  scope: QueryScope
): Promise<{ data: MasterRow[]; error: string | null }> {
  const supabase = createClient();
  const select = `${table === "sections" ? "*, departments(name)" : table === "areas" ? "*, sections(name)" : table === "locations" ? "*, areas(name)" : table === "asset_categories" ? "*, asset_categories(name)" : "*"}`;

  let query = supabase.from(table).select(select).order("name");
  if (ORG_ONLY.includes(table)) {
    if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  } else {
    if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
    if (PLANT_SCOPED.includes(table) && scope.plantId) query = query.eq("plant_id", scope.plantId);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as unknown as MasterRow[], error: error?.message ?? null };
}

export async function createMasterData(
  table: MasterTable,
  values: Record<string, unknown>,
  scope: QueryScope
): Promise<{ id: string | null; error: string | null }> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...values };
  if (scope.organizationId) payload.organization_id = scope.organizationId;
  if (PLANT_SCOPED.includes(table) && scope.plantId) payload.plant_id = scope.plantId;

  const { error } = await supabase.from(table).insert(payload).select("id");
  if (error) return { id: null, error: error.message };
  return { id: null, error: null };
}

export async function updateMasterData(
  table: MasterTable,
  id: string,
  values: Record<string, unknown>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from(table).update(values).eq("id", id);
  return { error: error?.message ?? null };
}

export async function setMasterDataStatus(
  table: MasterTable,
  id: string,
  status: "active" | "inactive"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function loadParentOptions(
  table: MasterTable
): Promise<{ value: string; label: string }[]> {
  const supabase = createClient();
  if (table === "sections") {
    const { data } = await supabase.from("departments").select("id, name").order("name");
    return (data ?? []).map((row) => ({ value: row.id, label: row.name }));
  }
  if (table === "areas") {
    const { data } = await supabase.from("sections").select("id, name").order("name");
    return (data ?? []).map((row) => ({ value: row.id, label: row.name }));
  }
  if (table === "locations") {
    const { data } = await supabase.from("areas").select("id, name").order("name");
    return (data ?? []).map((row) => ({ value: row.id, label: row.name }));
  }
  return [];
}