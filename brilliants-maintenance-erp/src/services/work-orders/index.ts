import { createClient } from "@/lib/supabase/client";
import { GetWorkOrdersParams } from "./types";

export async function getWorkOrders(params?: GetWorkOrdersParams) {
  const supabase = createClient();

  const {
    plantId,
    equipmentId,
    type,
    priority,
    status,
    search,
    page = 1,
    pageSize = 10,
  } = params || {};

  let query = supabase
    .from("work_orders")
    .select(
      `
      id,
      work_order_no,
      plant_id,
      equipment_id,
      type,
      priority,
      status,
      title,
      planned_start,
      planned_end,
      actual_start,
      actual_end,
      verified_at,
      closed_at,
      created_at,
      plants(name),
      equipment(equipment_code, equipment_name)
    `,
      { count: "exact" }
    )
    .order("work_order_no");

  if (plantId) query = query.eq("plant_id", plantId);
  if (equipmentId) query = query.eq("equipment_id", equipmentId);
  if (type) query = query.eq("type", type);
  if (priority) query = query.eq("priority", priority);
  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(
      `work_order_no.ilike.%${search}%,title.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);

  return {
    data:
      (data as Array<{
        id: string;
        work_order_no: string;
        plant_id: string;
        equipment_id: string | null;
        type: string;
        priority: string;
        status: string;
        title: string;
        planned_start: string | null;
        planned_end: string | null;
        actual_start: string | null;
        actual_end: string | null;
        verified_at: string | null;
        closed_at: string | null;
        created_at: string;
        plants: { name: string }[];
        equipment: { equipment_code: string; equipment_name: string }[];
      }>) ?? [],
    count: count ?? 0,
    error,
  };
}

export async function getWorkOrder(id: string) {
  const supabase = createClient();
  return supabase
    .from("work_orders")
    .select(
      `
      *,
      plants(name),
      equipment(equipment_code, equipment_name),
      maintenance_plans(plan_code, name),
      work_requests(work_request_no)
    `
    )
    .eq("id", id)
    .single();
}

export async function createWorkOrder(values: Record<string, unknown>) {
  const supabase = createClient();
  return supabase.from("work_orders").insert(values).select().single();
}

export async function updateWorkOrder(
  id: string,
  values: Record<string, unknown>
) {
  const supabase = createClient();
  return supabase
    .from("work_orders")
    .update(values)
    .eq("id", id)
    .select()
    .single();
}

export async function changeWorkOrderStatus(
  id: string,
  newStatus: string,
  remarks?: string
) {
  const supabase = createClient();

  const { data: current, error: fetchError } = await supabase
    .from("work_orders")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  const oldStatus = current?.status;

  const { data, error } = await supabase
    .from("work_orders")
    .update({ status: newStatus })
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
    });
  }

  return { data, error: null };
}

export async function cancelWorkOrder(id: string) {
  const supabase = createClient();
  return changeWorkOrderStatus(id, "cancelled", "Work order cancelled");
}

export async function archiveWorkOrder(id: string) {
  const supabase = createClient();
  return changeWorkOrderStatus(id, "closed", "Work order closed");
}

export async function getWorkOrderStatusHistory(id: string) {
  const supabase = createClient();
  return supabase
    .from("work_order_status_history")
    .select("*")
    .eq("work_order_id", id)
    .order("changed_at", { ascending: false });
}

export async function getWorkOrderActivities(workOrderId: string) {
  const supabase = createClient();
  return supabase
    .from("work_order_activities")
    .select("*")
    .eq("work_order_id", workOrderId)
    .order("started_at", { ascending: false });
}

export async function addWorkOrderActivity(values: Record<string, unknown>) {
  const supabase = createClient();
  return supabase
    .from("work_order_activities")
    .insert(values)
    .select()
    .single();
}

export async function deleteWorkOrderActivity(id: string) {
  const supabase = createClient();
  return supabase.from("work_order_activities").delete().eq("id", id);
}
