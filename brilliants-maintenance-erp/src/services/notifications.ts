import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "pm_due"
  | "pm_overdue"
  | "calibration_due"
  | "wo_assigned"
  | "breakdown_sla"
  | "low_stock"
  | "approval_required";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  pm_due: "PM Due",
  pm_overdue: "PM Overdue",
  calibration_due: "Calibration Due",
  wo_assigned: "Work Order Assigned",
  breakdown_sla: "SLA Breach",
  low_stock: "Low Stock",
  approval_required: "Approval Required",
};

export interface AppNotificationRow {
  id: string;
  organization_id: string | null;
  plant_id: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferenceRow {
  id: string;
  user_id: string;
  type: string;
  in_app: boolean;
  email: boolean;
  created_at: string;
  updated_at: string;
}

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

export async function refreshNotifications(): Promise<string | null> {
  const supabase: SupabaseClient = createClient();
  const { error } = await supabase.rpc("refresh_my_notifications");
  return fmtError(error);
}

export async function listAppNotifications(opts?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<{ data: AppNotificationRow[]; error: string | null }> {
  const supabase: SupabaseClient = createClient();
  let query = supabase
    .from("app_notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (opts?.unreadOnly) query = query.is("read_at", null);
  if (opts?.limit) query = query.limit(opts.limit);

  const { data, error } = await query;
  return { data: (data as AppNotificationRow[]) ?? [], error: fmtError(error) };
}

export async function listUnreadNotificationCount(): Promise<number> {
  const supabase: SupabaseClient = createClient();
  const { data, error } = await supabase.rpc("get_unread_notifications_count");
  if (error) return 0;
  return typeof data === "number" ? data : 0;
}

export async function markNotificationRead(id: string): Promise<string | null> {
  const supabase: SupabaseClient = createClient();
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  return fmtError(error);
}

export async function markAllNotificationsRead(): Promise<string | null> {
  const supabase: SupabaseClient = createClient();
  const { error } = await supabase
    .from("app_notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  return fmtError(error);
}

export async function listNotificationPreferences(): Promise<{
  data: NotificationPreferenceRow[];
  error: string | null;
}> {
  const supabase: SupabaseClient = createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .order("type", { ascending: true });
  return { data: (data as NotificationPreferenceRow[]) ?? [], error: fmtError(error) };
}

export async function updateNotificationPreference(
  userId: string,
  type: string,
  patch: Partial<Pick<NotificationPreferenceRow, "in_app" | "email">>
): Promise<string | null> {
  const supabase: SupabaseClient = createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      type,
      in_app: patch.in_app ?? true,
      email: patch.email ?? false,
    },
    { onConflict: "user_id,type" }
  );
  return fmtError(error);
}

export const APP_NOTIFICATION_TYPES: NotificationType[] = [
  "pm_due",
  "pm_overdue",
  "calibration_due",
  "wo_assigned",
  "breakdown_sla",
  "low_stock",
  "approval_required",
];