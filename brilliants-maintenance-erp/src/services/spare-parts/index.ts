import { createClient } from "@/lib/supabase/client";
import { GetSparePartsParams, GetStockMovementsParams } from "./types";

export async function getSpareParts(params?: GetSparePartsParams) {
  const supabase = createClient();
  const {
    plantId,
    category,
    search,
    lowStockOnly = false,
    outOfStockOnly = false,
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase.from("spare_parts").select(
    "*, spare_part_plants!inner(quantity, plant_id)"
  );

  if (plantId) {
    // Filter parts available in a specific plant
    query = query.filter("spare_part_plants.plant_id", "eq", plantId);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (search) {
    query = query.or(`part_code.ilike.%${search}%,part_name.ilike.%${search}%`);
  }

  if (lowStockOnly) {
    query = query.lt("current_stock", "reorder_level");
  }
  if (outOfStockOnly) {
    query = query.eq("current_stock", 0);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1     - 1;
  query = query.range(from, to).order("part_code");

  const { data, error, count } = await query;
  return { data: data || [], error, count };
}

export async function getSparePart(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("spare_parts")
    .select("*")
    .eq("id", id)
    .single();
  return { data, error };
}

export async function createSparePart(values: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("spare_parts").insert(values).select().single();
  return { data, error };
}

export async function updateSparePart(id: string, values: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("spare_parts").update(values).eq("id", id).select().single();
  return { data, error };
}

export async function deleteSparePart(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase.from("spare_parts").delete().eq("id", id);
  return { error };
}

export async function getStockMovements(params?: GetStockMovementsParams) {
  const supabase = createClient();
  const {
    partId,
    plantId,
    movementType,
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase.from("stock_movements").select("*", { count: "exact" });

  if (partId) query = query.eq("part_id", partId);
  if (plantId) query = query.eq("plant_id", plantId);
  if (movementType) query = query.eq("movement_type", movementType);

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1).order("created_at", { ascending: false });

  const { data, error, count } = await query;
  return { data: data || [], error, count };
}

export async function createStockMovement(values: Record<string, unknown>) {
  const supabase = createClient();
  const { data, error } = await supabase.from("stock_movements").insert(values).select().single();
  return { data, error };
}

export async function getTrackingRecords(workOrderId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, work_orders!inner(id, work_order_no)")
    .eq("work_order_id", workOrderId)
    .order("created_at", { ascending: false });
  return { data: data || [], error };
}

export async function getPlants() {
  const supabase = createClient();
  const { data, error } = await supabase.from("plants").select("id, name").order("name");
  return { data: data || [], error };
}
