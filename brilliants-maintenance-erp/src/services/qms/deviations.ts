import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import type { ApproverContext } from "@/services/approvals";
import { submitForApproval } from "@/services/approvals";

export const DEVIATION_TYPES = ["process", "equipment", "material", "documentation", "environmental"] as const;
export const DEVIATION_SEVERITIES = ["minor", "major", "critical"] as const;
export const DEVIATION_STATUSES = ["open", "submitted", "approved", "actioned", "closed", "rejected"] as const;

export interface QmsDeviationRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  deviation_no: string;
  title: string;
  description: string | null;
  dev_type: string;
  severity: string;
  occurred_at: string | null;
  reported_by: string | null;
  reported_at: string;
  root_cause: string | null;
  investigation: string | null;
  action_plan: string | null;
  actions_completed_at: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

export async function listDeviations(
  scope: QueryScope,
  opts?: { search?: string; status?: string }
): Promise<{ data: QmsDeviationRow[]; error: string | null }> {
  const supabase = createClient();
  let query = supabase.from("qms_deviations").select("*");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  let rows = (data ?? []) as QmsDeviationRow[];
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (d) =>
        d.deviation_no.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q)
    );
  }
  return { data: rows, error: null };
}

export async function getDeviation(id: string): Promise<{ data: QmsDeviationRow | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.from("qms_deviations").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as QmsDeviationRow) ?? null, error: null };
}

export async function createDeviation(
  scope: QueryScope,
  user: { id?: string | null },
  input: {
    title: string;
    description?: string;
    dev_type: string;
    severity: string;
    occurred_at?: string;
  }
): Promise<{ data?: QmsDeviationRow; error: string | null }> {
  const supabase = createClient();
  const count = (await supabase.from("qms_deviations").select("id", { count: "exact", head: true }).eq("organization_id", scope.organizationId)).count ?? 0;
  const deviationNo = `DEV-QA-${String(count + 1).padStart(4, "0")}`;
  const { data, error } = await supabase
    .from("qms_deviations")
    .insert({
      organization_id: scope.organizationId,
      plant_id: scope.plantId,
      deviation_no: deviationNo,
      title: input.title,
      description: input.description ?? null,
      dev_type: input.dev_type,
      severity: input.severity,
      occurred_at: input.occurred_at ?? null,
      reported_by: user.id ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data: data as QmsDeviationRow, error: null };
}

export async function updateDeviation(
  id: string,
  patch: Partial<Pick<QmsDeviationRow, "title" | "description" | "dev_type" | "severity" | "occurred_at" | "root_cause" | "investigation" | "action_plan">>
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_deviations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  return fmtError(error);
}

export async function submitDeviationForApproval(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const { data: dev } = await getDeviation(id);
  if (!dev) return { created: false, error: "Deviation not found" };
  return submitForApproval(scope, user, {
    entityType: "deviation",
    entityId: dev.id,
    toStatus: "submitted",
    fromTitle: dev.title,
  });
}

export async function submitDeviationForClosure(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: dev } = await getDeviation(id);
  if (!dev) return { created: false, error: "Deviation not found" };
  const { error: statusError } = await supabase
    .from("qms_deviations")
    .update({ status: "actioned", actions_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (statusError) return { created: false, error: statusError.message };
  return submitForApproval(scope, user, {
    entityType: "deviation",
    entityId: dev.id,
    toStatus: "actioned",
    fromTitle: dev.title,
  });
}