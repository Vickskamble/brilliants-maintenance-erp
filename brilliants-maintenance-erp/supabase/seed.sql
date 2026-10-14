-- ============================================================
-- Seed data: minimal bootstrap to make the app usable.
-- Run AFTER migrations via: supabase db reset  (loads seed.sql)
-- Safe to run repeatedly (all inserts are conflict-guarded).
--
-- What it creates:
--   1. One organization + one plant.
--   2. Roles: ADMIN, ENGINEER, VIEWER, QA_OFFICER, QA_MANAGER, DOC_CONTROLLER.
--   3. Permissions (module x action) matching app constants.
--   4. Role -> permission grants.
--   5. For the FIRST auth user present, a profile row (id = user id)
--      plus an ADMIN user_role assignment.
-- ============================================================

-- ---------- 1. organization + plant ----------
insert into public.organizations (id, legal_name, display_name, code, industry, timezone, country, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'Brilliants Industrial Services Pvt. Ltd.',
  'Brilliants',
  'BRI',
  'Industrial Maintenance Services',
  'Asia/Kolkata',
  'India',
  'active'
)
on conflict (id) do nothing;

insert into public.plants (id, organization_id, code, name, timezone, status)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'PUN',
  'Pune Plant',
  'Asia/Kolkata',
  'active'
)
on conflict (id) do nothing;

-- ---------- 2. roles ----------
insert into public.roles (id, organization_id, code, name, description, system_role)
values
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administrator', 'Full access to all modules', true),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'ENGINEER', 'Maintenance Engineer', 'Create and update records in operating modules', false),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'VIEWER', 'Read Only', 'View-only access across modules', false),
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'QA_OFFICER', 'QA Officer', 'Quality records, investigations and level-1 review in QMS modules', false),
  ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111', 'QA_MANAGER', 'QA Manager', 'Final QA release / sign-off authority across QMS modules', false),
  ('33333333-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111111', 'DOC_CONTROLLER', 'Document Controller', 'Master list, versioning and file handling for controlled documents', false)
on conflict (id) do nothing;

-- ---------- 3. permissions ----------
insert into public.permissions (id, module, action, description)
select
  ('44444444-4444-4444-4444-' || substr(md5(m.module || m.action), 1, 12))::uuid,
  m.module,
  m.action,
  m.module || ' ' || m.action
from (
  select 'dashboard' as module, a.action from (values ('view'),('create')) as a(action)
  union all select 'equipment', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'maintenance', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'work_order', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'breakdown', a.action from (values ('view'),('create'),('edit'),('delete'),('close')) as a(action)
  union all select 'inspection', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'calibration', a.action from (values ('view'),('create'),('edit')) as a(action)
  union all select 'inventory', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'vendor', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'shutdown', a.action from (values ('view'),('create'),('edit')) as a(action)
  union all select 'reports', a.action from (values ('view')) as a(action)
  union all select 'organization', a.action from (values ('view'),('edit')) as a(action)
  union all select 'settings', a.action from (values ('view'),('create'),('edit'),('delete')) as a(action)
  union all select 'documents', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'deviation', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'capa', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'change_control', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
) m
on conflict (module, action) do nothing;

-- ---------- 4. role -> permission grants ----------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'ADMIN'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'ENGINEER'
  and p.module not in ('dashboard', 'organization', 'reports', 'settings', 'documents', 'deviation', 'capa', 'change_control')
  and p.action <> 'delete'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'VIEWER'
  and p.action = 'view'
  and p.module <> 'settings'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'QA_OFFICER'
  and p.module in ('documents', 'deviation', 'capa', 'change_control')
  and p.action in ('view', 'create', 'edit', 'delete', 'approve', 'close')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'QA_MANAGER'
  and p.module in ('documents', 'deviation', 'capa', 'change_control')
  and p.action in ('view', 'create', 'edit', 'delete', 'approve', 'close')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'DOC_CONTROLLER'
  and p.module = 'documents'
  and p.action in ('view', 'create', 'edit', 'delete', 'close')
on conflict do nothing;

-- ---------- 5. first auth user -> profile + ADMIN role ----------
insert into public.profiles (id, organization_id, employee_code, name, email, plant_id, status)
select
  u.id,
  '11111111-1111-1111-1111-111111111111',
  'EMP-0001',
  coalesce(u.raw_user_meta_data->>'full_name', 'Admin User'),
  u.email,
  '22222222-2222-2222-2222-222222222222',
  'active'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
order by u.created_at
limit 1;

insert into public.user_roles (user_id, role_id, plant_id)
select p.id, '33333333-3333-3333-3333-333333333331', p.plant_id
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id and ur.role_id = '33333333-3333-3333-3333-333333333331'
where ur.user_id is null
order by p.created_at
limit 1;

-- ---------- 6. organizations module + SYSTEM_ADMIN (platform host) ----------
insert into public.permissions (id, module, action, description)
select
  ('44444444-4444-4444-4444-' || substr(md5(m.module || m.action), 1, 12))::uuid,
  m.module,
  m.action,
  m.module || ' ' || m.action
from (
  select 'organizations' as module, a.action
  from (values ('view'),('create'),('edit'),('delete')) as a(action)
) m
on conflict (module, action) do nothing;

insert into public.roles (id, organization_id, code, name, description, system_role)
values (
  '33333333-3333-3333-3333-333333333330',
  null,
  'SYSTEM_ADMIN',
  'Platform Super Admin',
  'Host role: manage companies and their administrators across the platform',
  true
)
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'SYSTEM_ADMIN'
  and r.organization_id is null
on conflict do nothing;