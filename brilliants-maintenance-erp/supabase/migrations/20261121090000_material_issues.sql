-- Material Issue (store -> department / equipment / work order / person)
--
-- A material issue is a physical hand-over of stock from the store. It has a
-- header (who received it, why, when) and one or more line items (part + qty).
-- Every line writes a `stock_movements` row of type `material_issue`, so the
-- canonical ledger and the per-plant / global stock triggers stay authoritative.
--
-- Cancelling an issue writes compensating `return_in` movements instead of
-- deleting history.

-- ---------- 1) widen the stock movement type CHECK ----------
do $$
declare
  cons text;
begin
  select pg_get_constraintdef(oid) into cons
  from pg_constraint
  where conrelid = 'public.stock_movements'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%movement_type%';

  if cons is not null and cons not like '%material_issue%' then
    execute 'alter table public.stock_movements drop constraint ' ||
            quote_ident(
              (select conname from pg_constraint
               where conrelid = 'public.stock_movements'::regclass
                 and contype = 'c'
                 and pg_get_constraintdef(oid) like '%movement_type%')
            );
    alter table public.stock_movements
      add constraint stock_movements_movement_type_check check (
        movement_type in (
          'purchase_in', 'return_in', 'workorder_issue', 'breakdown_use',
          'adjustment', 'scrap_out', 'transfer', 'mr_issue', 'material_issue'
        )
      );
  end if;
end $$;

-- ---------- 2) issue header ----------
create table if not exists public.material_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  issue_no text not null,
  issue_date date not null default current_date,
  issued_to_type text not null default 'department'
    check (issued_to_type in ('department', 'equipment', 'work_order', 'employee', 'other')),
  department_id uuid references public.departments(id) on delete set null,
  equipment_id uuid references public.equipment(id) on delete set null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  issued_to_name text,
  purpose text,
  remarks text,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, issue_no)
);

create index if not exists idx_material_issues_org on public.material_issues(organization_id);
create index if not exists idx_material_issues_plant on public.material_issues(plant_id);
create index if not exists idx_material_issues_date on public.material_issues(issue_date desc);
create index if not exists idx_material_issues_department on public.material_issues(department_id);

-- ---------- 3) issue lines ----------
create table if not exists public.material_issue_items (
  id uuid primary key default gen_random_uuid(),
  material_issue_id uuid not null references public.material_issues(id) on delete cascade,
  organization_id uuid not null,
  plant_id uuid references public.plants(id) on delete set null,
  spare_part_id uuid not null references public.spare_parts(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit text,
  remarks text,
  stock_movement_id uuid references public.stock_movements(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_material_issue_items_issue
  on public.material_issue_items(material_issue_id);
create index if not exists idx_material_issue_items_part
  on public.material_issue_items(spare_part_id);

-- ---------- 4) updated_at trigger ----------
drop trigger if exists trg_material_issues_updated on public.material_issues;
create trigger trg_material_issues_updated
  before update on public.material_issues
  for each row execute function public.set_updated_at();

-- ---------- 5) RLS (org scoped, same pattern as stock_adjustments) ----------
alter table public.material_issues enable row level security;
alter table public.material_issue_items enable row level security;

drop policy if exists erp_org_select_material_issues on public.material_issues;
create policy erp_org_select_material_issues on public.material_issues
  for select using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_insert_material_issues on public.material_issues;
create policy erp_org_insert_material_issues on public.material_issues
  for insert with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_update_material_issues on public.material_issues;
create policy erp_org_update_material_issues on public.material_issues
  for update using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  ) with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_delete_material_issues on public.material_issues;
create policy erp_org_delete_material_issues on public.material_issues
  for delete using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_select_material_issue_items on public.material_issue_items;
create policy erp_org_select_material_issue_items on public.material_issue_items
  for select using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_insert_material_issue_items on public.material_issue_items;
create policy erp_org_insert_material_issue_items on public.material_issue_items
  for insert with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_update_material_issue_items on public.material_issue_items;
create policy erp_org_update_material_issue_items on public.material_issue_items
  for update using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  ) with check (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

drop policy if exists erp_org_delete_material_issue_items on public.material_issue_items;
create policy erp_org_delete_material_issue_items on public.material_issue_items
  for delete using (
    app_is_system_admin()
    or (app_current_org_id() <> '' and organization_id::text = app_current_org_id())
  );

-- ---------- 6) grants ----------
grant select, insert, update, delete on public.material_issues to authenticated;
grant select, insert, update, delete on public.material_issue_items to authenticated;
grant all on public.material_issues to service_role;
grant all on public.material_issue_items to service_role;
