-- ============================================================
-- Assign gkh.karan@gkh.in to GK Healthcare (BRI) as ENGINEER.
--   Profile org set to BRI; existing ENGINEER role (org BRI)
--   now matches -> ENGINEER permissions apply. Claims trigger
--   refreshes org_id; user must re-login for the fresh JWT.
-- ============================================================

do $$
declare
  v_uid uuid := (select id from auth.users where email = 'gkh.karan@gkh.in');
  v_org uuid := '11111111-1111-1111-1111-111111111111';
begin
  if v_uid is null then
    raise exception 'no user with email gkh.karan@gkh.in';
  end if;

  update public.profiles
  set organization_id = v_org
  where id = v_uid;

  -- ensure BRI ENGINEER role assigned
  insert into public.user_roles (user_id, role_id)
  select v_uid, r.id
  from public.roles r
  where r.code = 'ENGINEER' and r.organization_id = v_org
  on conflict (user_id, role_id) do nothing;
end $$;

select u.email,
       u.raw_app_meta_data->>'org_id' as claim_org,
       u.raw_app_meta_data->>'is_system_admin' as claim_sa,
       p.organization_id as profile_org,
       p.plant_id as profile_plant,
       (select array_agg(r.code) from public.user_roles ur
        join public.roles r on r.id = ur.role_id where ur.user_id = u.id) as roles
from auth.users u
join public.profiles p on p.id = u.id
where u.email = 'gkh.karan@gkh.in';