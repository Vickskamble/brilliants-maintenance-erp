-- Brilliants Industrial Maintenance ERP
-- Supabase / PostgreSQL starter migration
-- Manual-first V1 foundation
-- IMPORTANT: review against the final product specification before production deployment.

create extension if not exists pgcrypto;

-- =========================================================
-- ENUMS
-- =========================================================
do $$ begin
  create type public.record_status as enum ('active','inactive','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.equipment_status as enum ('active','under_maintenance','standby','breakdown','decommissioned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.criticality_level as enum ('critical','major','normal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_order_type as enum ('preventive','breakdown','corrective','calibration','inspection','shutdown','improvement');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_order_status as enum ('draft','submitted','approved','planned','assigned','in_progress','on_hold','completed','verified','closed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.priority_level as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.breakdown_status as enum ('reported','diagnosing','repairing','restored','closed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.calibration_result as enum ('pass','fail','conditional','not_applicable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inspection_result as enum ('pass','fail','observation','not_applicable');
exception when duplicate_object then null; end $$;

-- =========================================================
-- COMMON FUNCTION
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- ORGANIZATION
-- =========================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  code text not null,
  industry text,
  timezone text not null default 'Asia/Kolkata',
  country text default 'India',
  state text,
  city text,
  address text,
  contact_email text,
  contact_phone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(code)
);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  address text,
  timezone text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, code)
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  code text not null,
  name text not null,
  department_type text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plant_id, code)
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  code text not null,
  name text not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plant_id, code)
);

create table if not exists public.areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  section_id uuid references public.sections(id) on delete restrict,
  code text not null,
  name text not null,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plant_id, code)
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  area_id uuid references public.areas(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plant_id, code)
);

create table if not exists public.cost_centers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plant_id, code)
);

-- =========================================================
-- USERS / ROLES
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete restrict,
  employee_code text,
  name text not null,
  email text,
  phone text,
  department_id uuid references public.departments(id) on delete restrict,
  plant_id uuid references public.plants(id) on delete restrict,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
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
  unique(module, action)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key(role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete restrict,
  primary key(user_id, role_id, plant_id)
);

-- =========================================================
-- VENDORS
-- =========================================================
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  vendor_code text not null,
  name text not null,
  vendor_type text,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_identifier text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, vendor_code)
);

-- =========================================================
-- ASSETS
-- =========================================================
create table if not exists public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  parent_id uuid references public.asset_categories(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  status public.record_status not null default 'active',
  unique(organization_id, code)
);

create table if not exists public.criticality_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  level public.criticality_level not null,
  safety_score numeric(6,2) default 0,
  production_score numeric(6,2) default 0,
  quality_score numeric(6,2) default 0,
  environmental_score numeric(6,2) default 0,
  failure_frequency_score numeric(6,2) default 0,
  repair_time_score numeric(6,2) default 0,
  spare_availability_score numeric(6,2) default 0,
  backup_availability_score numeric(6,2) default 0,
  total_score numeric(8,2) default 0,
  description text,
  unique(organization_id, code)
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  equipment_code text not null,
  equipment_name text not null,
  category_id uuid references public.asset_categories(id) on delete restrict,
  parent_equipment_id uuid references public.equipment(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  section_id uuid references public.sections(id) on delete restrict,
  area_id uuid references public.areas(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  cost_center_id uuid references public.cost_centers(id) on delete restrict,
  make text,
  model text,
  serial_number text,
  capacity numeric,
  capacity_unit text,
  manufacturer text,
  supplier_vendor_id uuid references public.vendors(id) on delete restrict,
  installation_date date,
  commissioning_date date,
  purchase_date date,
  purchase_cost numeric(14,2),
  warranty_start date,
  warranty_end date,
  amc_start date,
  amc_end date,
  criticality_id uuid references public.criticality_profiles(id) on delete restrict,
  status public.equipment_status not null default 'active',
  description text,
  qr_code text,
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, equipment_code)
);

create table if not exists public.equipment_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  component_code text not null,
  component_name text not null,
  component_type text,
  make text,
  model text,
  serial_number text,
  criticality public.criticality_level default 'normal',
  status public.record_status default 'active',
  remarks text,
  unique(organization_id, component_code)
);

create table if not exists public.equipment_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  old_status public.equipment_status,
  new_status public.equipment_status not null,
  reason text,
  changed_at timestamptz not null default now(),
  changed_by uuid references public.profiles(id) on delete set null
);

-- =========================================================
-- FAILURE / MAINTENANCE
-- =========================================================
create table if not exists public.failure_modes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  unique(organization_id, code)
);

create table if not exists public.failure_causes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  unique(organization_id, code)
);

