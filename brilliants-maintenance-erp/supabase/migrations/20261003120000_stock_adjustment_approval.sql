-- Stock adjustment approval
-- Stock adjustments (movement_type = 'adjustment') raised by users without
-- `inventory.approve` are parked in `stock_adjustments` as 'pending' and flow
-- through the approval engine (module 'inventory', entity_type
-- 'stock_adjustment'). The movement is only applied to stock when the
-- adjustment is approved. Approvers: ADMIN / SYSTEM_ADMIN / MAINTENANCE_MANAGER.

-- 1) Adjustment requests awaiting a manager decision.
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  plant_id uuid,
  adjustment_no text not null,
  title text not null,
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  movement_type text not null default 'adjustment',
  direction text not null check (direction in ('add', 'remove')),
  quantity integer not null check (quantity > 0),
  reference_no text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_adjustments_part on public.stock_adjustments(spare_part_id);
create index if not exists idx_stock_adjustments_status on public.stock_adjustments(status);

alter table public.stock_adjustments enable row level security;

drop policy if exists erp_org_select_stock_adjustments on public.stock_adjustments;
create policy erp_org_select_stock_adjustments on public.stock_adjustments
  for select using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_insert_stock_adjustments on public.stock_adjustments;
create policy erp_org_insert_stock_adjustments on public.stock_adjustments
  for insert with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_update_stock_adjustments on public.stock_adjustments;
create policy erp_org_update_stock_adjustments on public.stock_adjustments
  for update using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  ) with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_delete_stock_adjustments on public.stock_adjustments;
create policy erp_org_delete_stock_adjustments on public.stock_adjustments
  for delete using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

-- 2) Approval gate: a submitted adjustment rests at 'pending' until approved.
insert into public.workflow_steps (
  workflow_definition_id, order_index, step_name, from_status, to_status,
  require_approval, approval_role_code, require_reject_reason,
  notify_role_codes, approval_mode
)
select
  d.id, 2, 'adjustment approval', 'pending', 'approved',
  true, null, true, array['MAINTENANCE_MANAGER'], 'single'
from public.workflow_definitions d
where d.module = 'inventory'
  and d.status = 'active'
  and not exists (
    select 1 from public.workflow_steps s
    where s.workflow_definition_id = d.id
      and s.from_status = 'pending'
      and s.to_status = 'approved'
  );
