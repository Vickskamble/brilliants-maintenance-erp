import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";

export interface WorkflowDefinitionRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  module: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepRow {
  id: string;
  workflow_definition_id: string;
  order_index: number;
  step_name: string;
  from_status: string;
  to_status: string;
  required_roles: string[] | null;
  require_approval: boolean;
  approval_role_code: string | null;
}

export interface WorkflowDefinitionWithSteps extends WorkflowDefinitionRow {
  workflow_steps: WorkflowStepRow[];
}

export interface SlaRuleRow {
  id: string;
  organization_id: string | null;
  plant_id: string | null;
  module: string;
  sla_type: string;
  priority: string | null;
  duration_minutes: number;
  escalation_user_id: string | null;
  escalation_role_code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function castRows<T>(data: unknown): T[] {
  return (data ?? []) as unknown as T[];
}

export async function listWorkflowDefinitions(
  scope: QueryScope
): Promise<{ data: WorkflowDefinitionWithSteps[]; error: string | null }> {
  const supabase = createClient();
  const select = "*, workflow_steps(order_index)";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from("workflow_definitions").select(select as any).order("name");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);

  const { data, error } = await query;
  return { data: castRows<WorkflowDefinitionWithSteps>(data), error: error?.message ?? null };
}

export async function createWorkflowDefinition(
  scope: QueryScope,
  input: { module: string; name: string; description?: string; steps: Omit<WorkflowStepRow, "id" | "workflow_definition_id">[] }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data: def, error: defError } = await supabase
    .from("workflow_definitions")
    .insert({
      organization_id: scope.organizationId ?? undefined,
      plant_id: scope.plantId ?? null,
      module: input.module,
      name: input.name,
      description: input.description ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (defError || !def) return { error: defError?.message ?? "Failed to create definition" };

  const steps = input.steps.map((step, index) => ({
    workflow_definition_id: def.id,
    order_index: step.order_index ?? index,
    step_name: step.step_name,
    from_status: step.from_status,
    to_status: step.to_status,
    required_roles: step.required_roles ?? null,
    require_approval: step.require_approval ?? false,
    approval_role_code: step.approval_role_code ?? null,
  }));

  const { error: stepsError } = await supabase.from("workflow_steps").insert(steps);
  if (stepsError) {
    await supabase.from("workflow_definitions").delete().eq("id", def.id);
    return { error: stepsError.message };
  }
  return { error: null };
}

export async function updateWorkflowDefinition(
  definition: WorkflowDefinitionWithSteps,
  input: { name: string; description?: string }
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workflow_definitions")
    .update({ name: input.name, description: input.description ?? null })
    .eq("id", definition.id);
  return { error: error?.message ?? null };
}

export async function replaceWorkflowSteps(
  definitionId: string,
  steps: Omit<WorkflowStepRow, "id" | "workflow_definition_id">[]
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error: deleteError } = await supabase.from("workflow_steps").delete().eq("workflow_definition_id", definitionId);
  if (deleteError) return { error: deleteError.message };

  const rows = steps.map((step, index) => ({
    workflow_definition_id: definitionId,
    order_index: step.order_index ?? index,
    step_name: step.step_name,
    from_status: step.from_status,
    to_status: step.to_status,
    required_roles: step.required_roles ?? null,
    require_approval: step.require_approval ?? false,
    approval_role_code: step.approval_role_code ?? null,
  }));
  const { error } = await supabase.from("workflow_steps").insert(rows);
  return { error: error?.message ?? null };
}

export async function setWorkflowDefinitionStatus(
  id: string,
  status: "active" | "inactive"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("workflow_definitions").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteWorkflowDefinition(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("workflow_definitions").delete().eq("id", id);
  return { error: error?.message ?? null };
}

/**
 * Allowed next statuses for a module+current status, derived from ACTIVE workflow
 * definitions. Returns [] when nothing is configured (callers keep default behavior).
 */
export async function getAllowedTransitions(
  module: string,
  currentStatus: string
): Promise<string[]> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await supabase
    .from("workflow_steps")
    .select("to_status, workflow_definitions(module, status)" as any)
    .eq("workflow_definitions.module", module)
    .eq("workflow_definitions.status", "active")
    .eq("from_status", currentStatus);

  const rows = castRows<{ to_status: string }>(data);
  return [...new Set(rows.map((row) => row.to_status))];
}

export async function listSlaRules(
  scope: QueryScope
): Promise<{ data: SlaRuleRow[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from("sla_rules").select("*" as any).order("module");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  // sla_rules.plant_id is not scoped for now (org-level default rules).

  const { data, error } = await query;
  return { data: castRows<SlaRuleRow>(data), error: error?.message ?? null };
}

export async function createSlaRule(
  scope: QueryScope,
  input: Omit<SlaRuleRow, "organization_id" | "plant_id" | "id" | "status" | "created_at" | "updated_at" | "escalation_user_id">
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("sla_rules").insert({
    organization_id: scope.organizationId ?? null,
    plant_id: scope.plantId ?? null,
    module: input.module,
    sla_type: input.sla_type,
    priority: input.priority ?? null,
    duration_minutes: input.duration_minutes,
    escalation_role_code: input.escalation_role_code ?? null,
    status: "active",
  });
  return { error: error?.message ?? null };
}

export async function updateSlaRule(
  id: string,
  input: Partial<Omit<SlaRuleRow, "id" | "organization_id" | "plant_id" | "created_at" | "updated_at">>
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("sla_rules").update(input).eq("id", id);
  return { error: error?.message ?? null };
}

export async function setSlaRuleStatus(
  id: string,
  status: "active" | "inactive"
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("sla_rules").update({ status }).eq("id", id);
  return { error: error?.message ?? null };
}