create table if not exists public.maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  plan_code text not null,
  name text not null,
  maintenance_type text not null default 'preventive',
  frequency_type text not null,
  frequency_value integer not null check(frequency_value > 0),
  start_date date not null,
  estimated_duration_minutes integer,
  responsible_role_id uuid references public.roles(id) on delete restrict,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  priority public.priority_level default 'medium',
  safety_instructions text,
  status public.record_status default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, plan_code)
);

create table if not exists public.maintenance_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  maintenance_plan_id uuid not null references public.maintenance_plans(id) on delete cascade,
  sequence_no integer not null,
  task_name text not null,
  task_description text,
  task_type text,
  standard_value numeric,
  tolerance numeric,
  unit text,
  mandatory boolean not null default true,
  safety_note text
);

create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  maintenance_plan_id uuid not null references public.maintenance_plans(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  scheduled_date date not null,
  due_date date not null,
  status text not null default 'scheduled',
  generated_work_order_id uuid,
  completed_at timestamptz
);

create table if not exists public.work_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  request_no text not null,
  requested_by uuid references public.profiles(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete restrict,
  request_type text not null,
  priority public.priority_level not null default 'medium',
  requested_at timestamptz not null default now(),
  description text not null,
  status text not null default 'submitted',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  unique(organization_id, request_no)
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  work_order_no text not null,
  work_request_id uuid references public.work_requests(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  maintenance_plan_id uuid references public.maintenance_plans(id) on delete restrict,
  type public.work_order_type not null,
  priority public.priority_level not null default 'medium',
  status public.work_order_status not null default 'draft',
  title text not null,
  description text,
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  closure_remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, work_order_no)
);

alter table public.maintenance_schedules
  add constraint maintenance_schedules_work_order_fk
  foreign key(generated_work_order_id) references public.work_orders(id) on delete set null;

create table if not exists public.work_order_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  plan_task_id uuid references public.maintenance_plan_tasks(id) on delete set null,
  sequence_no integer not null,
  task_name text not null,
  result text,
  numeric_value numeric,
  unit text,
  pass_fail boolean,
  remarks text,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz
);

create table if not exists public.work_order_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  assignment_role text,
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.work_order_labor (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  hours numeric(10,2) not null check(hours >= 0),
  hourly_rate numeric(12,2),
  amount numeric(14,2)
);

create table if not exists public.work_order_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete restrict,
  cost_type text not null,
  description text,
  amount numeric(14,2) not null check(amount >= 0),
  reference_no text
);

create table if not exists public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  breakdown_no text not null,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  reported_by uuid references public.profiles(id) on delete set null,
  reported_at timestamptz not null default now(),
  breakdown_start timestamptz,
  restored_at timestamptz,
  problem_description text not null,
  failure_mode_id uuid references public.failure_modes(id) on delete restrict,
  failure_cause_id uuid references public.failure_causes(id) on delete restrict,
  root_cause text,
  action_taken text,
  downtime_minutes integer check(downtime_minutes is null or downtime_minutes >= 0),
  production_impact text,
  status public.breakdown_status not null default 'reported',
  linked_work_order_id uuid references public.work_orders(id) on delete set null,
  unique(organization_id, breakdown_no)
);

create table if not exists public.corrective_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  source_type text not null,
  source_id uuid,
  action text not null,
  responsible_user_id uuid references public.profiles(id) on delete set null,
  due_date date,
  completed_date date,
  status text not null default 'open',
  verification_remarks text
);

create table if not exists public.root_cause_analyses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  breakdown_id uuid references public.breakdowns(id) on delete restrict,
  method text,
  problem_statement text,
  root_cause text,
  corrective_action text,
  preventive_action text,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz
);

-- =========================================================
-- INSPECTION / CALIBRATION
-- =========================================================
create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  code text not null,
  name text not null,
  equipment_category_id uuid references public.asset_categories(id) on delete restrict,
  frequency_type text,
  frequency_value integer,
  status public.record_status not null default 'active',
  unique(organization_id, code)
);

create table if not exists public.inspection_template_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  inspection_template_id uuid not null references public.inspection_templates(id) on delete cascade,
  sequence_no integer not null,
  checkpoint text not null,
  expected_condition text,
  measurement_required boolean not null default false,
  unit text,
  min_value numeric,
  max_value numeric,
  mandatory boolean not null default true
);

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  inspection_no text not null,
  template_id uuid not null references public.inspection_templates(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  inspector_id uuid references public.profiles(id) on delete set null,
  scheduled_date date,
  performed_at timestamptz,
  status text not null default 'scheduled',
  overall_result public.inspection_result,
  remarks text,
  unique(organization_id, inspection_no)
);

create table if not exists public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  template_item_id uuid not null references public.inspection_template_items(id) on delete restrict,
  result text,
  numeric_value numeric,
  unit text,
  observation text,
  pass_fail boolean,
  corrective_action_id uuid references public.corrective_actions(id) on delete set null
);

