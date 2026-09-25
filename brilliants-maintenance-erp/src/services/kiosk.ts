import { createClient } from "@/lib/supabase/client";
import { logAuditAction, type AuditInput } from "@/services/platform";
import { changeWorkOrderStatus } from "@/services/work-orders";

export interface KioskWorkOrder {
  id: string;
  work_order_no: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  equipment_id: string | null;
  planned_end: string | null;
  created_at: string;
  equipment: { equipment_code: string; equipment_name: string } | null;
  plants: { name: string } | null;
}

export interface KioskPm {
  id: string;
  schedule_no: string | null;
  task_type: string | null;
  interval_days: number | null;
  last_run_at: string | null;
  next_run_at: string | null;
  assigned_to: string | null;
  is_active: boolean | null;
  equipment_id: string | null;
  equipment: { equipment_code: string; equipment_name: string } | null;
  plants: { name: string } | null;
}

export interface EquipmentHubRow {
  id: string;
  equipment_code: string;
  equipment_name: string;
  qr_code: string | null;
  photo_url: string | null;
  plants: { name: string } | null;
  work_orders: KioskWorkOrder[];
  maintenance_schedules: KioskPm[];
}

const ACTIVE_ORDER_STATUSES = ["assigned", "in_progress", "on_hold"];

function actorOr(name?: string, email?: string): string {
  const parts: string[] = [];
  if (name) parts.push(`assigned_to.ilike.%${name}%`);
  if (email) parts.push(`assigned_to.ilike.%${email}%`);
  return parts.join(",");
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getMyWorkOrders(
  name?: string,
  email?: string
): Promise<KioskWorkOrder[]> {
  const supabase = createClient();
  const orParts = actorOr(name, email);
  if (!orParts) return [];
  const { data } = await supabase
    .from("work_orders")
    .select(
      `
      id,
      work_order_no,
      title,
      type,
      priority,
      status,
      assigned_to,
      equipment_id,
      planned_end,
      created_at,
      equipment:equipment_id(equipment_code, equipment_name),
      plants:plant_id(name)
    `
    )
    .is("deleted_at", null)
    .in("status", ACTIVE_ORDER_STATUSES)
    .or(orParts)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as KioskWorkOrder[]) ?? [];
}

export async function getDuePm(
  name?: string,
  email?: string
): Promise<KioskPm[]> {
  const supabase = createClient();
  const orParts = actorOr(name, email);
  if (!orParts) return [];
  const { data } = await supabase
    .from("maintenance_schedules")
    .select(
      `
      id,
      schedule_no,
      task_type,
      interval_days,
      last_run_at,
      next_run_at,
      assigned_to,
      is_active,
      equipment_id,
      equipment:equipment_id(equipment_code, equipment_name),
      plants:plant_id(name)
    `
    )
    .eq("is_active", true)
    .lte("next_run_at", daysFromNow(7))
    .or(orParts)
    .order("next_run_at", { ascending: true })
    .limit(50);
  return (data as unknown as KioskPm[]) ?? [];
}

export async function getEquipmentHub(
  equipmentId: string
): Promise<EquipmentHubRow | null> {
  const supabase = createClient();
  const { data: equipment } = await supabase
    .from("equipment")
    .select(
      `
      id,
      equipment_code,
      equipment_name,
      qr_code,
      photo_url,
      plants:plant_id(name)
    `
    )
    .eq("id", equipmentId)
    .single();
  if (!equipment) return null;

  const hubBase = equipment as unknown as Omit<EquipmentHubRow, "work_orders" | "maintenance_schedules">;

  const [woRes, pmRes] = await Promise.all([
    supabase
      .from("work_orders")
      .select(
        `
        id,
        work_order_no,
        title,
        type,
        priority,
        status,
        assigned_to,
        planned_end,
        created_at,
        plants:plant_id(name)
      `
      )
      .eq("equipment_id", equipmentId)
      .is("deleted_at", null)
      .in("status", ACTIVE_ORDER_STATUSES)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("maintenance_schedules")
      .select(
        `
        id,
        schedule_no,
        task_type,
        interval_days,
        last_run_at,
        next_run_at,
        assigned_to,
        is_active
      `
      )
      .eq("equipment_id", equipmentId)
      .eq("is_active", true)
      .lte("next_run_at", daysFromNow(7))
      .order("next_run_at", { ascending: true })
      .limit(100),
  ]);

  return {
    ...hubBase,
    work_orders: (woRes.data as unknown as KioskWorkOrder[]) ?? [],
    maintenance_schedules: (pmRes.data as unknown as KioskPm[]) ?? [],
  };
}

export async function searchEquipment(
  q: string
): Promise<Array<{ id: string; equipment_code: string; equipment_name: string; plants: { name: string } | null }>> {
  const supabase = createClient();
  const needle = q.replace(/[%_]/g, "");
  if (!needle) return [];
  const { data } = await supabase
    .from("equipment")
    .select(
      `
      id,
      equipment_code,
      equipment_name,
      plants:plant_id(name)
    `
    )
    .or(`equipment_code.ilike.%${needle}%,equipment_name.ilike.%${needle}%`)
    .limit(8);
  return (
    (data as unknown as Array<{
      id: string;
      equipment_code: string;
      equipment_name: string;
      plants: { name: string } | null;
    }>) ?? []
  );
}

export async function performPm(
  scheduleId: string,
  notes: string | null,
  scope: { organizationId?: string | null; plantId?: string | null },
  user?: { id?: string; name?: string } | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: sched } = await supabase
    .from("maintenance_schedules")
    .select("interval_days, notes")
    .eq("id", scheduleId)
    .single();

  let nextRunIso = nowIso;
  if (sched?.interval_days && sched.interval_days > 0) {
    nextRunIso = new Date(
      now.getTime() + sched.interval_days * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const { error } = await supabase
    .from("maintenance_schedules")
    .update({
      last_run_at: nowIso,
      next_run_at: nextRunIso,
      notes: notes ?? sched?.notes ?? null,
    })
    .eq("id", scheduleId);

  if (error) return { error: error.message };

  const audit: AuditInput = {
    action: "pm.completed",
    entityType: "maintenance_schedule",
    entityId: scheduleId,
    entityTitle: undefined,
    summary: notes ? `PM completed via kiosk: ${notes}` : "PM completed via kiosk",
    metadata: { last_run_at: nowIso, next_run_at: nextRunIso },
  };
  await logAuditAction(
    scope as { organizationId: string | null; plantId: string | null },
    audit,
    user
  );
  return { error: null };
}

export async function updateWorkOrderStatusKiosk(
  workOrderId: string,
  newStatus: string,
  userId?: string
): Promise<{ error: string | null }> {
  const { error } = await changeWorkOrderStatus(
    workOrderId,
    newStatus,
    undefined,
    userId
  );
  return { error: error ? error.message : null };
}