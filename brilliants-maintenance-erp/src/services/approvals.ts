import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryScope } from "@/lib/auth/query-scope";
import { logAuditAction } from "@/services/platform";
import { changeWorkOrderStatus } from "@/services/work-orders";
import { setMaterialRequestStatus, setPurchaseOrderStatus } from "@/services/procurement";

export type ApprovalDecision = "approved" | "rejected";

export interface ApproverContext {
  userId: string;
  userName: string;
  roleCodes: string[];
  hasPermission: (module: string, action: string) => boolean;
}

export interface ApprovalStep {
  id: string;
  workflow_definition_id: string;
  order_index: number;
  step_name: string;
  from_status: string;
  to_status: string;
  required_roles: string[] | null;
  require_approval: boolean;
  approval_role_code: string | null;
  approver_user_id: string | null;
  require_reject_reason: boolean;
  condition: Record<string, unknown> | null;
  notify_role_codes: string[] | null;
}

export interface ApprovalDefinition {
  id: string;
  module: string;
  name: string;
  status: string;
  plant_id: string | null;
}

export interface ApprovalRow {
  id: string;
  workflow_definition_id: string;
  workflow_instance_id: string | null;
  step_id: string;
  entity_type: string;
  entity_id: string;
  requested_by: string | null;
  approved_by: string | null;
  status: ApprovalDecision | "pending";
  comments: string | null;
  requested_at: string;
  decided_at: string | null;
  step?: ApprovalStep;
  definition?: ApprovalDefinition;
}

export interface PendingApproval extends ApprovalRow {
  step_name: string;
  to_status: string;
  approved_label: string;
  entity_title: string;
  entity_no: string;
  entity_link: string;
}

export interface ResolvedApproval extends ApprovalRow {
  step_name: string | null;
  entity_title: string;
  entity_no: string;
  entity_link: string;
}

export function moduleForEntity(entityType: string): string {
  return entityType === "work_order" ? "work_order" : "inventory";
}

function rejectTarget(entityType: string): string {
  return entityType === "purchase_order" ? "cancelled" : "rejected";
}

function entityMeta(entityType: string): { module: string; table: string; noCol: string; link: (id: string) => string } {
  if (entityType === "work_order") {
    return { module: "work_order", table: "work_orders", noCol: "work_order_no", link: (id) => `/work-orders/${id}` };
  }
  if (entityType === "material_request") {
    return { module: "inventory", table: "material_requests", noCol: "request_no", link: () => "/inventory/requests" };
  }
  return { module: "inventory", table: "purchase_orders", noCol: "po_no", link: () => "/inventory/orders" };
}

