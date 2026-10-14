-- ============================================================
-- QMS RBAC: QMS permission modules + QA roles + grants.
-- Idempotent, additive. Mirrors seed.sql conventions:
--   - permissions use deterministic md5(module || action) ids
--   - ENGINEER grant excludes qms modules (strict domain isolation)
--   - VIEWER keeps read-only access to qms modules
--   - ADMIN cross-join grants every module
-- ============================================================

-- 1. QMS permission modules (documents / deviation / capa / change_control)
insert into public.permissions (id, module, action, description)
select
  ('44444444-4444-4444-4444-' || substr(md5(m.module || m.action), 1, 12))::uuid,
  m.module,
  m.action,
  m.module || ' ' || m.action
from (
  select 'documents' as module, a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'deviation', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'capa', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
  union all select 'change_control', a.action from (values ('view'),('create'),('edit'),('delete'),('approve'),('close')) as a(action)
) m
on conflict (module, action) do nothing;

-- 2. QA roles (template org BRI)
insert into public.roles (id, organization_id, code, name, description, system_role)
values
  ('33333333-3333-3333-3333-333333333334', '11111111-1111-1111-1111-111111111111', 'QA_OFFICER', 'QA Officer', 'Quality records, investigations and level-1 review in QMS modules', false),
  ('33333333-3333-3333-3333-333333333335', '11111111-1111-1111-1111-111111111111', 'QA_MANAGER', 'QA Manager', 'Final QA release / sign-off authority across QMS modules', false),
  ('33333333-3333-3333-3333-333333333336', '11111111-1111-1111-1111-111111111111', 'DOC_CONTROLLER', 'Document Controller', 'Master list, versioning and file handling for controlled documents', false)
on conflict (id) do nothing;

-- 3. ADMIN receives every qms module (cross-join does it)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'ADMIN'
on conflict do nothing;

-- 4. ENGINEER strictly maintains domain isolation (no qms modules)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'ENGINEER'
  and p.module not in ('dashboard', 'organization', 'reports', 'settings', 'documents', 'deviation', 'capa', 'change_control')
  and p.action <> 'delete'
on conflict do nothing;

-- 5. VIEWER keeps read-only access incl. qms modules
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'VIEWER'
  and p.action = 'view'
  and p.module <> 'settings'
on conflict do nothing;

-- 6. QA_OFFICER: level-1 review (approve) + record ownership across qms modules
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'QA_OFFICER'
  and p.module in ('documents', 'deviation', 'capa', 'change_control')
  and p.action in ('view', 'create', 'edit', 'delete', 'approve', 'close')
on conflict do nothing;

-- 7. QA_MANAGER: final release / sign-off (full qms permission set)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'QA_MANAGER'
  and p.module in ('documents', 'deviation', 'capa', 'change_control')
  and p.action in ('view', 'create', 'edit', 'delete', 'approve', 'close')
on conflict do nothing;

-- 8. DOC_CONTROLLER: controlled-document file/version handling, no approval
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'DOC_CONTROLLER'
  and p.module = 'documents'
  and p.action in ('view', 'create', 'edit', 'delete', 'close')
on conflict do nothing;