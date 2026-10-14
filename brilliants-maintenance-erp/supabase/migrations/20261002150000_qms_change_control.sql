-- ============================================================
-- QMS Change Control: CCB risk review and change verification.
-- Additive; applied after M4.
-- ============================================================

create table if not exists public.qms_changes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  change_no text not null,
  title text not null,
  description text,
  change_type text not null default 'process',
  risk_assessment text,
  implementation_plan text,
  verification_results text,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, change_no)
);

create index if not exists idx_qms_changes_org_status on public.qms_changes (organization_id, status);

alter table public.qms_changes enable row level security;

drop policy if exists erp_org_select_qms_changes on public.qms_changes;
drop policy if exists erp_org_insert_qms_changes on public.qms_changes;
drop policy if exists erp_org_update_qms_changes on public.qms_changes;
drop policy if exists erp_org_delete_qms_changes on public.qms_changes;

create policy erp_org_select_qms_changes on public.qms_changes
  for select to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_insert_qms_changes on public.qms_changes
  for insert to authenticated
  with check (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_update_qms_changes on public.qms_changes
  for update to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()))
  with check (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_org_delete_qms_changes on public.qms_changes
  for delete to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

-- demo change for BRI
insert into public.qms_changes (id, organization_id, plant_id, change_no, title, description, change_type, status)
values (
  'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'CR-QA-0001',
  'PID loop tuning change on furnace F-101',
  'Change the PID tuning parameters and re-validate batch profile.',
  'process',
  'submitted'
)
on conflict (organization_id, change_no) do nothing;