create table if not exists public.instruments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  instrument_code text not null,
  instrument_name text not null,
  instrument_type text,
  department_id uuid references public.departments(id) on delete restrict,
  location_id uuid references public.locations(id) on delete restrict,
  make text,
  model text,
  serial_number text,
  range_min numeric,
  range_max numeric,
  unit text,
  accuracy text,
  calibration_frequency_value integer,
  calibration_frequency_unit text,
  status public.record_status not null default 'active',
  unique(organization_id, instrument_code)
);

create table if not exists public.calibration_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  instrument_id uuid not null references public.instruments(id) on delete restrict,
  calibration_date date not null,
  next_due_date date not null,
  agency_vendor_id uuid references public.vendors(id) on delete restrict,
  certificate_number text,
  method text,
  result public.calibration_result not null,
  as_found text,
  as_left text,
  remarks text,
  performed_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  status public.record_status not null default 'active'
);

-- =========================================================
-- INVENTORY
-- =========================================================
create table if not exists public.spare_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null,
  name text not null,
  unique(organization_id, code)
);

create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  part_code text not null,
  part_name text not null,
  category_id uuid references public.spare_categories(id) on delete restrict,
  part_number text,
  make text,
  unit text,
  minimum_stock numeric(14,3) default 0,
  maximum_stock numeric(14,3),
  reorder_level numeric(14,3) default 0,
  critical_spare boolean not null default false,
  description text,
  unique(organization_id, part_code)
);

create table if not exists public.spare_equipment_map (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  recommended_quantity numeric(14,3),
  unique(spare_part_id, equipment_id)
);

create table if not exists public.stock_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  code text not null,
  name text not null,
  unique(organization_id, plant_id, code)
);

create table if not exists public.spare_stocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  stock_location_id uuid not null references public.stock_locations(id) on delete restrict,
  quantity numeric(14,3) not null default 0 check(quantity >= 0),
  reserved_quantity numeric(14,3) not null default 0 check(reserved_quantity >= 0),
  unique(spare_part_id, stock_location_id)
);

create table if not exists public.stock_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  stock_location_id uuid not null references public.stock_locations(id) on delete restrict,
  transaction_type text not null,
  quantity numeric(14,3) not null check(quantity > 0),
  reference_type text,
  reference_id uuid,
  transaction_date timestamptz not null default now(),
  performed_by uuid references public.profiles(id) on delete set null,
  remarks text
);

create table if not exists public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete restrict,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  quantity numeric(14,3) not null check(quantity > 0),
  unit_cost numeric(14,2),
  amount numeric(14,2),
  stock_transaction_id uuid references public.stock_transactions(id) on delete set null
);

-- =========================================================
-- CONTRACTS / SHUTDOWN / DOCUMENTS
-- =========================================================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid references public.plants(id) on delete restrict,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  contract_no text not null,
  contract_type text not null,
  start_date date not null,
  end_date date not null,
  amount numeric(14,2),
  scope text,
  status public.record_status not null default 'active',
  unique(organization_id, contract_no),
  check(end_date >= start_date)
);

create table if not exists public.service_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  visit_date date not null,
  engineer_name text,
  observations text,
  action_taken text,
  next_visit_date date
);

create table if not exists public.shutdown_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  plant_id uuid not null references public.plants(id) on delete restrict,
  shutdown_no text not null,
  name text not null,
  planned_start timestamptz not null,
  planned_end timestamptz not null,
  actual_start timestamptz,
  actual_end timestamptz,
  status text not null default 'planned',
  remarks text,
  unique(organization_id, shutdown_no),
  check(planned_end >= planned_start)
);

create table if not exists public.shutdown_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  shutdown_id uuid not null references public.shutdown_events(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete restrict,
  job_description text not null,
  planned_hours numeric(10,2),
  actual_hours numeric(10,2),
  priority public.priority_level default 'medium',
  status text not null default 'planned',
  remarks text
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  file_name text not null,
  storage_path text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  document_type text,
  checksum text,
  status public.record_status not null default 'active'
);

create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null
);

-- =========================================================
-- APPROVAL / AUDIT / NOTIFICATIONS
-- =========================================================
create table if not exists public.approval_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  module text not null,
  threshold_type text,
  threshold_value numeric,
  approver_role_id uuid references public.roles(id) on delete restrict,
  sequence_no integer not null default 1,
  active boolean not null default true
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  module text not null,
  record_id uuid not null,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending',
  current_step integer not null default 1,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete restrict,
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- =========================================================
-- INDEXES
-- =========================================================
create index if not exists idx_plants_org on public.plants(organization_id);
create index if not exists idx_equipment_org_plant_status on public.equipment(organization_id, plant_id, status);
create index if not exists idx_equipment_org_criticality on public.equipment(organization_id, criticality_id);
create index if not exists idx_equipment_parent on public.equipment(parent_equipment_id);
create index if not exists idx_pm_schedule_due on public.maintenance_schedules(organization_id, plant_id, due_date, status);
create index if not exists idx_work_orders_status on public.work_orders(organization_id, plant_id, status, priority);
create index if not exists idx_work_orders_equipment on public.work_orders(organization_id, equipment_id);
create index if not exists idx_breakdowns_equipment_date on public.breakdowns(organization_id, equipment_id, breakdown_start);
create index if not exists idx_calibration_due on public.calibration_records(organization_id, instrument_id, next_due_date);
create index if not exists idx_stock_txn_part_date on public.stock_transactions(organization_id, spare_part_id, transaction_date);
create index if not exists idx_audit_entity on public.audit_logs(organization_id, entity_type, entity_id, created_at);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at, created_at);

