import { createClient } from "@/lib/supabase/server";

export type MaintenanceScheduleRow = {
  id: string;
  schedule_no: string | null;
  equipment_id: string | null;
  task_type: string | null;
  frequency: string | null;
  interval_days: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  assigned_to: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getMaintenanceScheduleList(): Promise<{
  data: MaintenanceScheduleRow[] | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select("*")
    .order("next_run_at", { ascending: true });
  return { data: (data as unknown as MaintenanceScheduleRow[]) ?? null, error };
}

export async function getMaintenanceSchedule(id: string): Promise<{
  data: MaintenanceScheduleRow | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .select("*")
    .eq("id", id)
    .single();
  return { data: (data as unknown as MaintenanceScheduleRow) ?? null, error };
}

export async function createMaintenanceSchedule(
  payload: Partial<MaintenanceScheduleRow>
): Promise<{ data: MaintenanceScheduleRow | null; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .insert(payload)
    .select()
    .single();
  return { data: (data as unknown as MaintenanceScheduleRow) ?? null, error };
}

export async function updateMaintenanceSchedule(
  id: string,
  payload: Partial<MaintenanceScheduleRow>
): Promise<{ data: MaintenanceScheduleRow | null; error: Error | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as MaintenanceScheduleRow) ?? null, error };
}

export async function deleteMaintenanceSchedule(id: string): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("maintenance_schedules")
    .delete()
    .eq("id", id);
  return { data, error };
}
