-- ============================================================
-- QMS Deviations and CAPA: investigational records with
-- QA Officer (L1) and QA Manager (L2) release gates.
-- Additive; applied after M3.
-- ============================================================

create table if not exists public.qms_deviations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  deviation_no text not null,
  title text not null,
  description text,
  dev_type text not null default 'process',
  severity text not null default 'minor',
  occurred_at timestamptz,
  reported_by uuid references public.profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  root_cause text,
  investigation text,
  action_plan text,
  actions_completed_at timestamptz,
  status text not null default 'open',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, deviation_no)
);

create index if not exists idx_qms_deviations_org_status on public.qms_deviations (organization_id, status);

create table if not exists public.qms_capas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  capa_no text not null,
  title text not null,
  description text,
  source_type text not null default 'deviation',
  source_id uuid,
  source_ref text,
  risk_level text not null default 'medium',
  root_cause text,
  corrective_action text,
  preventive_action text,
  effectiveness_check text,
  implemented_at timestamptz,
  status text not null default 'initiated',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, capa_no)
);

create index if not exists idx_qms_capas_org_status on public.qms_capas (organization_id, status);

do $$
declare
  t text;
begin
  foreach t in array array['qms_deviations', 'qms_capas']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists erp_org_select_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_insert_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_update_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_delete_%I on public.%I;', t, t);
    execute format('create policy erp_org_select_%I on public.%I for select to authenticated using (app_is_system_admin() or (app_current_org_id() <> '''' and organization_id::text = app_current_org_id()));', t, t);
    execute format('create policy erp_org_insert_%I on public.%I for insert to authenticated with check (app_is_system_admin() or (app_current_org_id() <> '''' and organization_id::text = app_current_org_id()));', t, t);
    execute format('create policy erp_org_update_%I on public.%I for update to authenticated using (app_is_system_admin() or (app_current_org_id() <> '''' and organization_id::text = app_current_org_id())) with check (app_is_system_admin() or (app_current_org_id() <> '''' and organization_id::text = app_current_org_id()));', t, t);
    execute format('create policy erp_org_delete_%I on public.%I for delete to authenticated using (app_is_system_admin() or (app_current_org_id() <> '''' and organization_id::text = app_current_org_id()));', t, t);
  end loop;
end $$;

-- demo records for BRI
insert into public.qms_deviations (id, organization_id, plant_id, deviation_no, title, description, dev_type, severity, status)
values (
  '99999999-9999-9999-9999-999999999001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'DEV-QA-0001',
  'Batch temperature overshoot',
  'Furnace exceeded setpoint by 9C for 11 minutes during batch B-2214.',
  'process',
  'major',
  'open'
)
on conflict (organization_id, deviation_no) do nothing;

insert into public.qms_capas (id, organization_id, plant_id, capa_no, title, description, source_type, risk_level, status, source_ref)
values (
  '99999999-9999-9999-9999-999999999002',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'CAPA-QA-0001',
  'Rework calibration schedule for furnace sensors',
  'Prevent recurrence of temperature deviations through sensor calibration.',
  'internal',
  'medium',
  'initiated',
  'DEV-QA-0001'
)
on conflict (organization_id, capa_no) do nothing;