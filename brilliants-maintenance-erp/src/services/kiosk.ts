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
  equipment: {
    equipment_code: string;
    equipment_name: string;
    plants: { name: string } | null;
    departments: { name: string } | null;
  } | null;
}

export interface EquipmentHubRow {
  id: string;
  equipment_code: string;
  equipment_name: string;
  qr_code: string | null;
  photo_url: string | null;
  status: string | null;
  plants: { name: string } | null;
  work_orders: KioskWorkOrder[];
  maintenance_schedules: KioskPm[];
}

const ACTIVE_ORDER_STATUSES = [
  "submitted",
  "approved",
  "assigned",
  "in_progress",
  "on_hold",
];

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function getMyWorkOrders(
  plantId?: string | null
): Promise<KioskWorkOrder[]> {
  const supabase = createClient();
  let query = supabase
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
    .in("status", ACTIVE_ORDER_STATUSES);
  if (plantId) {
    query = query.eq("plant_id", plantId);
  }
  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as unknown as KioskWorkOrder[]) ?? [];
}

export async function getDuePm(
  plantId?: string | null
): Promise<KioskPm[]> {
  const supabase = createClient();
  let query = supabase
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
      equipment:equipment_id(
        equipment_code,
        equipment_name,
        plants:plant_id(name),
        departments:department_id(name)
      )
    `
    )
    .eq("is_active", true)
    .lte("next_run_at", daysFromNow(7));
  if (plantId) {
    const { data: plantEquipment } = await supabase
      .from("equipment")
      .select("id")
      .eq("plant_id", plantId);
    const ids = (plantEquipment ?? []).map((e) => e.id);
    if (ids.length === 0) return [];
    query = query.in("equipment_id", ids);
  }
  const { data } = await query
    .order("next_run_at", { ascending: true })
    .limit(50);
  return (data as unknown as KioskPm[]) ?? [];
}

export async function getEquipmentHub(
  equipmentId: string,
  scope?: { organizationId?: string | null; plantId?: string | null }
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
      status,
      organization_id,
      plant_id,
      plants:plant_id(name)
    `
    )
    .eq("id", equipmentId)
    .single();
  if (!equipment) return null;
  if (
    scope?.organizationId &&
    equipment.organization_id &&
    equipment.organization_id !== scope.organizationId
  ) {
    return null;
  }
  if (
    scope?.plantId &&
    equipment.plant_id &&
    equipment.plant_id !== scope.plantId
  ) {
    return null;
  }

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
  q: string,
  scope?: { organizationId?: string | null; plantId?: string | null }
): Promise<Array<{ id: string; equipment_code: string; equipment_name: string; plants: { name: string } | null }>> {
  const supabase = createClient();
  const needle = q.replace(/[%,()]/g, " ").trim();
  if (!needle) return [];
  let query = supabase
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
  if (scope?.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope?.plantId) query = query.eq("plant_id", scope.plantId);
  const { data } = await query;
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
  user?: { id?: string; name?: string } | null,
  durationMinutes?: number | null
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const { data: sched } = await supabase
    .from("maintenance_schedules")
    .select(
      "interval_days, notes, equipment:equipment_id(id, status, organization_id, plant_id)"
    )
    .eq("id", scheduleId)
    .single();

  const equipment = (sched as unknown as {
    equipment?: { id: string; status: string; organization_id: string | null; plant_id: string | null } | null;
  } | null)?.equipment;

  if (equipment?.organization_id && scope.organizationId && equipment.organization_id !== scope.organizationId) {
    return { error: "You are not allowed to act on this schedule" };
  }
  if (equipment?.plant_id && scope.plantId && equipment.plant_id !== scope.plantId) {
    return { error: "This schedule belongs to another plant" };
  }

  let nextRunIso = nowIso;
  if (sched?.interval_days && sched.interval_days > 0) {
    nextRunIso = new Date(
      now.getTime() + sched.interval_days * 24 * 60 * 60 * 1000
    ).toISOString();
  } else {
    nextRunIso = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
  }

  const { error } = await supabase
    .from("maintenance_schedules")
    .update({
      last_run_at: nowIso,
      next_run_at: nextRunIso,
      notes: notes ?? (sched as { notes?: string | null } | null)?.notes ?? null,
    })
    .eq("id", scheduleId);

  if (error) return { error: error.message };

  if (equipment?.id) {
    const currentStatus = equipment.status;
    const eligible = ["under_maintenance", "standby", "breakdown"];
    if (currentStatus && eligible.includes(currentStatus)) {
      const eqRes = await supabase
        .from("equipment")
        .update({ status: "active" })
        .eq("id", equipment.id);
      if (eqRes.error) return { error: eqRes.error.message };
      const histRes = await supabase.from("equipment_status_history").insert({
        organization_id: scope.organizationId ?? null,
        equipment_id: equipment.id,
        old_status: currentStatus,
        new_status: "active",
        reason: "PM completed",
        changed_by: user?.id ?? null,
        changed_at: nowIso,
      });
      if (histRes.error) return { error: histRes.error.message };
    }
  }

  const audit: AuditInput = {
    action: "pm.completed",
    entityType: "maintenance_schedule",
    entityId: scheduleId,
    entityTitle: undefined,
    summary: notes ? `PM completed via kiosk: ${notes}` : "PM completed via kiosk",
    metadata: {
      last_run_at: nowIso,
      next_run_at: nextRunIso,
      duration_minutes: durationMinutes ?? null,
    },
  };
  await logAuditAction(
    scope as { organizationId: string | null; plantId: string | null },
    audit,
    user
  );

  const runLogRes = await supabase.from("maintenance_run_logs").insert({
    maintenance_schedule_id: scheduleId,
    equipment_id: equipment?.id ?? null,
    completed_at: nowIso,
    completed_by: user?.id ?? null,
    notes: notes ?? null,
    duration_minutes: durationMinutes ?? null,
    organization_id: scope.organizationId ?? null,
    plant_id: scope.plantId ?? null,
  });
  if (runLogRes.error) return { error: runLogRes.error.message };

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