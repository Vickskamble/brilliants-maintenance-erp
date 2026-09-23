-- ============================================================
-- App-first schema for the Brilliants Maintenance ERP app.
-- Creates the tables/columns the application actually queries
-- (see src/types/database.ts and the module pages/services).
--
-- Design decisions (per approved "App-first" direction):
--   * RLS is intentionally NOT enabled - the app pages query
--     without tenant/org filters, so strict org-scoped RLS would
--     hide all data. A single-org deployment is assumed. Add RLS
--     later only if multi-tenant access is introduced.
--   * Status/type columns are `text` (no strict enums) so the app
--     is never rejected for values it sends.
--   * Everything is idempotent (`create table if not exists`,
--     `add column if not exists`) - safe to run alongside
--     20260921100000_spare_parts.sql at any point.
-- ============================================================

-- ---------- organizations ----------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  code text not null,
  industry text,
  timezone text not null default 'UTC',
  country text,
  state text,
  city text,
  address text,
  contact_email text,
  contact_phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- plants ----------
create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  code text not null,
  name text not null,
  address text,
  timezone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  employee_code text,
  name text not null,
  email text,
  phone text,
  department_id uuid,
  plant_id uuid references public.plants(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- roles / permissions ----------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  code text not null,
  name text not null,
  description text,
  system_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  action text not null,
  description text,
  unique (module, action)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete cascade,
  primary key (user_id, role_id)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ---------- asset master data ----------
create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  parent_id uuid references public.asset_categories(id) on delete set null,
  code text,
  name text not null,
  description text,
  status text not null default 'active'
);

create table if not exists public.criticality_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  code text,
  name text not null,
  level text not null default 'normal',
  safety_score numeric,
  production_score numeric,
  quality_score numeric,
  environmental_score numeric,
  failure_frequency_score numeric,
  repair_time_score numeric,
  spare_availability_score numeric,
  backup_availability_score numeric,
  total_score numeric,
  description text
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete cascade,
  code text,
  name text not null,
  department_type text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  code text,
  name text not null,
  status text not null default 'active'
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  code text,
  name text not null,
  status text not null default 'active'
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete cascade,
  area_id uuid references public.areas(id) on delete set null,
  code text,
  name text not null,
  description text
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete cascade,
  code text,
  name text not null,
  description text,
  status text not null default 'active'
);