function castRows<T>(data: unknown): T[] {
  return (data ?? []) as unknown as T[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Active approval-requiring step for a module whose from_status is `entityNewStatus`.
 * Returns null when the flow has no approval gate at that point.
 */
export async function getApprovalStep(
  module: string,
  entityNewStatus: string
): Promise<{ step: ApprovalStep; definition: ApprovalDefinition } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workflow_steps")
    .select(
      "*, workflow_definitions(id, module, name, status, plant_id)"
    )
    .eq("workflow_definitions.module", module)
    .eq("workflow_definitions.status", "active")
    .eq("from_status", entityNewStatus)
    .eq("require_approval", true)
    .order("order_index", { ascending: true })
    .limit(1);

  const rows = castRows<ApprovalStep & { workflow_definitions: ApprovalDefinition }>(data);
  const row = rows[0];
  if (!row) return null;
  const { workflow_definitions: def, ...step } = row;
  return { step, definition: def };
}

async function setEntityStatus(entityType: string, entityId: string, status: string, actorId?: string, remarks?: string): Promise<string | null> {
  if (entityType === "work_order") {
    const { error } = await changeWorkOrderStatus(entityId, status, remarks, actorId);
    return error?.message ?? null;
  }
  if (entityType === "material_request") {
    return (await setMaterialRequestStatus(entityId, status)).error;
  }
  return (await setPurchaseOrderStatus(entityId, status)).error;
}

async function recordApprovalActivity(
  scope: QueryScope,
  user: ApproverContext,
  input: { action: string; entityType: string; entityId: string; metadata?: Record<string, unknown> }
): Promise<void> {
  const supabase = createClient();
  await supabase.from("activity_log").insert({
    organization_id: scope.organizationId ?? undefined,
    plant_id: scope.plantId ?? null,
    user_id: user.userId,
    module: moduleForEntity(input.entityType),
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {},
  });
  await logAuditAction(
    scope,
    {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.action,
      metadata: input.metadata ?? {},
    },
    { id: user.userId, name: user.userName }
  );
}

/**
 * Submits an entity for approval. Moves the entity to `toStatus` (e.g. submitted) and,
 * when an active approval-requiring step starts at that status, creates the workflow
 * instance + pending approval record. Returns `created: false` when no approval gate
 * is configured so callers can fall back to their existing direct transition.
 */
export async function submitForApproval(
  scope: QueryScope,
  user: ApproverContext,
  input: {
    entityType: string;
    entityId: string;
    toStatus: string;
    fromTitle?: string;
  }
): Promise<{ created: boolean; error: string | null }> {
  const module = moduleForEntity(input.entityType);
  const gate = await getApprovalStep(module, input.toStatus);
  if (!gate) return { created: false, error: null };

  const supabase = createClient();
  const { data: instance, error: instanceError } = await supabase
    .from("workflow_instances")
    .insert({
      workflow_definition_id: gate.definition.id,
      entity_type: input.entityType,
      entity_id: input.entityId,
      current_step_id: gate.step.id,
      current_status: input.toStatus,
      status: "active",
      entity_current_status: input.toStatus,
    })
    .select("id")
    .single();
  if (instanceError || !instance) return { created: false, error: instanceError?.message ?? "Failed to start workflow" };

  const { error: approvalError } = await supabase.from("workflow_approvals").insert({
    workflow_definition_id: gate.definition.id,
    workflow_instance_id: instance.id,
    step_id: gate.step.id,
    entity_type: input.entityType,
    entity_id: input.entityId,
    requested_by: user.userId,
    status: "pending",
    comments: input.fromTitle ?? null,
  });
  if (approvalError) {
    await supabase.from("workflow_instances").delete().eq("id", instance.id);
    return { created: false, error: approvalError.message };
  }

  const statusError = await setEntityStatus(input.entityType, input.entityId, input.toStatus, user.userId);
  if (statusError) return { created: false, error: statusError };

  await recordApprovalActivity(scope, user, {
    action: "submit_for_approval",
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { to_status: input.toStatus, step: gate.step.step_name },
  });
  return { created: true, error: null };
}

async function fetchApprovalRow(id: string): Promise<ApprovalRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workflow_approvals")
    .select("*, workflow_steps(*), workflow_definitions(id, module, name, status, plant_id)")
    .eq("id", id)
    .single();
  if (!data) return null;
  const { workflow_steps: step, workflow_definitions: definition, ...approval } = data as any;
  return { ...approval, step, definition } as ApprovalRow;
}

/** Whether the user may act on the pending approval (permission + role gating). */
export function canActOnApproval(
  ctx: ApproverContext,
  approval: Pick<ApprovalRow, "requested_by" | "entity_type" | "step">,
  action: "approve" | "reject"
): boolean {
  if (approval.requested_by === ctx.userId) return false;
  const step = approval.step;
  if (!step) return false;

  const permModule = moduleForEntity(approval.entity_type);
  if (!ctx.hasPermission(permModule, action)) return false;

  if (step.approver_user_id && step.approver_user_id !== ctx.userId) return false;
  if (step.approval_role_code && !ctx.roleCodes.includes(step.approval_role_code)) return false;
  if (
    step.required_roles &&
    step.required_roles.length > 0 &&
    !step.required_roles.some((code) => ctx.roleCodes.includes(code))
  ) {
    return false;
  }
  return true;
}

/**
 * Approves or rejects a pending approval, applying the resulting status change on the
 * entity and recording the decision + audit trail.
 */
