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
  created_by: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

export async function getWorkOrderList(): Promise<{
  data: WorkOrderRow[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .select("*")
    .is("deleted_at", null)
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
    .is("deleted_at", null)
    .eq("id", id)
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function createWorkOrder(
  payload: Omit<WorkOrderRow, "id" | "created_at" | "updated_at">,
  actorId?: string
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const now = new Date().toISOString();
  const insertRow = {
    ...payload,
    ...(actorId
      ? {
          created_by: actorId,
          assigned_by: payload.assigned_to ? actorId : null,
          assigned_at: payload.assigned_to ? now : null,
        }
      : {}),
  };
  const { data, error } = await supabase
    .from("work_orders")
    .insert(insertRow)
    .select()
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function updateWorkOrder(
  id: string,
  payload: Partial<WorkOrderRow>,
  actorId?: string
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const actorFields: Partial<WorkOrderRow> = {};
  if (actorId && payload.assigned_to !== undefined) {
    const { data: current } = await supabase
      .from("work_orders")
      .select("assigned_to")
      .eq("id", id)
      .single();
    if ((current?.assigned_to ?? null) !== payload.assigned_to) {
      actorFields.assigned_by = payload.assigned_to ? actorId : null;
      actorFields.assigned_at = payload.assigned_to
        ? new Date().toISOString()
        : null;
    }
  }
  const { data, error } = await supabase
    .from("work_orders")
    .update({ ...payload, ...actorFields })
    .eq("id", id)
    .select()
    .single();
  return { data: (data as unknown as WorkOrderRow) ?? null, error };
}

export async function deleteWorkOrder(
  id: string,
  actorId?: string
): Promise<{
  data: unknown;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_orders")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: actorId ?? null,
    })
    .eq("id", id);
  return { data, error };
}

export async function updateWorkOrderStatus(
  id: string,
  status: string
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  return changeWorkOrderStatus(id, status);
}

export async function changeWorkOrderStatus(
  id: string,
  newStatus: string,
  remarks?: string,
  actorId?: string
): Promise<{ data: WorkOrderRow | null; error: Error | null }> {
  const supabase = createClient();
  const { data: current, error: fetchError } = await supabase
    .from("work_orders")
    .select("status, actual_start, actual_end, closed_by")
    .eq("id", id)
    .single();
  if (fetchError) return { data: null, error: fetchError };

  const oldStatus = current?.status;
  const now = new Date().toISOString();

  const updateFields: Record<string, string | boolean | null> = {
    status: newStatus,
  };
  if (newStatus === "in_progress" && !current?.actual_start) {
    updateFields.actual_start = now;
  }
  if (["completed", "closed", "verified"].includes(newStatus)) {
    if (!current?.actual_end) updateFields.actual_end = now;
    if (newStatus === "completed" || newStatus === "closed") {
      if (!current?.closed_by) updateFields.closed_by = actorId ?? null;
      updateFields.closed_at = now;
    }
  }

  const { data, error } = await supabase
    .from("work_orders")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error };

  if (oldStatus && oldStatus !== newStatus) {
    await supabase.from("work_order_status_history").insert({
      work_order_id: id,
      old_status: oldStatus,
      new_status: newStatus,
      remarks: remarks || null,
      changed_by: actorId ?? null,
    });
  }
  return { data: (data as unknown as WorkOrderRow) ?? null, error: null };
}

export interface WorkOrderStatusHistoryRow {
  id: string;
  work_order_id: string;
  old_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string | null;
  changed_at: string;
}

export async function getWorkOrderStatusHistory(
  workOrderId: string
): Promise<{
  data: WorkOrderStatusHistoryRow[] | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_order_status_history")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("changed_at", { ascending: false });
  return {
    data: (data as unknown as WorkOrderStatusHistoryRow[]) ?? null,
    error,
  };
}

export async function getWorkOrderActivities(
  workOrderId: string
): Promise<{ data: unknown[] | null; error: Error | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("work_order_activities")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("started_at", { ascending: false });
  return { data, error };
}
