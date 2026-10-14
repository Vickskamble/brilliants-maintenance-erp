import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import type { ApproverContext } from "@/services/approvals";
import { submitForApproval } from "@/services/approvals";

export const CHANGE_TYPES = ["process", "equipment", "system", "material", "labeling", "documentation"] as const;
export const CHANGE_STATUSES = ["submitted", "risk_review", "approved", "implemented", "verified", "closed", "rejected"] as const;
export type ChangeStatus = (typeof CHANGE_STATUSES)[number];

export interface QmsChangeRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  change_no: string;
  title: string;
  description: string | null;
  change_type: string;
  risk_assessment: string | null;
  implementation_plan: string | null;
  verification_results: string | null;
  requested_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

export async function listChanges(
  scope: QueryScope,
  opts?: { search?: string; status?: string }
): Promise<{ data: QmsChangeRow[]; error: string | null }> {
  const supabase = createClient();
  let query = supabase.from("qms_changes").select("*");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  let rows = (data ?? []) as QmsChangeRow[];
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (c) => c.change_no.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }
  return { data: rows, error: null };
}

export async function getChange(id: string): Promise<{ data: QmsChangeRow | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.from("qms_changes").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as QmsChangeRow) ?? null, error: null };
}

export async function createChange(
  scope: QueryScope,
  user: { id?: string | null },
  input: {
    title: string;
    description?: string;
    change_type: string;
    risk_assessment?: string;
  }
): Promise<{ data?: QmsChangeRow; error: string | null }> {
  const supabase = createClient();
  const count = (await supabase.from("qms_changes").select("id", { count: "exact", head: true }).eq("organization_id", scope.organizationId)).count ?? 0;
  const changeNo = `CR-QA-${String(count + 1).padStart(4, "0")}`;
  const { data, error } = await supabase
    .from("qms_changes")
    .insert({
      organization_id: scope.organizationId,
      plant_id: scope.plantId,
      change_no: changeNo,
      title: input.title,
      description: input.description ?? null,
      change_type: input.change_type,
      risk_assessment: input.risk_assessment ?? null,
      requested_by: user.id ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data: data as QmsChangeRow, error: null };
}

export async function updateChange(
  id: string,
  patch: Partial<Pick<QmsChangeRow, "title" | "description" | "change_type" | "risk_assessment" | "implementation_plan" | "verification_results">>
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_changes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  return fmtError(error);
}

export async function moveChange(id: string, toStatus: ChangeStatus): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_changes")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  return fmtError(error);
}

export async function submitChangeForRiskApproval(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const { data: change } = await getChange(id);
  if (!change) return { created: false, error: "Change request not found" };
  return submitForApproval(scope, user, {
    entityType: "change",
    entityId: change.id,
    toStatus: "risk_review",
    fromTitle: change.title,
  });
}

export async function submitChangeForClosure(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: change } = await getChange(id);
  if (!change) return { created: false, error: "Change request not found" };
  const { error: statusError } = await supabase
    .from("qms_changes")
    .update({ status: "verified", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (statusError) return { created: false, error: statusError.message };
  return submitForApproval(scope, user, {
    entityType: "change",
    entityId: change.id,
    toStatus: "verified",
    fromTitle: change.title,
  });
}