export async function decideApproval(
  scope: QueryScope,
  user: ApproverContext,
  input: { approvalId: string; decision: ApprovalDecision; comment?: string }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const approval = await fetchApprovalRow(input.approvalId);
  if (!approval) return { error: "Approval request not found" };
  if (approval.status !== "pending") return { error: "Approval already decided" };
  if (!approval.step) return { error: "Approval step not configured" };

  const action = input.decision === "approved" ? "approve" : "reject";
  if (!canActOnApproval(user, approval, action)) {
    return { error: `You are not allowed to ${action} this request` };
  }
  if (input.decision === "rejected" && !(input.comment ?? "").trim()) {
    return { error: "A rejection reason is required" };
  }
  const comment = (input.comment ?? "").trim() || null;

  const targetStatus =
    input.decision === "approved" ? approval.step.to_status : rejectTarget(approval.entity_type);

  const { error: updateError } = await supabase
    .from("workflow_approvals")
    .update({
      status: input.decision,
      approved_by: user.userId,
      comments: comment,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.approvalId);
  if (updateError) return { error: updateError.message };

  if (approval.workflow_instance_id) {
    await supabase
      .from("workflow_instances")
      .update({
        status: input.decision === "approved" ? "completed" : "rejected",
        completed_at: new Date().toISOString(),
        entity_updated_status: targetStatus,
      })
      .eq("id", approval.workflow_instance_id);
  }

  const statusError = await setEntityStatus(approval.entity_type, approval.entity_id, targetStatus, user.userId, comment ?? undefined);
  if (statusError) return { error: statusError };

  await recordApprovalActivity(scope, user, {
    action: input.decision === "approved" ? "approve" : "reject",
    entityType: approval.entity_type,
    entityId: approval.entity_id,
    metadata: { decision: input.decision, comment, step: approval.step.step_name, to_status: targetStatus },
  });
  return { error: null };
}

async function resolveEntityTitles(approvals: PendingApproval[]): Promise<PendingApproval[]> {
  if (approvals.length === 0) return approvals;
  const supabase = createClient();
  const groups = new Map<string, string[]>();
  for (const a of approvals) {
    const list = groups.get(a.entity_type) ?? [];
    list.push(a.entity_id);
    groups.set(a.entity_type, list);
  }
  const titleMap = new Map<string, { title: string; no: string }>();
  for (const [entityType, ids] of groups) {
    const meta = entityMeta(entityType);
    const { data } = await supabase
      .from(meta.table)
      .select(`id, ${meta.noCol} as no, title`)
      .in("id", [...new Set(ids)]);
    for (const row of (data ?? []) as any[]) {
      titleMap.set(`${entityType}:${row.id}`, { title: row.title ?? "Untitled", no: row.no ?? "" });
    }
  }
  return approvals.map((a) => {
    const meta = entityMeta(a.entity_type);
    const info = titleMap.get(`${a.entity_type}:${a.entity_id}`);
    return {
      ...a,
      step_name: a.step?.step_name ?? a.step_name ?? "Approval",
      to_status: a.step?.to_status ?? a.to_status ?? "approved",
      approved_label: a.step?.to_status?.replace(/_/g, " ") ?? "Approved",
      entity_title: info?.title ?? "Untitled",
      entity_no: info?.no ?? "",
      entity_link: meta.link(a.entity_id),
    };
  });
}

/** Pending approvals this user is allowed to decide. */
export async function listPendingApprovals(ctx: ApproverContext): Promise<{ data: PendingApproval[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_approvals")
    .select("*, workflow_steps(*), workflow_definitions(id, module, name, status, plant_id)")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  const rows = castRows<any>(data);
  const approvals = rows
    .map((row) => {
      const { workflow_steps: step, workflow_definitions: definition, ...approval } = row;
      return { ...approval, step, definition } as ApprovalRow;
    })
    .filter((a) => canActOnApproval(ctx, a, "approve"));
  return { data: await resolveEntityTitles(approvals as unknown as PendingApproval[]), error: null };
}

export async function countPendingApprovals(ctx: ApproverContext): Promise<number> {
  const { data } = await listPendingApprovals(ctx);
  return data.length;
}

/** History for a single entity (used by approval panel). */
export async function listApprovalHistory(
  entityType: string,
  entityId: string
): Promise<{ data: ResolvedApproval[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_approvals")
    .select("*, workflow_steps(step_name, to_status)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("requested_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  const meta = entityMeta(entityType);
  const resolved: ResolvedApproval[] = (data ?? []).map((row: any) => ({
    ...row,
    step_name: row.workflow_steps?.step_name ?? null,
    approved_label: row.workflow_steps?.to_status?.replace(/_/g, " ") ?? "Approved",
    entity_title: "",
    entity_no: "",
    entity_link: meta.link(entityId),
  }));
  return { data: resolved, error: null };
}

/** The most recent pending approval for an entity, if any. */
export async function getPendingApprovalForEntity(
  entityType: string,
  entityId: string
): Promise<ApprovalRow | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workflow_approvals")
    .select("*, workflow_steps(*), workflow_definitions(id, module, name, status, plant_id)")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("status", "pending")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const { workflow_steps: step, workflow_definitions: definition, ...approval } = data as any;
  return { ...approval, step, definition } as ApprovalRow;
}

/** Approvals requested by `userId`. */
export async function listMyApprovalRequests(userId: string): Promise<{ data: PendingApproval[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("workflow_approvals")
    .select("*, workflow_steps(*), workflow_definitions(id, module, name, status, plant_id)")
    .eq("requested_by", userId)
    .order("requested_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  const rows = castRows<any>(data);
  const approvals = rows.map((row) => {
    const { workflow_steps: step, workflow_definitions: definition, ...approval } = row;
    return { ...approval, step, definition } as ApprovalRow;
  }) as unknown as PendingApproval[];
  return { data: await resolveEntityTitles(approvals), error: null };
}