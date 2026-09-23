"use client";

import { createClient } from "@/lib/supabase/client";
import { GetEquipmentsParams } from "./types";

export async function getEquipments(params?: GetEquipmentsParams) {
  const supabase = createClient();
  const {
    plantId,
    departmentId,
    categoryId,
    criticalityId,
    status,
    manufacturer,
    search,
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase
    .from("equipment")
    .select(
      `
      id,
      equipment_code,
      equipment_name,
      plant_id,
      category_id,
      criticality_id,
      status,
      manufacturer,
      make,
      model,
      serial_number,
      location_id,
      created_at,
      asset_categories(name),
      criticality_profiles(name, level),
      plants(name),
      locations(name)
    `,
      { count: "exact" }
    )
    .order("equipment_code");

  if (plantId) query = query.eq("plant_id", plantId);
  if (departmentId) query = query.eq("department_id", departmentId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (criticalityId) query = query.eq("criticality_id", criticalityId);
  if (status) query = query.eq("status", status);
  if (manufacturer) query = query.ilike("manufacturer", `%${manufacturer}%`);
  if (search) {
    query = query.or(
      `equipment_code.ilike.%${search}%,equipment_name.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  return {
    data:
      (data as Array<{
        id: string;
        equipment_code: string;
        equipment_name: string;
        plant_id: string;
        category_id: string | null;
        criticality_id: string | null;
        status: string;
        manufacturer: string | null;
        make: string | null;
        model: string | null;
        serial_number: string | null;
        location_id: string | null;
        created_at: string;
asset_categories: { name: string }[];
        criticality_profiles: { name: string; level: string }[];
        plants: { name: string }[];
        locations: { name: string }[];
      }>) ?? [],
    count: count ?? 0,
    error,
  };
}

export async function getEquipment(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("equipment")
    .select(
      `
      *,
      asset_categories(name),
      criticality_profiles(name, level),
      plants(name),
      locations(name),
      departments(name),
      sections(name),
      areas(name),
      cost_centers(name),
      equipment:parent_equipment_id(id, equipment_code, equipment_name),
      suppliers:vendors(code, name)
    `
    )
    .eq("id", id)
    .single();

  return { data, error };
}

export async function createEquipment(values: Record<string, unknown>) {
  const supabase = createClient();
  return supabase.from("equipment").insert(values).select().single();
}

export async function updateEquipment(
  id: string,
  values: Record<string, unknown>
) {
  const supabase = createClient();
  return supabase.from("equipment").update(values).eq("id", id).select().single();
}

export async function archiveEquipment(id: string) {
  const supabase = createClient();
  return supabase
    .from("equipment")
    .update({ status: "decommissioned" })
    .eq("id", id)
    .select()
    .single();
}

export async function changeEquipmentStatus(
  id: string,
  newStatus: string,
  reason?: string
) {
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
      organization_id: data.organization_id,
      equipment_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      reason: reason || null,
    });
  }

  return { data, error: null };
}

export async function getEquipmentComponents(equipmentId: string) {
  const supabase = createClient();
  return supabase
    .from("equipment_components")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("component_code");
}

export async function getEquipmentStatusHistory(equipmentId: string) {
  const supabase = createClient();
  return supabase
    .from("equipment_status_history")
    .select("*")
    .eq("equipment_id", equipmentId)
    .order("changed_at", { ascending: false });
}

export async function addEquipmentComponent(values: Record<string, unknown>) {
  const supabase = createClient();
  return supabase
    .from("equipment_components")
    .insert(values)
    .select()
    .single();
}

export async function updateEquipmentComponent(
  id: string,
  values: Record<string, unknown>
) {
  const supabase = createClient();
  return supabase
    .from("equipment_components")
    .update(values)
    .eq("id", id)
    .select()
    .single();
}

export async function deleteEquipmentComponent(id: string) {
  const supabase = createClient();
  return supabase.from("equipment_components").delete().eq("id", id);
}
