-- ============================================================
-- Phase B: platform super admin role + companies module.
--   - organizations module (view/create/edit/delete)
--   - SYSTEM_ADMIN global role (organization_id = null) that owns
--     company onboarding. Only users WITHOUT an organization can
--     inherit it (see src/lib/auth/server.ts).
-- Idempotent; safe to re-run.
-- ============================================================

-- ---------- organizations module permissions ----------
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

-- ---------- SYSTEM_ADMIN global role ----------
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

-- ---------- grant every permission to SYSTEM_ADMIN ----------
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'SYSTEM_ADMIN'
  and r.organization_id is null
on conflict do nothing;