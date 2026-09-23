import { createClient } from "@/lib/supabase/server";

export type SparePartRow = {
  id: string;
  part_code: string;
  part_name: string;
  category: string | null;
  unit: string | null;
  stock_level: number;
  reorder_level: number;
  min_stock: number;
  plant_id: string;
};

export async function getSparePart(id: string): Promise<{
  data: SparePartRow | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_parts")
    .select("*")
    .eq("id", id)
    .single();
  return { data: (data as unknown as SparePartRow) ?? null, error };
}

export async function addSparePartComponent(
  sparePartId: string,
  payload: { part_code: string; part_name: string; quantity: number }
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_part_components")
    .insert({ spare_part_id: sparePartId, ...payload })
    .select()
    .single();
  return { data, error };
}

export async function getSparePartComponents(sparePartId: string): Promise<{
  data: unknown[] | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_part_components")
    .select("*")
    .eq("spare_part_id", sparePartId)
    .order("part_name");
  return { data, error };
}

export async function updateSparePartComponent(
  id: string,
  payload: Record<string, unknown>
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_part_components")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteSparePartComponent(id: string): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_part_components")
    .delete()
    .eq("id", id);
  return { data, error };
}

export async function getSparePartStockHistory(sparePartId: string): Promise<{
  data: unknown[] | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spare_part_stock_movements")
    .select("*")
    .eq("spare_part_id", sparePartId)
    .order("created_at", { ascending: false });
  return { data, error };
}
