-- Backfill organization_id / plant_id on profiles left blank by the
-- `on_auth_user_created` trigger.
--
-- That trigger inserts a profile row with only (id, name, email, phone) the
-- moment an auth user is created. The /api/users/invite route used to skip its
-- own profile insert when a row already existed, so users created through the
-- UI ended up with organization_id = NULL.
--
-- Impact: app_current_org_id() resolves to '' for such users, so the RLS
-- policy on role_permissions returns nothing (empty permission set => no nav
-- menu) and every erp_org_* table returns no rows (no data).
--
-- host@brilliants.in is intentionally left organization-less: it holds
-- SYSTEM_ADMIN and is a platform-level account.

update public.profiles p
set organization_id = sub.org_id,
    plant_id = coalesce(p.plant_id, sub.plant_id)
from (
  select ur.user_id,
         max(r.organization_id::text)::uuid as org_id,
         max(ur.plant_id::text)::uuid      as plant_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.organization_id is not null
  group by ur.user_id
) sub
where p.id = sub.user_id
  and p.organization_id is null
  and p.email <> 'host@brilliants.in';
