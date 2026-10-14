-- ============================================================
-- Phase C: Row Level Security — org-scoped defense in depth.
--   Replaces the permissive `erp_allow_access_*` policies
--   (USING(true)) on tenant tables with org-scoped policies
--   driven by JWT claims (org_id / plant_id / is_system_admin).
--   Idempotent; safe to re-run.
-- ============================================================

-- ---------- 0. equipment_components gets org/plant scoping ----------
alter table public.equipment_components
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists plant_id uuid references public.plants(id) on delete set null;

update public.equipment_components ec
set organization_id = e.organization_id,
    plant_id = e.plant_id
from public.equipment e
where e.id = ec.equipment_id
  and ec.organization_id is null;

-- ---------- 1. JWT claim helper functions ----------
create or replace function public.secure_request_token()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select auth.jwt()::text
$$;

create or replace function public.app_current_org_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(coalesce(
    (public.secure_request_token()::jsonb -> 'app_metadata' ->> 'org_id'),
    ''
  ), '')
$$;

create or replace function public.app_current_plant_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(coalesce(
    (public.secure_request_token()::jsonb -> 'app_metadata' ->> 'plant_id'),
    ''
  ), '')
$$;

create or replace function public.app_is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (public.secure_request_token()::jsonb -> 'app_metadata' ->> 'is_system_admin')::boolean,
    false
  )
$$;

-- ---------- 2. keep claims in sync on profiles changes ----------
create or replace function public.sync_org_claims()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
           'org_id', new.organization_id,
           'plant_id', new.plant_id,
           'is_system_admin',
           exists(
             select 1
             from public.user_roles ur
             join public.roles r on r.id = ur.role_id
             where ur.user_id = new.id
               and r.code = 'SYSTEM_ADMIN'
               and r.organization_id is null
           )
         )
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_org_claims on public.profiles;
create trigger sync_org_claims
after insert or update of organization_id, plant_id on public.profiles
for each row execute function public.sync_org_claims();

-- backfill claims for existing profiles (takes effect on next login)
update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
         'org_id', p.organization_id,
         'plant_id', p.plant_id,
         'is_system_admin',
         exists(
           select 1
           from public.user_roles ur
           join public.roles r on r.id = ur.role_id
           where ur.user_id = u.id
             and r.code = 'SYSTEM_ADMIN'
             and r.organization_id is null
         )
       )
from public.profiles p
where u.id = p.id;