-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','plants','departments','sections','areas','locations',
    'cost_centers','profiles','roles','vendors','asset_categories',
    'equipment','maintenance_plans','work_orders'
  ]
  loop
    execute format(
      'drop trigger if exists trg_%s_updated_at on public.%I;
       create trigger trg_%s_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t,t,t,t
    );
  end loop;
end $$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.organizations enable row level security;
alter table public.plants enable row level security;
alter table public.departments enable row level security;
alter table public.sections enable row level security;
alter table public.areas enable row level security;
alter table public.locations enable row level security;
alter table public.cost_centers enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.vendors enable row level security;
alter table public.asset_categories enable row level security;
alter table public.criticality_profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_components enable row level security;
alter table public.equipment_status_history enable row level security;
alter table public.failure_modes enable row level security;
alter table public.failure_causes enable row level security;
alter table public.maintenance_plans enable row level security;
alter table public.maintenance_plan_tasks enable row level security;
alter table public.maintenance_schedules enable row level security;
alter table public.work_requests enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_tasks enable row level security;
alter table public.work_order_assignments enable row level security;
alter table public.work_order_labor enable row level security;
alter table public.work_order_costs enable row level security;
alter table public.breakdowns enable row level security;
alter table public.corrective_actions enable row level security;
alter table public.root_cause_analyses enable row level security;
alter table public.inspection_templates enable row level security;
alter table public.inspection_template_items enable row level security;
alter table public.inspections enable row level security;
alter table public.inspection_results enable row level security;
alter table public.instruments enable row level security;
alter table public.calibration_records enable row level security;
alter table public.spare_categories enable row level security;
alter table public.spare_parts enable row level security;
alter table public.spare_equipment_map enable row level security;
alter table public.stock_locations enable row level security;
alter table public.spare_stocks enable row level security;
alter table public.stock_transactions enable row level security;
alter table public.work_order_parts enable row level security;
alter table public.contracts enable row level security;
alter table public.service_visits enable row level security;
alter table public.shutdown_events enable row level security;
alter table public.shutdown_jobs enable row level security;
alter table public.documents enable row level security;
alter table public.document_links enable row level security;
alter table public.approval_rules enable row level security;
alter table public.approval_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.notifications enable row level security;

-- NOTE:
-- Production policies should be added after the organization-membership
-- model is finalized. Do not use permissive "authenticated can do everything"
-- policies in production.

-- =========================================================
-- SYSTEM PERMISSION SEED
-- =========================================================
insert into public.permissions(module, action, description) values
('dashboard','view','View dashboard'),
('organization','view','View organization'),
('organization','manage','Manage organization'),
('plant','view','View plants'),
('plant','manage','Manage plants'),
('equipment','view','View equipment'),
('equipment','create','Create equipment'),
('equipment','edit','Edit equipment'),
('equipment','archive','Archive equipment'),
('equipment','approve','Approve criticality'),
('maintenance','view','View maintenance'),
('maintenance','create','Create maintenance plans'),
('maintenance','edit','Edit maintenance plans'),
('maintenance','execute','Execute maintenance'),
('work_order','view','View work orders'),
('work_order','create','Create work orders'),
('work_order','assign','Assign work orders'),
('work_order','execute','Execute work orders'),
('work_order','verify','Verify work orders'),
('work_order','close','Close work orders'),
('breakdown','view','View breakdowns'),
('breakdown','create','Report breakdown'),
('breakdown','manage','Manage breakdowns'),
('calibration','view','View calibration'),
('calibration','manage','Manage calibration'),
('inspection','view','View inspections'),
('inspection','manage','Manage inspections'),
('inventory','view','View inventory'),
('inventory','manage','Manage inventory'),
('vendor','view','View vendors'),
('vendor','manage','Manage vendors'),
('shutdown','view','View shutdowns'),
('shutdown','manage','Manage shutdowns'),
('reports','view','View reports'),
('reports','export','Export reports'),
('users','view','View users'),
('users','manage','Manage users'),
('audit','view','View audit logs')
on conflict(module, action) do nothing;
