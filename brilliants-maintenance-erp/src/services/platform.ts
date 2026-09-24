import { createClient } from "@/lib/supabase/client";
import { queryScopeFilters } from "@/lib/auth/query-scope";
import type { QueryScope } from "@/lib/auth/query-scope";

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export interface AuditLogRow {
  id: string;
  organization_id: string | null;
  plant_id: string | null;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_title: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AttachmentRow {
  id: string;
  organization_id: string | null;
  plant_id: string | null;
  entity_type: string;
  entity_id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number;
  content: string | null;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
  created_at: string;
}

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: string;
  entityTitle?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function logAuditAction(
  scope: QueryScope,
  input: AuditInput,
  user?: { id?: string; name?: string } | null
): Promise<void> {
  const supabase = createClient();
  await supabase.from("audit_logs").insert({
    organization_id: scope.organizationId ?? undefined,
    plant_id: scope.plantId ?? null,
    user_id: user?.id ?? null,
    user_name: user?.name ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    entity_title: input.entityTitle ?? null,
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function listAuditLogs(
  scope: QueryScope,
  opts: { entityType?: string; limit?: number } = {}
): Promise<{ data: AuditLogRow[]; error: string | null }> {
  const supabase = createClient();
  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  const filters = queryScopeFilters(scope);
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  if (opts.entityType) query = query.eq("entity_type", opts.entityType);
  const { data, error } = await query;
  return { data: (data ?? []) as AuditLogRow[], error: error?.message ?? null };
}

export async function listAttachmentTypes(): Promise<{ value: string; label: string }[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("audit_logs").select("entity_type");
  if (error || !data) return [];
  const set = new Set<string>();
  for (const r of data) if (r.entity_type) set.add(r.entity_type);
  return [...set]
    .sort()
    .map((v) => ({ value: v, label: v.replace(/_/g, " ") }));
}

export async function uploadAttachment(
  scope: QueryScope,
  input: {
    entityType: string;
    entityId: string;
    file: File;
    user?: { id?: string; name?: string } | null;
  }
): Promise<{ id: string | null; error: string | null }> {
  if (input.file.size > MAX_ATTACHMENT_BYTES) {
    return { id: null, error: "File too large (max 2 MB)." };
  }
  const content = await fileToBase64(input.file);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .insert({
      organization_id: scope.organizationId ?? undefined,
      plant_id: scope.plantId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      file_name: input.file.name,
      content_type: input.file.type || null,
      size_bytes: input.file.size,
      content,
      uploaded_by: input.user?.id ?? null,
      uploaded_by_name: input.user?.name ?? null,
    })
    .select("id")
    .single();
  if (error) return { id: null, error: error.message };
  return { id: data?.id ?? null, error: null };
}

export async function listAttachments(
  scope: QueryScope,
  entityType: string,
  entityId: string
): Promise<{ data: AttachmentRow[]; error: string | null }> {
  const supabase = createClient();
  let query = supabase
    .from("attachments")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  const filters = queryScopeFilters(scope);
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val);
  }
  const { data, error } = await query;
  return { data: (data ?? []) as AttachmentRow[], error: error?.message ?? null };
}

export async function deleteAttachment(
  scope: QueryScope,
  id: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("attachments")
    .delete()
    .eq("id", id)
    .eq("organization_id", scope.organizationId ?? "");
  return { error: error?.message ?? null };
}

export function attachmentDownloadUrl(a: AttachmentRow): string | null {
  if (!a.content) return null;
  const mime = a.content_type || "application/octet-stream";
  return `data:${mime};base64,${a.content}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}