-- ---------- 3. org-scoped policies across all org-column tables ----------
do $$
declare
  t text;
  _org text := 'app_current_org_id()';
  _org_ok text := '(app_current_org_id() <> '''' and organization_id::text = app_current_org_id())';
  _sa text := 'app_is_system_admin()';
begin
  for t in
    select c.relname
    from pg_class c
    join information_schema.columns col
      on col.table_schema = current_schema() and col.table_name = c.relname
    where c.relnamespace = 'public'::regnamespace
      and c.relkind = 'r'
      and col.column_name = 'organization_id'
      and c.relname not in ('profiles', 'app_notifications')
    group by c.relname
    order by c.relname
  loop
    execute format('drop policy if exists erp_allow_access_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_select_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_insert_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_update_%I on public.%I;', t, t);
    execute format('drop policy if exists erp_org_delete_%I on public.%I;', t, t);

    execute format(
      'create policy erp_org_select_%I on public.%I for select to authenticated using (%s or %s);',
      t, t, _sa, _org_ok);
    execute format(
      'create policy erp_org_insert_%I on public.%I for insert to authenticated with check (%s or %s);',
      t, t, _sa, _org_ok);
    execute format(
      'create policy erp_org_update_%I on public.%I for update to authenticated using (%s or %s) with check (%s or %s);',
      t, t, _sa, _org_ok, _sa, _org_ok);
    execute format(
      'create policy erp_org_delete_%I on public.%I for delete to authenticated using (%s or %s);',
      t, t, _sa, _org_ok);
  end loop;
end $$;

-- ---------- 4. profiles: own row OR same org OR system admin ----------
drop policy if exists erp_allow_access_profiles on public.profiles;
drop policy if exists erp_profile_select on public.profiles;
drop policy if exists erp_profile_insert on public.profiles;
drop policy if exists erp_profile_update on public.profiles;
drop policy if exists erp_profile_delete on public.profiles;

create policy erp_profile_select on public.profiles for select to authenticated
  using (id = auth.uid() or app_is_system_admin()
         or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));

create policy erp_profile_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and app_current_org_id() <> ''
              and organization_id::text = app_current_org_id());

create policy erp_profile_update on public.profiles for update to authenticated
  using (id = auth.uid() or app_is_system_admin())
  with check (id = auth.uid() and app_current_org_id() <> ''
              and organization_id::text = app_current_org_id());

create policy erp_profile_delete on public.profiles for delete to authenticated
  using (app_is_system_admin());

-- ---------- 5. organizations: only your own (or super admin) ----------
drop policy if exists erp_allow_access_organizations on public.organizations;
drop policy if exists erp_org_select_organizations on public.organizations;
create policy erp_org_select_organizations on public.organizations for select to authenticated
  using (app_is_system_admin()
         or (app_current_org_id() <> '' and id::text = app_current_org_id()));

-- ---------- 6. junction tables derive org through roles ----------
drop policy if exists erp_allow_access_user_roles on public.user_roles;
drop policy if exists erp_org_select_user_roles on public.user_roles;
drop policy if exists erp_org_insert_user_roles on public.user_roles;
drop policy if exists erp_org_update_user_roles on public.user_roles;
drop policy if exists erp_org_delete_user_roles on public.user_roles;

create policy erp_user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or app_is_system_admin()
         or role_id in (select r.id from public.roles r
                        where r.organization_id::text = app_current_org_id()));
create policy erp_user_roles_insert on public.user_roles for insert to authenticated
  with check (app_is_system_admin()
              or role_id in (select r.id from public.roles r
                             where r.organization_id::text = app_current_org_id()));
create policy erp_user_roles_update on public.user_roles for update to authenticated
  using (app_is_system_admin() or user_id = auth.uid())
  with check (app_is_system_admin()
              or role_id in (select r.id from public.roles r
                             where r.organization_id::text = app_current_org_id()));
create policy erp_user_roles_delete on public.user_roles for delete to authenticated
  using (app_is_system_admin() or user_id = auth.uid());

drop policy if exists erp_allow_access_role_permissions on public.role_permissions;
drop policy if exists erp_role_permissions_select on public.role_permissions;
drop policy if exists erp_role_permissions_insert on public.role_permissions;
drop policy if exists erp_role_permissions_update on public.role_permissions;
drop policy if exists erp_role_permissions_delete on public.role_permissions;

create policy erp_role_permissions_select on public.role_permissions for select to authenticated
  using (app_is_system_admin()
         or role_id in (select r.id from public.roles r
                        where r.organization_id::text = app_current_org_id()));
create policy erp_role_permissions_insert on public.role_permissions for insert to authenticated
  with check (app_is_system_admin()
              or role_id in (select r.id from public.roles r
                             where r.organization_id::text = app_current_org_id()));
create policy erp_role_permissions_update on public.role_permissions for update to authenticated
  using (app_is_system_admin()
         or role_id in (select r.id from public.roles r
                        where r.organization_id::text = app_current_org_id()))
  with check (app_is_system_admin()
              or role_id in (select r.id from public.roles r
                             where r.organization_id::text = app_current_org_id()));
create policy erp_role_permissions_delete on public.role_permissions for delete to authenticated
  using (app_is_system_admin()
         or role_id in (select r.id from public.roles r
                        where r.organization_id::text = app_current_org_id()));

-- roles with org null are platform/system roles: readable only by system admin
drop policy if exists erp_allow_access_roles on public.roles;
drop policy if exists erp_org_select_roles on public.roles;
drop policy if exists erp_org_insert_roles on public.roles;
drop policy if exists erp_org_update_roles on public.roles;
drop policy if exists erp_org_delete_roles on public.roles;
create policy erp_org_select_roles on public.roles for select to authenticated
  using (app_is_system_admin()
         or (organization_id is not null and organization_id::text = app_current_org_id())
         or (organization_id is null and app_current_org_id() <> ''));
create policy erp_org_insert_roles on public.roles for insert to authenticated
  with check (organization_id is null or organization_id::text = app_current_org_id());
create policy erp_org_update_roles on public.roles for update to authenticated
  using (organization_id::text = app_current_org_id())
  with check (organization_id::text = app_current_org_id());
create policy erp_org_delete_roles on public.roles for delete to authenticated
  using (organization_id::text = app_current_org_id());

-- plants org-scoped (loop already handles it; keep org-null from leaking)
drop policy if exists erp_allow_access_plants on public.plants;
drop policy if exists erp_org_select_plants on public.plants;
drop policy if exists erp_org_insert_plants on public.plants;
drop policy if exists erp_org_update_plants on public.plants;
drop policy if exists erp_org_delete_plants on public.plants;
create policy erp_org_select_plants on public.plants for select to authenticated
  using (app_is_system_admin()
         or (app_current_org_id() <> '' and organization_id::text = app_current_org_id()));
create policy erp_org_insert_plants on public.plants for insert to authenticated
  with check (organization_id::text = app_current_org_id());
create policy erp_org_update_plants on public.plants for update to authenticated
  using (organization_id::text = app_current_org_id())
  with check (organization_id::text = app_current_org_id());
create policy erp_org_delete_plants on public.plants for delete to authenticated
  using (organization_id::text = app_current_org_id());

-- ---------- 7. maintenance_run_logs: replace generic policies ----------
drop policy if exists "run logs insert authenticated" on public.maintenance_run_logs;
drop policy if exists "run logs select authenticated" on public.maintenance_run_logs;

-- ---------- 8. notifications: harden security-definer functions ----------
create or replace function public.add_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_plant uuid;
  v_in_app boolean;
  v_caller_org uuid;
  v_caller_is_sa boolean;
begin
  if p_user_id is null then return; end if;

  select organization_id, plant_id into v_org, v_plant
  from public.profiles where id = p_user_id;
  if v_org is null then return; end if;

  -- caller can only notify users inside their own org (or as system admin)
  select organization_id into v_caller_org
  from public.profiles where id = auth.uid();
  v_caller_is_sa := public.app_is_system_admin();
  if not v_caller_is_sa and v_caller_org is distinct from v_org then
    raise exception 'Not allowed to notify users outside your organization';
  end if;

  select in_app into v_in_app
  from public.notification_preferences where user_id = p_user_id and type = p_type;
  if v_in_app is not true then return; end if;

  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  ) values (
    v_org, v_plant, p_user_id, p_type, p_title, p_message, p_link, p_entity_type, p_entity_id
  );
end;
$$;

-- engine: keep future runs org-scoped inside the definer function too
create or replace function public.refresh_my_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid;
  v_plant uuid;
  v_enabled text[];
begin
  if v_uid is null then return; end if;

  select organization_id, plant_id into v_org, v_plant
  from public.profiles where id = v_uid;
  if v_org is null then return; end if;

  insert into public.notification_preferences (user_id, type)
  select v_uid, t
  from unnest(array['pm_due','pm_overdue','wo_assigned','breakdown_sla','low_stock','approval_required']) as t
  on conflict (user_id, type) do nothing;

  select array_agg(type) into v_enabled
  from public.notification_preferences
  where user_id = v_uid and in_app;

  -- PM due / overdue
  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  select
    v_org,
    coalesce(e.plant_id, v_plant),
    v_uid,
    case when s.next_run_at < now() then 'pm_overdue' else 'pm_due' end,
    case
      when s.next_run_at < now() then 'PM overdue: ' || coalesce(e.equipment_code, s.schedule_no, 'Scheduled maintenance')
      else 'PM due: ' || coalesce(e.equipment_code, s.schedule_no, 'Scheduled maintenance')
    end,
    'Runs ' || coalesce(s.task_type, 'maintenance') || ' at ' ||
      to_char(s.next_run_at, 'YYYY-MM-DD HH24:MI'),
    '/maintenance/' || s.id,
    'maintenance_schedule',
    s.id
  from public.maintenance_schedules s
  left join public.equipment e on e.id = s.equipment_id
  where s.is_active
    and s.organization_id = v_org
    and s.next_run_at is not null
    and s.next_run_at <= now() + interval '7 days'
    and (v_plant is null or e.plant_id is null or e.plant_id = v_plant)
    and (case when s.next_run_at < now() then 'pm_overdue' else 'pm_due' end) = any(v_enabled)
    and not exists (
      select 1 from public.app_notifications n
      where n.user_id = v_uid and n.entity_type = 'maintenance_schedule'
        and n.entity_id = s.id and n.type in ('pm_due', 'pm_overdue')
    );

  -- Work orders assigned to the caller
  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  select
    v_org,
    coalesce(w.plant_id, v_plant),
    v_uid,
    'wo_assigned',
    'Work order assigned: ' || w.work_order_no,
    coalesce(w.title, 'Work order'),
    '/work-orders/' || w.id,
    'work_order',
    w.id
  from public.work_orders w
  where w.organization_id = v_org
    and w.status not in ('closed', 'cancelled', 'completed')
    and w.assigned_to is not null and w.assigned_to <> ''
    and 'wo_assigned' = any(v_enabled)
    and exists (
      select 1 from public.profiles p
      where p.id = v_uid
        and (lower(p.name) = lower(w.assigned_to) or lower(p.email) = lower(w.assigned_to))
    )
    and not exists (
      select 1 from public.app_notifications n
      where n.user_id = v_uid and n.entity_type = 'work_order'
        and n.entity_id = w.id and n.type = 'wo_assigned'
    );

  -- SLA breach on open breakdowns
  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  select
    v_org,
    coalesce(b.plant_id, v_plant),
    v_uid,
    'breakdown_sla',
    'SLA breach: ' || b.breakdown_no,
    coalesce(b.problem_description, 'Breakdown exceeds response SLA'),
    '/breakdowns/' || b.id,
    'breakdown',
    b.id
  from public.breakdowns b
  where b.organization_id = v_org
    and b.status in ('reported', 'acknowledged', 'in_progress')
    and b.reported_at is not null
    and (v_plant is null or b.plant_id is null or b.plant_id = v_plant)
    and 'breakdown_sla' = any(v_enabled)
    and (
      exists (
        select 1 from public.sla_rules s
        where s.organization_id = v_org and s.module = 'breakdown' and s.status = 'active'
          and (s.priority = b.severity or s.priority is null)
          and extract(epoch from (now() - b.reported_at)) / 60 > s.duration_minutes
      )
      or (
        not exists (
          select 1 from public.sla_rules s
          where s.organization_id = v_org and s.module = 'breakdown' and s.status = 'active'
        )
        and extract(epoch from (now() - b.reported_at)) / 60 > 480
      )
    )
    and not exists (
      select 1 from public.app_notifications n
      where n.user_id = v_uid and n.entity_type = 'breakdown'
        and n.entity_id = b.id and n.type = 'breakdown_sla'
    );

  -- Low stock parts
  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  select
    v_org,
    coalesce(sp.plant_id, v_plant),
    v_uid,
    'low_stock',
    'Low stock: ' || sp.part_name,
    sp.part_code || ' — ' || sp.current_stock || ' ' || coalesce(sp.unit, 'pcs') ||
      ' (reorder at ' || sp.reorder_level || ')',
    '/spare-parts/' || sp.id,
    'spare_part',
    sp.id
  from public.spare_parts sp
  where sp.organization_id = v_org
    and sp.reorder_level > 0 and sp.current_stock <= sp.reorder_level
    and (v_plant is null or sp.plant_id is null or sp.plant_id = v_plant)
    and 'low_stock' = any(v_enabled)
    and not exists (
      select 1 from public.app_notifications n
      where n.user_id = v_uid and n.entity_type = 'spare_part'
        and n.entity_id = sp.id and n.type = 'low_stock'
    );

  -- Pending approvals (org-scoped)
  insert into public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  select
    v_org,
    coalesce(wd.plant_id, v_plant),
    v_uid,
    'approval_required',
    'Approval required: ' || wa.entity_type || ' #' || left(wa.entity_id::text, 8),
    coalesce(ws.step_name, 'Approve pending'),
    case
      when wa.entity_type = 'work_order' then '/work-orders/' || wa.entity_id
      when wa.entity_type = 'material_request' then '/inventory/requests'
      when wa.entity_type = 'purchase_order' then '/inventory/orders'
      else '/settings/workflows'
    end,
    wa.entity_type,
    wa.entity_id
  from public.workflow_approvals wa
  join public.workflow_steps ws on ws.id = wa.step_id
  join public.workflow_definitions wd on wd.id = wa.workflow_definition_id
  where wa.organization_id = v_org
    and wa.status = 'pending'
    and wa.requested_by is distinct from v_uid
    and 'approval_required' = any(v_enabled)
    and (v_plant is null or wd.plant_id is null or wd.plant_id = v_plant)
    and (
      ws.approval_role_code is null
      or exists (
        select 1 from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.user_id = v_uid and r.code = ws.approval_role_code
      )
    )
    and not exists (
      select 1 from public.app_notifications n
      where n.user_id = v_uid and n.entity_type = wa.entity_type
        and n.entity_id = wa.entity_id and n.type = 'approval_required'
    );
end;
$$;