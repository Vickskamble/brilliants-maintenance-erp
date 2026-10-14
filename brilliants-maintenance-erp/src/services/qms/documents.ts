import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import type { ApproverContext } from "@/services/approvals";
import { submitForApproval } from "@/services/approvals";
import { uploadQmsDocument, removeQmsDocument } from "@/services/qms/storage";

export const DOC_TYPES = ["SOP", "WI", "POLICY", "FORM", "RECORD"] as const;
export const DOC_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "effective",
  "superseded",
  "withdrawn",
  "rejected",
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export interface QmsDocumentRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  doc_code: string;
  title: string;
  doc_type: string;
  revision: number;
  status: string;
  department_id: string | null;
  owner_id: string | null;
  owner_name: string | null;
  effective_date: string | null;
  review_date: string | null;
  storage_path: string | null;
  tags: string[];
  version_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const DOC_PREFIX: Record<string, string> = {
  SOP: "SOP",
  WI: "WI",
  POLICY: "POL",
  FORM: "FRM",
  RECORD: "REC",
};

function fmtError(error: { message?: string } | null): string | null {
  return error?.message ? error.message : null;
}

function scopedQuery(scope: QueryScope, supabase: ReturnType<typeof createClient>) {
  let query = supabase.from("qms_documents").select("*");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);
  return query;
}

/** Latest revision per doc_code within the current scope, newest first. */
export async function listDocuments(
  scope: QueryScope,
  opts?: { search?: string; status?: string }
): Promise<{ data: QmsDocumentRow[]; error: string | null }> {
  const supabase = createClient();
  const query = scopedQuery(scope, supabase).order("revision", { ascending: true });
  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as QmsDocumentRow[];
  const byCode = new Map<string, QmsDocumentRow>();
  for (const row of rows) {
    const existing = byCode.get(row.doc_code);
    if (!existing || row.revision > existing.revision) byCode.set(row.doc_code, row);
  }
  let latest = [...byCode.values()].sort((a, b) =>
    b.doc_code.localeCompare(a.doc_code)
  );
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    latest = latest.filter(
      (d) =>
        d.doc_code.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        (d.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  }
  if (opts?.status) latest = latest.filter((d) => d.status === opts.status);
  return { data: latest, error: null };
}

export async function getDocument(docId: string): Promise<{ data: QmsDocumentRow | null; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qms_documents")
    .select("*")
    .eq("id", docId)
    .maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: (data as QmsDocumentRow) ?? null, error: null };
}

export async function listDocumentRevisions(
  docId: string
): Promise<{ data: QmsDocumentRow[]; error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("qms_documents")
    .select("*")
    .eq("id", docId)
    .order("revision", { ascending: true });
  if (error) return { data: [], error: error.message };
  const latest = (data as QmsDocumentRow[])[0];
  if (!latest) return { data: [], error: null };
  const { data: revisions, error: revError } = await supabase
    .from("qms_documents")
    .select("*")
    .eq("organization_id", latest.organization_id)
    .eq("doc_code", latest.doc_code)
    .eq("plant_id", latest.plant_id)
    .order("revision", { ascending: false });
  if (revError) return { data: [], error: revError.message };
  return { data: (revisions ?? []) as QmsDocumentRow[], error: null };
}

async function nextDocCode(scope: QueryScope, docType: string): Promise<string> {
  const supabase = createClient();
  const prefix = DOC_PREFIX[docType] ?? "DOC";
  const { count } = await supabase
    .from("qms_documents")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", scope.organizationId)
    .ilike("doc_code", `${prefix}-%`);
  return `${prefix}-QA-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export async function createDocument(
  scope: QueryScope,
  input: {
    title: string;
    doc_type: string;
    department_id?: string | null;
    owner_id?: string | null;
    owner_name?: string | null;
    tags?: string[];
    version_notes?: string | null;
  }
): Promise<{ data?: QmsDocumentRow; error: string | null }> {
  const supabase = createClient();
  const docCode = await nextDocCode(scope, input.doc_type);
  const { data, error } = await supabase
    .from("qms_documents")
    .insert({
      organization_id: scope.organizationId,
      plant_id: scope.plantId,
      doc_code: docCode,
      title: input.title,
      doc_type: input.doc_type,
      revision: 0,
      status: "draft",
      department_id: input.department_id ?? null,
      owner_id: input.owner_id ?? null,
      owner_name: input.owner_name ?? null,
      tags: input.tags ?? [],
      version_notes: input.version_notes ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  return { data: data as QmsDocumentRow, error: null };
}

export async function updateDocumentFields(
  docId: string,
  patch: Partial<Pick<QmsDocumentRow, "title" | "doc_type" | "tags" | "department_id" | "owner_name">>
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_documents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", docId);
  return fmtError(error);
}

/** Creates the next revision (Rev+1, status draft) and returns its row. */
export async function uploadRevision(
  scope: QueryScope,
  input: {
    docId: string;
    file: File;
    versionNotes?: string;
  }
): Promise<{ data?: QmsDocumentRow; error: string | null }> {
  const supabase = createClient();
  const { data: current, error: getError } = await getDocument(input.docId);
  if (getError || !current) return { error: getError ?? "Document not found" };

  const { path, error: uploadError } = await uploadQmsDocument(input.file, "documents");
  if (uploadError) return { error: uploadError };

  const { data, error } = await supabase
    .from("qms_documents")
    .insert({
      organization_id: current.organization_id,
      plant_id: current.plant_id,
      doc_code: current.doc_code,
      title: current.title,
      doc_type: current.doc_type,
      revision: current.revision + 1,
      status: "draft",
      department_id: current.department_id,
      owner_id: current.owner_id,
      owner_name: current.owner_name,
      tags: current.tags,
      storage_path: path,
      version_notes: input.versionNotes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    await removeQmsDocument(path!);
    return { error: error.message };
  }
  return { data: data as QmsDocumentRow, error: null };
}

/** Submits the current (latest) revision into the document release workflow. */
export async function submitDocumentForApproval(
  scope: QueryScope,
  user: ApproverContext,
  docId: string
): Promise<{ created: boolean; error: string | null }> {
  const { data: doc, error } = await getDocument(docId);
  if (error || !doc) return { created: false, error: error ?? "Document not found" };
  return submitForApproval(scope, user, {
    entityType: "document",
    entityId: doc.id,
    toStatus: "submitted",
    fromTitle: doc.title,
  });
}

export async function moveDocument(
  docId: string,
  toStatus: DocStatus
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_documents")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", docId);
  return fmtError(error);
}

export async function setDocumentStoragePath(docId: string, path: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("qms_documents")
    .update({ storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", docId);
  return fmtError(error);
}