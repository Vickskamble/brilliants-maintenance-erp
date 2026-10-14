-- ============================================================
-- QMS shared infrastructure: electronic signatures (Part-11) and
-- composite role bundles. Additive; applied after M0.
-- ============================================================

-- ---------- 1. electronic_signatures (immutable) ----------
create table if not exists public.electronic_signatures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  plant_id uuid references public.plants(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text,
  entity_type text not null,
  entity_id uuid not null,
  intent text not null,
  meaning text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.electronic_signatures enable row level security;

drop policy if exists erp_org_select_electronic_signatures on public.electronic_signatures;
drop policy if exists erp_org_insert_electronic_signatures on public.electronic_signatures;

create policy erp_org_select_electronic_signatures on public.electronic_signatures
  for select to authenticated
  using (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

-- insert allowed for org-scoped signatures; signatures are immutable
-- (no update / delete policy -> append-only audit record)
create policy erp_org_insert_electronic_signatures on public.electronic_signatures
  for insert to authenticated
  with check (app_is_system_admin() or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

-- ---------- 2. composite role bundles ----------
create table if not exists public.role_bundles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.role_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.role_bundles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  unique (bundle_id, role_id)
);

alter table public.role_bundles enable row level security;
alter table public.role_bundle_items enable row level security;

do $$
declare
  _org text := 'app_current_org_id()';
  _org_ok text := '(app_current_org_id() <> '''' and organization_id::text = app_current_org_id())';
  _sa text := 'app_is_system_admin()';
  t text;
begin
  foreach t in array array['role_bundles']
  loop
    execute format('drop policy if exists erp_org_select_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_insert_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_update_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_delete_%I on public.%I;', t, t);
    execute format('create policy erp_org_select_%I on public.%I for select to authenticated using (%s or %s);', t, t, _sa, _org_ok);
    execute format('create policy erp_org_insert_%I on public.%I for insert to authenticated with check (%s or %s);', t, t, _sa, _org_ok);
    execute format('create policy erp_org_update_%I on public.%I for update to authenticated using (%s or %s) with check (%s or %s);', t, t, _sa, _org_ok, _sa, _org_ok);
    execute format('create policy erp_org_delete_%I on public.%I for delete to authenticated using (%s or %s);', t, t, _sa, _org_ok);
  end loop;
end $$;

-- role_bundle_assignments: ties a user to a bundle; grants are materialized
-- into user_roles by the server assign endpoint (service role).
create table if not exists public.role_bundle_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  bundle_id uuid not null references public.role_bundles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, bundle_id)
);

alter table public.role_bundle_assignments enable row level security;

drop policy if exists erp_org_select_role_bundle_assignments on public.role_bundle_assignments;
drop policy if exists erp_org_insert_role_bundle_assignments on public.role_bundle_assignments;
drop policy if exists erp_org_update_role_bundle_assignments on public.role_bundle_assignments;
drop policy if exists erp_org_delete_role_bundle_assignments on public.role_bundle_assignments;

create policy erp_org_select_role_bundle_assignments on public.role_bundle_assignments
  for select to authenticated
  using (
    app_is_system_admin()
    or exists (
      select 1 from public.role_bundles b
      where b.id = role_bundle_assignments.bundle_id
        and b.organization_id is not null
        and b.organization_id::text = app_current_org_id()
    )
  );

create policy erp_org_insert_role_bundle_assignments on public.role_bundle_assignments
  for insert to authenticated
  with check (
    app_is_system_admin()
    or exists (
      select 1 from public.role_bundles b
      where b.id = role_bundle_assignments.bundle_id
        and b.organization_id is not null
        and b.organization_id::text = app_current_org_id()
    )
  );

create policy erp_org_update_role_bundle_assignments on public.role_bundle_assignments
  for update to authenticated
  using (app_is_system_admin())
  with check (app_is_system_admin());

create policy erp_org_delete_role_bundle_assignments on public.role_bundle_assignments
  for delete to authenticated
  using (app_is_system_admin());

-- role_bundle_items org check is derived from the parent bundle
drop policy if exists erp_org_select_role_bundle_items on public.role_bundle_items;
drop policy if exists erp_org_insert_role_bundle_items on public.role_bundle_items;
drop policy if exists erp_org_update_role_bundle_items on public.role_bundle_items;
drop policy if exists erp_org_delete_role_bundle_items on public.role_bundle_items;

create policy erp_org_select_role_bundle_items on public.role_bundle_items
  for select to authenticated
  using (
    app_is_system_admin()
    or exists (
      select 1 from public.role_bundles b
      where b.id = role_bundle_items.bundle_id
        and b.organization_id is not null
        and b.organization_id::text = app_current_org_id()
    )
  );

create policy erp_org_insert_role_bundle_items on public.role_bundle_items
  for insert to authenticated
  with check (
    app_is_system_admin()
    or exists (
      select 1 from public.role_bundles b
      where b.id = role_bundle_items.bundle_id
        and b.organization_id is not null
        and b.organization_id::text = app_current_org_id()
    )
  );

-- ---------- 3. seed a demo "QA Team" bundle for BRI ----------
insert into public.role_bundles (id, organization_id, code, name, description)
values (
  '66666666-6666-6666-6666-666666666001',
  '11111111-1111-1111-1111-111111111111',
  'QA_TEAM',
  'QA Team',
  'Composite quality team (QA Officer, QA Manager, Document Controller)'
)
on conflict (organization_id, code) do nothing;

insert into public.role_bundle_items (bundle_id, role_id)
select
  '66666666-6666-6666-6666-666666666001',
  r.id
from public.roles r
where r.organization_id = '11111111-1111-1111-1111-111111111111'
  and r.code in ('QA_OFFICER', 'QA_MANAGER', 'DOC_CONTROLLER')
on conflict (bundle_id, role_id) do nothing;