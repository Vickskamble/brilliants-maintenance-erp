-- Phase 9 (part 2): central audit_logs + db-backed attachments.
-- Both use the existing additive pattern (idempotent DDL, RLS for authenticated,
-- org/plant scoped by the app layer).

-- ---------- audit_logs ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  plant_id uuid,
  user_id uuid,
  user_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_title text,
  summary text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);
create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

create policy "erp_allow_access_audit_logs"
  on public.audit_logs for all to authenticated
  using (true) with check (true);
create policy "erp_allow_service_audit_logs"
  on public.audit_logs for all to service_role
  using (true) with check (true);

-- ---------- attachments (db-backed store, base64 in `content`) ----------
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  plant_id uuid,
  entity_type text not null,
  entity_id text not null,
  file_name text not null,
  content_type text,
  size_bytes integer not null default 0,
  content text,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists attachments_entity_idx
  on public.attachments (entity_type, entity_id);

alter table public.attachments enable row level security;

create policy "erp_allow_access_attachments"
  on public.attachments for all to authenticated
  using (true) with check (true);
create policy "erp_allow_service_attachments"
  on public.attachments for all to service_role
  using (true) with check (true);

-- Convenience: remove an attachment row in one go (kept simple on purpose).
create or replace function public.delete_attachment(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.attachments where id = p_id;
end;
$$;