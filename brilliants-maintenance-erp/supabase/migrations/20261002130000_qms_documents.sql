-- ============================================================
-- QMS Documents: controlled documents (SOP / WI / FORM / POLICY)
-- Revisioned master records. Additive; applied after M2.
-- ============================================================

create table if not exists public.qms_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  doc_code text not null,
  title text not null,
  doc_type text not null default 'SOP',
  revision integer not null default 0,
  status text not null default 'draft',
  department_id uuid references public.departments(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  owner_name text,
  effective_date timestamptz,
  review_date timestamptz,
  storage_path text,
  tags text[] not null default '{}',
  version_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, doc_code, revision)
);

create index if not exists idx_qms_documents_org_status on public.qms_documents (organization_id, doc_code, revision desc);
create index if not exists idx_qms_documents_owner on public.qms_documents (owner_id);

alter table public.qms_documents enable row level security;

drop policy if exists erp_org_select_qms_documents on public.qms_documents;
drop policy if exists erp_org_insert_qms_documents on public.qms_documents;
drop policy if exists erp_org_update_qms_documents on public.qms_documents;
drop policy if exists erp_org_delete_qms_documents on public.qms_documents;

create policy erp_org_select_qms_documents on public.qms_documents
  for select to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_insert_qms_documents on public.qms_documents
  for insert to authenticated
  with check (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_update_qms_documents on public.qms_documents
  for update to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()))
  with check (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_delete_qms_documents on public.qms_documents
  for delete to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

-- demo SOP for BRI
insert into public.qms_documents (
  id, organization_id, plant_id, doc_code, title, doc_type, revision,
  status, tags, version_notes, owner_name, created_by
)
values (
  '88888888-8888-8888-8888-888888888001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'SOP-QA-0001',
  'Furnace SOP: startup and shutdown procedure',
  'SOP',
  0,
  'approved',
  array['furnace', 'operations'],
  'Initial release',
  'Document Control',
  null
)
on conflict (organization_id, doc_code, revision) do nothing;