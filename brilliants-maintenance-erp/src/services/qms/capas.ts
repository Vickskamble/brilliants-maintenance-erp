import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import type { ApproverContext } from "@/services/approvals";
import { submitForApproval } from "@/services/approvals";

export const CAPA_SOURCE_TYPES = ["deviation", "audit", "complaint", "internal", "customer"] as const;
export const CAPA_RISKS = ["low", "medium", "high", "critical"] as const;
export const CAPA_STATUSES = ["initiated", "submitted", "approved", "implemented", "closed", "rejected"] as const;

export interface QmsCapaRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  capa_no: string;
  title: string;
  description: string | null;
  source_type: string;
  source_id: string | null;
  source_ref: string | null;
  risk_level: string;
  root_cause: string | null;
  corrective_action: string | null;
  preventive_action: string | null;
  effectiveness_check: string | null;
  implemented_at: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

export async function listCapas(
  scope: QueryScope,
  opts?: { search?: string; status?: string }
): Promise<{ data: QmsCapaRow[]; error: string | null }> {
  const supabase = createClient();
  let query = supabase.from("qms_capas").select("*");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);
  if (opts?.status) query = query.eq("status", opts.status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  let rows = (data ?? []) as QmsCapaRow[];
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    rows = rows.filter(
      (c) => c.capa_no.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    );
  }
  return { data: rows, error: null };
}

export async function getCapa(id: string): Promise<{ data: QmsCapaRow | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase.from("qms_capas").select("*").eq("id", id).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as QmsCapaRow) ?? null, error: null };
}

export async function createCapa(
  scope: QueryScope,
  user: { id?: string | null },
  input: {
    title: string;
    description?: string;
    source_type: string;
    source_ref?: string;
    risk_level: string;
  }
): Promise<{ data?: QmsCapaRow; error: string | null }> {
  const supabase = createClient();
  const count = (await supabase.from("qms_capas").select("id", { count: "exact", head: true }).eq("organization_id", scope.organizationId)).count ?? 0;
  const capaNo = `CAPA-QA-${String(count + 1).padStart(4, "0")}`;
  const { data, error } = await supabase
    .from("qms_capas")
    .insert({
      organization_id: scope.organizationId,
      plant_id: scope.plantId,
      capa_no: capaNo,
      title: input.title,
      description: input.description ?? null,
      source_type: input.source_type,
      source_ref: input.source_ref ?? null,
      risk_level: input.risk_level,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data: data as QmsCapaRow, error: null };
}

export async function updateCapa(
  id: string,
  patch: Partial<Pick<QmsCapaRow, "title" | "description" | "source_type" | "source_ref" | "risk_level" | "root_cause" | "corrective_action" | "preventive_action" | "effectiveness_check">>
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_capas")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  return fmtError(error);
}

export async function submitCapaForApproval(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const { data: capa } = await getCapa(id);
  if (!capa) return { created: false, error: "CAPA not found" };
  return submitForApproval(scope, user, {
    entityType: "capa",
    entityId: capa.id,
    toStatus: "submitted",
    fromTitle: capa.title,
  });
}

export async function submitCapaForClosure(
  scope: QueryScope,
  user: ApproverContext,
  id: string
): Promise<{ created: boolean; error: string | null }> {
  const supabase = createClient();
  const { data: capa } = await getCapa(id);
  if (!capa) return { created: false, error: "CAPA not found" };
  const { error: statusError } = await supabase
    .from("qms_capas")
    .update({ status: "implemented", implemented_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (statusError) return { created: false, error: statusError.message };
  return submitForApproval(scope, user, {
    entityType: "capa",
    entityId: capa.id,
    toStatus: "implemented",
    fromTitle: capa.title,
  });
}