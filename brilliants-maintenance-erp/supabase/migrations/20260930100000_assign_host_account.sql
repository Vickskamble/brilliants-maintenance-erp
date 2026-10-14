-- ============================================================
-- Assign the Brilliants platform HOST account (system admin).
--   Creates a dedicated auth user with profile.organization_id
--   = NULL and the global SYSTEM_ADMIN role, then refreshes the
--   JWT claims (is_system_admin) via the profile claims trigger.
--   Note: the on_auth_user_created trigger auto-creates the
--   profile row; user must log in once (fresh JWT) for claims.
-- ============================================================

do $$
declare
  v_uid uuid := gen_random_uuid();
  v_email text := 'host@brilliants.in';
  v_temp_password text := 'uozMUxVDKaPovR3u';
  v_sa_role uuid := '33333333-3333-3333-3333-333333333330';
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'host user already exists (%); skipping', v_email;
    return;
  end if;

  insert into auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    v_email, crypt(v_temp_password, gen_salt('bf')),
    now(), now(),
    jsonb_build_object(
      'provider', 'email', 'providers', jsonb_build_array('email'),
      'org_id', null, 'plant_id', null, 'is_system_admin', true
    ),
    jsonb_build_object('sub', v_uid::text, 'full_name', 'Platform Admin', 'email', v_email),
    now(), now()
  );

  -- profile auto-created by on_auth_user_created (org null) —
  -- ensure org/plant remain null, then assign the role
  update public.profiles set organization_id = null, plant_id = null where id = v_uid;

  insert into public.user_roles (user_id, role_id, plant_id)
  values (v_uid, v_sa_role, null);

  -- claims trigger at profile creation saw no role; touch profile
  -- (UPDATE OF organization_id/plant_id) to set is_system_admin true
  update public.profiles set plant_id = plant_id where id = v_uid;
end $$;

select u.email,
       u.raw_app_meta_data->>'org_id' as claim_org,
       u.raw_app_meta_data->>'is_system_admin' as claim_sa,
       p.organization_id as profile_org,
       (select array_agg(r.code) from public.user_roles ur
        join public.roles r on r.id = ur.role_id where ur.user_id = u.id) as roles
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'host@brilliants.in';