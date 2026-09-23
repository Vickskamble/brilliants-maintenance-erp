import { createClient } from "@/lib/supabase/client";

export type WorkOrderRow = {
  id: string;
  work_order_no: string;
  title: string;
  type: string | null;
  priority: string | null;
  status: string | null;
  plant_id: string | null;
  equipment_id: string | null;
  assigned_to: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  description: string | null;
  closure_remarks: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getWorkOrderList(): Promise<{
  data: WorkOrderRow[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .order("created_at", { ascending: false });
  return { data: (data as unknown as WorkOrderRow[]) ?? null, error };
}

export async function getWorkOrder(id: string): Promise<{
  data: WorkOrderRow | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .eq("id", id)
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function createWorkOrder(
  payload: Omit<WorkOrderRow, "id" | "created_at" | "updated_at">
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .insert(payload)
    .select()
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function updateWorkOrder(
  id: string,
  payload: Partial<WorkOrderRow>
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function deleteWorkOrder(id: string): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.from("work_orders").delete().eq("id", id);
  return { data, error };
}

export async function updateWorkOrderStatus(
  id: string,
  status: string
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}
