-- ============================================================
-- Phase B: Multi-company (multi-tenant) scoping.
--
-- Adds organization_id / plant_id to tenant tables that were
-- missing them, backfills existing rows from their parent record,
-- adds referential integrity on audit/attachment/activity tables,
-- and enforces uniqueness that multi-tenancy requires.
--
-- Idempotent — safe to re-run.
-- ============================================================

-- ---------- 1. maintenance_run_logs (guarded DDL+columns) ----------
create table if not exists public.maintenance_run_logs (
  id uuid primary key default gen_random_uuid(),
  maintenance_schedule_id uuid references public.maintenance_schedules(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  plant_id uuid references public.plants(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz not null default now(),
  notes text,
  duration_minutes integer,
  created_at timestamptz not null default now()
);

alter table public.maintenance_run_logs
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;

-- ---------- 2. spare_parts (org missing) ----------
alter table public.spare_parts
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
update public.spare_parts sp
set organization_id = pl.organization_id
from public.plants pl
where sp.plant_id = pl.id
  and sp.organization_id is null;

-- ---------- 3. spare_part_plants ----------
alter table public.spare_part_plants
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
update public.spare_part_plants spp
set organization_id = pl.organization_id
from public.plants pl
where spp.plant_id = pl.id
  and spp.organization_id is null;

-- ---------- 4. spare_part_stock ----------
alter table public.spare_part_stock
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
update public.spare_part_stock sps
set organization_id = pl.organization_id
from public.plants pl
where sps.plant_id = pl.id
  and sps.organization_id is null;

-- ---------- 5. spare_part_components ----------
alter table public.spare_part_components
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.spare_part_components spc
set organization_id = sp.organization_id,
    plant_id = sp.plant_id
from public.spare_parts sp
where spc.spare_part_id = sp.id
  and (spc.organization_id is null or spc.plant_id is null);

-- ---------- 6. spare_part_stock_movements ----------
alter table public.spare_part_stock_movements
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.spare_part_stock_movements spsm
set organization_id = sp.organization_id,
    plant_id = sp.plant_id
from public.spare_parts sp
where spsm.spare_part_id = sp.id
  and (spsm.organization_id is null or spsm.plant_id is null);

-- ---------- 7. stock_movements ----------
alter table public.stock_movements
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;
update public.stock_movements sm
set organization_id = sp.organization_id
from public.spare_parts sp
where sm.part_id = sp.id
  and sm.organization_id is null;

-- ---------- 8. maintenance_schedules ----------
alter table public.maintenance_schedules
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.maintenance_schedules ms
set organization_id = eq.organization_id,
    plant_id = eq.plant_id
from public.equipment eq
where ms.equipment_id = eq.id
  and (ms.organization_id is null or ms.plant_id is null);

-- ---------- 9. work-order children ----------
alter table public.work_order_activities
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.work_order_activities woa
set organization_id = wo.organization_id,
    plant_id = wo.plant_id
from public.work_orders wo
where woa.work_order_id = wo.id
  and (woa.organization_id is null or woa.plant_id is null);

alter table public.work_order_status_history
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.work_order_status_history wosh
set organization_id = wo.organization_id,
    plant_id = wo.plant_id
from public.work_orders wo
where wosh.work_order_id = wo.id
  and (wosh.organization_id is null or wosh.plant_id is null);

-- ---------- 10. workflow children ----------
alter table public.workflow_steps
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.workflow_steps ws
set organization_id = wd.organization_id,
    plant_id = wd.plant_id
from public.workflow_definitions wd
where ws.workflow_definition_id = wd.id
  and (ws.organization_id is null or ws.plant_id is null);

alter table public.workflow_instances
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.workflow_instances wi
set organization_id = wd.organization_id,
    plant_id = wd.plant_id
from public.workflow_definitions wd
where wi.workflow_definition_id = wd.id
  and (wi.organization_id is null or wi.plant_id is null);

alter table public.workflow_approvals
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.workflow_approvals wa
set organization_id = wd.organization_id,
    plant_id = wd.plant_id
from public.workflow_definitions wd
where wa.workflow_definition_id = wd.id
  and (wa.organization_id is null or wa.plant_id is null);

-- ---------- 11. procurement children ----------
alter table public.material_request_items
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.material_request_items mri
set organization_id = mr.organization_id,
    plant_id = mr.plant_id
from public.material_requests mr
where mri.material_request_id = mr.id
  and (mri.organization_id is null or mri.plant_id is null);

alter table public.purchase_order_items
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;
update public.purchase_order_items poi
set organization_id = po.organization_id,
    plant_id = po.plant_id
from public.purchase_orders po
where poi.purchase_order_id = po.id
  and (poi.organization_id is null or poi.plant_id is null);

-- ---------- 12. FKs on audit / attachment / activity scopes ----------
do $$
begin
  begin
    alter table public.audit_logs add constraint fk_audit_logs_org foreign key (organization_id) references public.organizations(id) on delete set null;
  exception when duplicate_object then null;
  end;
  begin
    alter table public.audit_logs add constraint fk_audit_logs_plant foreign key (plant_id) references public.plants(id) on delete set null;
  exception when duplicate_object then null;
  end;
  begin
    alter table public.attachments add constraint fk_attachments_org foreign key (organization_id) references public.organizations(id) on delete set null;
  exception when duplicate_object then null;
  end;
  begin
    alter table public.attachments add constraint fk_attachments_plant foreign key (plant_id) references public.plants(id) on delete set null;
  exception when duplicate_object then null;
  end;
  begin
    alter table public.activity_log add constraint fk_activity_log_org foreign key (organization_id) references public.organizations(id) on delete set null;
  exception when duplicate_object then null;
  end;
  begin
    alter table public.activity_log add constraint fk_activity_log_plant foreign key (plant_id) references public.plants(id) on delete set null;
  exception when duplicate_object then null;
  end;
end;
$$;

-- ---------- 13. Multi-tenant uniqueness ----------
do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'uq_roles_org_code') then
    if exists (select 1 from public.roles group by organization_id, code having count(*) > 1 limit 1) then
      raise notice 'Duplicate (organization_id, code) exist in roles; unique index skipped.';
    else
      create unique index uq_roles_org_code on public.roles (organization_id, code);
    end if;
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'uq_plants_org_code') then
    if exists (select 1 from public.plants group by organization_id, code having count(*) > 1 limit 1) then
      raise notice 'Duplicate (organization_id, code) exist in plants; unique index skipped.';
    else
      create unique index uq_plants_org_code on public.plants (organization_id, code);
    end if;
  end if;
end;
$$;

-- user_roles: a user may hold the same role at most once per plant.
create unique index if not exists uq_user_roles_user_role_plant
  on public.user_roles (user_id, role_id, plant_id);

-- ---------- 14. Query indexes for tenant-scoped access ----------
create index if not exists idx_maintenance_schedules_org_plant on public.maintenance_schedules (organization_id, plant_id);
create index if not exists idx_stock_movements_org on public.stock_movements (organization_id, plant_id);
create index if not exists idx_workflow_approvals_org on public.workflow_approvals (organization_id, plant_id, status);
create index if not exists idx_workflow_instances_org on public.workflow_instances (organization_id, plant_id);