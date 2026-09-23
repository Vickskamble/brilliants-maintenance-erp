-- Brilliants Industrial Maintenance ERP
-- 002_rls_policies.sql
-- Supabase/PostgreSQL Row Level Security + permission engine
--
-- IMPORTANT:
-- 1. Review with a staging database first.
-- 2. This migration assumes 001_initial_schema.sql has already run.
-- 3. It uses SECURITY DEFINER helpers to avoid RLS recursion while resolving
--    the current user's organization, plant scope and permissions.
-- 4. Never expose the Supabase service-role key to the client.

begin;

create or replace function public.get_my_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select p.*
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.get_my_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.can_access_plant(target_plant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id is not null
      and (
        target_plant_id is null
        or p.plant_id is null
        or p.plant_id = target_plant_id
        or exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and (ur.plant_id is null or ur.plant_id = target_plant_id)
        )
      )
  );
$$;

create or replace function public.has_permission(
  permission_module text,
  permission_action text,
  target_plant_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.module = permission_module
      and p.action = permission_action
      and (ur.plant_id is null or target_plant_id is null or ur.plant_id = target_plant_id)
      and (
        r.organization_id is null
        or r.organization_id = public.get_my_organization_id()
      )
  );
$$;

-- Correct duplicate-prone NULL semantics for org-level role assignments.
create unique index if not exists uq_user_roles_user_role_plant
on public.user_roles (
  user_id,
  role_id,
  coalesce(plant_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- -----------------------------
-- ORGANIZATION / BASE POLICIES
-- -----------------------------

drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
for select to authenticated
using (id = public.get_my_organization_id());

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
for update to authenticated
using (id = public.get_my_organization_id() and public.has_permission('organization','edit'))
with check (id = public.get_my_organization_id());

drop policy if exists plants_select on public.plants;
create policy plants_select on public.plants
for select to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(id));

drop policy if exists plants_insert on public.plants;
create policy plants_insert on public.plants
for insert to authenticated
with check (
  organization_id = public.get_my_organization_id()
  and public.has_permission('organization','manage')
);

drop policy if exists plants_update on public.plants;
create policy plants_update on public.plants
for update to authenticated
using (organization_id = public.get_my_organization_id() and public.has_permission('organization','edit',id))
with check (organization_id = public.get_my_organization_id());

drop policy if exists departments_org_scope on public.departments;
create policy departments_org_scope on public.departments
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists sections_org_scope on public.sections;
create policy sections_org_scope on public.sections
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists areas_org_scope on public.areas;
create policy areas_org_scope on public.areas
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists locations_org_scope on public.locations;
create policy locations_org_scope on public.locations
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists cost_centers_org_scope on public.cost_centers;
create policy cost_centers_org_scope on public.cost_centers
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

-- -----------------------------
-- PROFILES / ROLES / PERMISSIONS
-- -----------------------------

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (
    organization_id = public.get_my_organization_id()
    and public.has_permission('users','view')
  )
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (
  id = auth.uid()
  or (
    organization_id = public.get_my_organization_id()
    and public.has_permission('users','edit')
  )
)
with check (
  id = auth.uid()
  or organization_id = public.get_my_organization_id()
);

drop policy if exists permissions_select_authenticated on public.permissions;
create policy permissions_select_authenticated on public.permissions
for select to authenticated
using (true);

drop policy if exists roles_select_org on public.roles;
create policy roles_select_org on public.roles
for select to authenticated
using (
  organization_id is null
  or organization_id = public.get_my_organization_id()
);

drop policy if exists roles_manage_org on public.roles;
create policy roles_manage_org on public.roles
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and public.has_permission('users','manage')
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
for select to authenticated
using (
  exists (
    select 1 from public.roles r
    where r.id = role_id
      and (r.organization_id is null or r.organization_id = public.get_my_organization_id())
  )
);

drop policy if exists role_permissions_manage on public.role_permissions;
create policy role_permissions_manage on public.role_permissions
for all to authenticated
using (public.has_permission('users','manage'))
with check (public.has_permission('users','manage'));

drop policy if exists user_roles_select on public.user_roles;
create policy user_roles_select on public.user_roles
for select to authenticated
using (
  user_id = auth.uid()
  or public.has_permission('users','view')
);

drop policy if exists user_roles_manage on public.user_roles;
create policy user_roles_manage on public.user_roles
for all to authenticated
using (public.has_permission('users','manage'))
with check (public.has_permission('users','manage'));

-- -----------------------------
-- COMMON ORG/PLANT SCOPED TABLES
-- -----------------------------

drop policy if exists vendors_org_scope on public.vendors;
create policy vendors_org_scope on public.vendors
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.has_permission('vendor','view'))
with check (organization_id = public.get_my_organization_id() and public.has_permission('vendor','create'));

drop policy if exists asset_categories_org_scope on public.asset_categories;
create policy asset_categories_org_scope on public.asset_categories
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.has_permission('equipment','view'))
with check (organization_id = public.get_my_organization_id() and public.has_permission('equipment','create'));

drop policy if exists criticality_profiles_org_scope on public.criticality_profiles;
create policy criticality_profiles_org_scope on public.criticality_profiles
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.has_permission('equipment','view'))
with check (organization_id = public.get_my_organization_id() and public.has_permission('equipment','create'));

drop policy if exists equipment_org_scope on public.equipment;
create policy equipment_org_scope on public.equipment
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and public.can_access_plant(plant_id)
  and public.has_permission('equipment','view',plant_id)
)
with check (
  organization_id = public.get_my_organization_id()
  and public.can_access_plant(plant_id)
  and public.has_permission('equipment','create',plant_id)
);

