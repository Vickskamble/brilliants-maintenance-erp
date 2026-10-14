import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const TOKEN = process.env.AUTOMATION_TOKEN ?? "";

interface OverdueApproval {
  id: string;
  organization_id: string | null;
  plant_id: string | null;
  entity_type: string;
  entity_id: string;
  due_at: string | null;
  requested_by: string | null;
  step?: {
    step_name?: string;
    to_status?: string;
    approval_role_code?: string | null;
    approver_user_id?: string | null;
  } | null;
}

export async function POST(req: NextRequest) {
  const headerSecret =
    req.headers.get("x-automation-secret") ??
    req.headers.get("authorization") ??
    "";
  const secret = headerSecret.startsWith("Bearer ")
    ? headerSecret.slice(7)
    : headerSecret;
  if (!TOKEN || secret !== TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const admin = createAdminClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // -- overdue pending approvals that have not been escalated yet --
  const { data, error } = await admin
    .from("workflow_approvals")
    .select(
      `id, organization_id, plant_id, entity_type, entity_id, due_at, requested_by,
       workflow_steps(step_name, to_status, approval_role_code, approver_user_id)`
    )
    .eq("status", "pending")
    .is("escalated_at", null)
    .not("due_at", "is", null)
    .lte("due_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as OverdueApproval[];
  let escalated = 0;
  let notified = 0;

  for (const row of rows) {
    const step = row.step ?? {};
    const stepName = step.step_name ?? "Approval";
    const dueLabel = row.due_at
      ? new Date(row.due_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : "due";

    // idempotent escalation marker
    const { error: escalationError } = await admin
      .from("workflow_approvals")
      .update({ escalated_at: new Date().toISOString(), escalation_note: `Automatically escalated ${dueLabel}` })
      .eq("id", row.id);
    if (escalationError) continue;
    escalated++;

    // resolve who holds this approval role (or specific approver)
    const targets = new Set<string>();
    if (step.approver_user_id) targets.add(step.approver_user_id);
    if (step.approval_role_code && row.organization_id) {
      const { data: holders } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("user_roles.roles.organization_id", row.organization_id)
        .eq("user_roles.roles.code", step.approval_role_code);
      for (const h of holders ?? []) {
        targets.add((h as { user_id: string }).user_id);
      }
    }
    if (row.requested_by) targets.add(row.requested_by);

    if (targets.size === 0) continue;

    const link = QMS_LINKS[row.entity_type]
      ? `${QMS_LINKS[row.entity_type]}${row.entity_id}`
      : "/approvals";

    const { error: notifError } = await admin.from("app_notifications").insert(
      [...targets].map((userId) => ({
        organization_id: row.organization_id,
        plant_id: row.plant_id,
        user_id: userId,
        type: "approval_required",
        title: `Approval overdue: ${stepName}`,
        message: `The ${stepName} approval has passed its due time (${dueLabel}). Please act now.`,
        link,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
      }))
    );
    if (!notifError) notified += targets.size;
  }

  return NextResponse.json({ success: true, escalated, notified });
}

const QMS_LINKS: Record<string, string> = {
  document: "/quality/documents/",
  deviation: "/quality/deviations/",
  capa: "/quality/capas/",
  change: "/quality/change-control/",
  work_order: "/work-orders/",
  material_request: "/inventory/requests/",
  purchase_order: "/inventory/orders/",
};