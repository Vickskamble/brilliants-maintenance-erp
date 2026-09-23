import { createClient } from "@/lib/supabase/client";

export type EquipmentRow = {
  id: string;
  equipment_code: string;
  equipment_name: string;
  plant_id: string;
  category_id: string | null;
  status: string | null;
  criticality_id: string | null;
};

export async function getEquipmentList(): Promise<{
  data: EquipmentRow[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select(
      "id, equipment_code, equipment_name, plant_id, category_id, status, criticality_id, plants(name), asset_categories(name)"
    )
    .order("equipment_code");
  return { data: (data as unknown as EquipmentRow[]) ?? null, error };
}

export async function getEquipment(id: string): Promise<{
  data: (EquipmentRow & { description?: string | null }) | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select("*")
    .eq("id", id)
    .single();
  return { data: (data as unknown as EquipmentRow) ?? null, error };
}

export async function addEquipmentComponent(
  equipmentId: string,
  payload: {
    component_name: string;
    component_type?: string | null;
    serial_number?: string | null;
    criticality?: string | null;
    specification?: string | null;
    part_code_ref?: string | null;
  }
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment_components")
    .insert({ equipment_id: equipmentId, ...payload })
    .select()
    .single();
  return { data, error };
}

export async function getEquipmentComponents(equipmentId: string): Promise<{
  data: unknown[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment_components")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("component_name");
  return { data, error };
}

export async function updateEquipmentComponent(
  id: string,
  payload: Record<string, unknown>
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment_components")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function deleteEquipmentComponent(id: string): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment_components")
    .delete()
    .eq("id", id);
  return { data, error };
}

export async function getEquipmentStatusHistory(equipmentId: string): Promise<{
  data: unknown[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment_status_history")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("created_at", { ascending: false });
  return { data, error };
}

export async function updateEquipment(
  id: string,
  payload: Record<string, unknown>
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data, error };
}

export async function changeEquipmentStatus(
  id: string,
  newStatus: string,
  reason?: string
): Promise<{ data: unknown; error: Error | null }> {
  const supabase = createClient();
  const { data: current, error: fetchError } = await supabase
    .from("equipment")
    .select("status")
    .eq("id", id)
    .single();
  if (fetchError) return { data: null, error: fetchError };

  const oldStatus = current?.status;
  const { data, error } = await supabase
    .from("equipment")
    .update({ status: newStatus })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error };

  if (oldStatus && oldStatus !== newStatus) {
    await supabase.from("equipment_status_history").insert({
      equipment_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      reason: reason || null,
    });
  }
  return { data, error: null };
}