drop policy if exists equipment_components_scope on public.equipment_components;
create policy equipment_components_scope on public.equipment_components
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (
    select 1 from public.equipment e
    where e.id = equipment_id
      and e.organization_id = public.get_my_organization_id()
      and public.can_access_plant(e.plant_id)
  )
)
with check (
  organization_id = public.get_my_organization_id()
);

drop policy if exists equipment_status_history_scope on public.equipment_status_history;
create policy equipment_status_history_scope on public.equipment_status_history
for select to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (
    select 1 from public.equipment e
    where e.id = equipment_id
      and public.can_access_plant(e.plant_id)
  )
);

-- Maintenance core
drop policy if exists maintenance_plans_scope on public.maintenance_plans;
create policy maintenance_plans_scope on public.maintenance_plans
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists maintenance_plan_tasks_scope on public.maintenance_plan_tasks;
create policy maintenance_plan_tasks_scope on public.maintenance_plan_tasks
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.maintenance_plans mp where mp.id = maintenance_plan_id and public.can_access_plant(mp.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists maintenance_schedules_scope on public.maintenance_schedules;
create policy maintenance_schedules_scope on public.maintenance_schedules
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists work_requests_scope on public.work_requests;
create policy work_requests_scope on public.work_requests
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists work_orders_scope on public.work_orders;
create policy work_orders_scope on public.work_orders
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists work_order_tasks_scope on public.work_order_tasks;
create policy work_order_tasks_scope on public.work_order_tasks
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_plant(wo.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists work_order_assignments_scope on public.work_order_assignments;
create policy work_order_assignments_scope on public.work_order_assignments
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_plant(wo.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists work_order_labor_scope on public.work_order_labor;
create policy work_order_labor_scope on public.work_order_labor
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_plant(wo.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists work_order_costs_scope on public.work_order_costs;
create policy work_order_costs_scope on public.work_order_costs
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_plant(wo.plant_id))
)
with check (organization_id = public.get_my_organization_id());

-- Breakdown / RCA
drop policy if exists breakdowns_scope on public.breakdowns;
create policy breakdowns_scope on public.breakdowns
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists corrective_actions_scope on public.corrective_actions;
create policy corrective_actions_scope on public.corrective_actions
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists root_cause_analyses_scope on public.root_cause_analyses;
create policy root_cause_analyses_scope on public.root_cause_analyses
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

-- Inspection / calibration
drop policy if exists inspection_templates_scope on public.inspection_templates;
create policy inspection_templates_scope on public.inspection_templates
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists inspection_template_items_scope on public.inspection_template_items;
create policy inspection_template_items_scope on public.inspection_template_items
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists inspections_scope on public.inspections;
create policy inspections_scope on public.inspections
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists inspection_results_scope on public.inspection_results;
create policy inspection_results_scope on public.inspection_results
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.inspections i where i.id = inspection_id and public.can_access_plant(i.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists instruments_scope on public.instruments;
create policy instruments_scope on public.instruments
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists calibration_records_scope on public.calibration_records;
create policy calibration_records_scope on public.calibration_records
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

-- Inventory
drop policy if exists spare_categories_scope on public.spare_categories;
create policy spare_categories_scope on public.spare_categories
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists spare_parts_scope on public.spare_parts;
create policy spare_parts_scope on public.spare_parts
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists spare_equipment_map_scope on public.spare_equipment_map;
create policy spare_equipment_map_scope on public.spare_equipment_map
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists stock_locations_scope on public.stock_locations;
create policy stock_locations_scope on public.stock_locations
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists spare_stocks_scope on public.spare_stocks;
create policy spare_stocks_scope on public.spare_stocks
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists stock_transactions_scope on public.stock_transactions;
create policy stock_transactions_scope on public.stock_transactions
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists work_order_parts_scope on public.work_order_parts;
create policy work_order_parts_scope on public.work_order_parts
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_plant(wo.plant_id))
)
with check (organization_id = public.get_my_organization_id());

-- Contracts / shutdown / documents
drop policy if exists contracts_scope on public.contracts;
create policy contracts_scope on public.contracts
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists service_visits_scope on public.service_visits;
create policy service_visits_scope on public.service_visits
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists shutdown_events_scope on public.shutdown_events;
create policy shutdown_events_scope on public.shutdown_events
for all to authenticated
using (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id))
with check (organization_id = public.get_my_organization_id() and public.can_access_plant(plant_id));

drop policy if exists shutdown_jobs_scope on public.shutdown_jobs;
create policy shutdown_jobs_scope on public.shutdown_jobs
for all to authenticated
using (
  organization_id = public.get_my_organization_id()
  and exists (select 1 from public.shutdown_events s where s.id = shutdown_event_id and public.can_access_plant(s.plant_id))
)
with check (organization_id = public.get_my_organization_id());

drop policy if exists documents_scope on public.documents;
create policy documents_scope on public.documents
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists document_links_scope on public.document_links;
create policy document_links_scope on public.document_links
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

-- Approval / audit / notifications
drop policy if exists approval_rules_scope on public.approval_rules;
create policy approval_rules_scope on public.approval_rules
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists approval_requests_scope on public.approval_requests;
create policy approval_requests_scope on public.approval_requests
for all to authenticated
using (organization_id = public.get_my_organization_id())
with check (organization_id = public.get_my_organization_id());

drop policy if exists audit_logs_select_org on public.audit_logs;
create policy audit_logs_select_org on public.audit_logs
for select to authenticated
using (
  organization_id = public.get_my_organization_id()
  and public.has_permission('audit','view')
);

drop policy if exists audit_logs_insert_org on public.audit_logs;
create policy audit_logs_insert_org on public.audit_logs
for insert to authenticated
with check (organization_id = public.get_my_organization_id());

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
for select to authenticated
using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

commit;