-- ---------- vendors ----------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  vendor_code text,
  code text,
  name text not null,
  vendor_type text,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_identifier text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- equipment ----------
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  equipment_code text not null,
  equipment_name text not null,
  category_id uuid references public.asset_categories(id) on delete set null,
  parent_equipment_id uuid references public.equipment(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  area_id uuid references public.areas(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  cost_center_id uuid references public.cost_centers(id) on delete set null,
  make text,
  model text,
  serial_number text,
  capacity numeric,
  capacity_unit text,
  manufacturer text,
  supplier_vendor_id uuid references public.vendors(id) on delete set null,
  installation_date date,
  commissioning_date date,
  purchase_date date,
  purchase_cost numeric,
  warranty_start date,
  warranty_end date,
  amc_start date,
  amc_end date,
  criticality_id uuid references public.criticality_profiles(id) on delete set null,
  status text not null default 'active',
  description text,
  qr_code text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  component_code text,
  component_name text,
  component_type text,
  make text,
  model text,
  serial_number text,
  criticality text not null default 'normal',
  status text not null default 'active',
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  old_status text,
  new_status text not null,
  reason text,
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null
);

-- ---------- work requests / maintenance plans ----------
create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  request_no text not null,
  requested_by uuid references auth.users(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  request_type text,
  priority text not null default 'medium',
  requested_at timestamptz not null default now(),
  description text not null,
  status text not null default 'submitted',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  plan_code text not null,
  name text not null,
  maintenance_type text,
  frequency_type text,
  frequency_value integer,
  start_date date,
  estimated_duration_minutes integer,
  responsible_role_id uuid references public.roles(id) on delete set null,
  responsible_user_id uuid references auth.users(id) on delete set null,
  priority text not null default 'medium',
  safety_instructions text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- work orders ----------
create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  work_order_no text not null,
  work_request_id uuid references public.work_requests(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  maintenance_plan_id uuid references public.maintenance_plans(id) on delete set null,
  assigned_to text,
  type text not null default 'preventive',
  priority text not null default 'medium',
  status text not null default 'draft',
  title text not null,
  description text,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  closure_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_order_statuses (
  id uuid primary key default gen_random_uuid(),
  work_order_no text,
  old_status text,
  new_status text not null,
  remarks text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.work_order_status_history (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  remarks text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create table if not exists public.work_order_activities (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  activity_type text,
  description text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- maintenance schedules ----------
create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  schedule_no text,
  equipment_id uuid references public.equipment(id) on delete set null,
  task_type text,
  frequency text,
  interval_days integer,
  last_run_at timestamptz,
  next_run_at timestamptz,
  assigned_to text,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- breakdowns ----------
create table if not exists public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  breakdown_no text not null,
  equipment_id uuid references public.equipment(id) on delete set null,
  reported_by text,
  reported_at timestamptz not null default now(),
  breakdown_start timestamptz,
  restored_at timestamptz,
  problem_description text,
  description text,
  root_cause text,
  action_taken text,
  resolution_notes text,
  resolution text,
  severity text,
  downtime_minutes integer check (downtime_minutes is null or downtime_minutes >= 0),
  production_impact text,
  status text not null default 'reported',
  resolved_at timestamptz,
  linked_work_order_id uuid references public.work_orders(id) on delete set null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- inspections ----------
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  inspection_no text not null,
  equipment_id uuid references public.equipment(id) on delete set null,
  inspector_id uuid references auth.users(id) on delete set null,
  scheduled_date timestamptz,
  performed_at timestamptz,
  status text not null default 'scheduled',
  overall_result text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- inventory ----------
-- spare_parts is normally created by 20260921100000_spare_parts.sql;
-- guarded here so the module works even if that migration never ran.
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  part_code text not null unique,
  part_name text not null,
  category text not null default 'electrical',
  unit text not null default 'pcs',
  current_stock integer not null default 0,
  min_stock integer not null default 0,
  reorder_level integer not null default 0,
  location text,
  description text,
  plant_id uuid references public.plants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- per-plant stock breakdown (embedded by spare-parts list as spare_part_plants)
create table if not exists public.spare_part_plants (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.spare_parts(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  quantity integer not null default 0,
  location text,
  created_at timestamptz not null default now(),
  unique (part_id, plant_id)
);

-- per-plant stock shown on the spare-part detail page (embedded as spare_part_stock)
create table if not exists public.spare_part_stock (
  id uuid primary key default gen_random_uuid(),
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  quantity integer not null default 0,
  created_at timestamptz not null default now(),
  unique (spare_part_id, plant_id)
);

-- component / bill-of-materials rows used by the spare-parts service
create table if not exists public.spare_part_components (
  id uuid primary key default gen_random_uuid(),
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  part_code text,
  part_name text not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now()
);

-- stock history shown by the spare-parts service (spare_part_stock_movements)
create table if not exists public.spare_part_stock_movements (
  id uuid primary key default gen_random_uuid(),
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  movement_type text,
  quantity integer not null,
  reference_no text,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- stock movements ledger (created by the spare_parts migration; ensure the
-- plant_id column exists because the inventory service filters on it)
alter table public.stock_movements
  add column if not exists plant_id uuid references public.plants(id) on delete set null;

-- restore the FK that 20260921100000_spare_parts.sql intentionally defers,
-- now that work_orders exists (applied earlier in this file).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fk_stock_movements_work_order'
      and conrelid = 'public.stock_movements'::regclass
  ) then
    alter table public.stock_movements
      add constraint fk_stock_movements_work_order
      foreign key (work_order_id) references public.work_orders(id) on delete set null;
  end if;
end;
$$;

-- ---------- indexes ----------
create index if not exists idx_equipment_plant on public.equipment(plant_id);
create index if not exists idx_equipment_category on public.equipment(category_id);
create index if not exists idx_equipment_status on public.equipment(status);
create index if not exists idx_work_orders_plant on public.work_orders(plant_id);
create index if not exists idx_work_orders_status on public.work_orders(status);
create index if not exists idx_breakdowns_equipment on public.breakdowns(equipment_id);
create index if not exists idx_breakdowns_reported on public.breakdowns(reported_at);
create index if not exists idx_msched_next_run on public.maintenance_schedules(next_run_at);
create index if not exists idx_msched_active on public.maintenance_schedules(is_active);
create index if not exists idx_inspections_status on public.inspections(status);
create index if not exists idx_equipment_status_history_eq on public.equipment_status_history(equipment_id, changed_at desc);
create index if not exists idx_wo_activity_wo on public.work_order_activities(work_order_id, started_at desc);
create index if not exists idx_wo_status_history_wo on public.work_order_status_history(work_order_id, changed_at desc);

-- ---------- keep per-plant stock views in sync ----------
-- Extend the sync function from 20260921100000_spare_parts.sql so incoming
-- movements also update spare_part_stock (used by the spare-part detail page).
create or replace function public.sync_spare_part_plant()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.spare_part_plants (part_id, plant_id, quantity, location)
  values (new.part_id, coalesce(new.to_plant_id, new.from_plant_id), new.quantity, null)
  on conflict (part_id, plant_id)
  do update set quantity = public.spare_part_plants.quantity + excluded.quantity;

  insert into public.spare_part_stock (spare_part_id, plant_id, quantity)
  values (new.part_id, coalesce(new.to_plant_id, new.from_plant_id), new.quantity)
  on conflict (spare_part_id, plant_id)
  do update set quantity = public.spare_part_stock.quantity + excluded.quantity;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_spare_part_plant on public.stock_movements;
create trigger trg_sync_spare_part_plant
  after insert on public.stock_movements
  for each row
  when (new.movement_type in ('purchase_in', 'transfer', 'return_in'))
  execute function public.sync_spare_part_plant();