-- ============================================================
-- QMS approval engine v2: multi-level chain + parallel + deadlines.
-- Each version is additive; existing work_order/inventory flows are
-- unaffected (approval_mode defaults to 'single', no next step found
-- -> engine keeps the original complete-on-approve behavior).
-- ============================================================

-- ---------- 1. workflow schema extensions ----------
alter table public.workflow_definitions
  add column if not exists sla_hours int;

alter table public.workflow_steps
  add column if not exists approval_mode text not null default 'single',
  add column if not exists sla_hours int;

alter table public.workflow_approvals
  add column if not exists due_at timestamptz,
  add column if not exists escalated_at timestamptz,
  add column if not exists escalated_to uuid references public.profiles(id) on delete set null,
  add column if not exists escalated_to_role text,
  add column if not exists escalation_note text;

-- ---------- 2. QMS workflow definitions (template org BRI) ----------
insert into public.workflow_definitions (id, organization_id, plant_id, module, name, description, status, sla_hours)
values
  ('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'documents', 'Document release flow', 'SOP / controlled document release (L1 QA Officer, L2 QA Manager)', 'active', 168),
  ('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'deviation', 'Deviation flow', 'Deviation investigation and closure (L1 QA Officer, L2 QA Manager)', 'active', 72),
  ('77777777-7777-7777-7777-777777777703', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'capa', 'CAPA flow', 'CAPA plan approval and effectiveness closure (L1 QA Officer, L2 QA Manager)', 'active', 120),
  ('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'change_control', 'Change control flow', 'CCB risk review, approval, verification and closure', 'active', 168)
on conflict (id) do nothing;

insert into public.workflow_steps (id, workflow_definition_id, order_index, step_name, from_status, to_status, required_roles, require_approval, approval_role_code, sla_hours)
values
  -- documents
  ('77777777-7777-7777-7777-777777777701', '77777777-7777-7777-7777-777777777701', 0, 'draft to submit', 'draft', 'submitted', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777702', '77777777-7777-7777-7777-777777777701', 1, 'QA Officer review', 'submitted', 'approved', NULL, true, 'QA_OFFICER', 72),
  ('77777777-7777-7777-7777-777777777703', '77777777-7777-7777-7777-777777777701', 2, 'QA Manager release', 'approved', 'effective', NULL, true, 'QA_MANAGER', 96),
  ('77777777-7777-7777-7777-777777777704', '77777777-7777-7777-7777-777777777701', 3, 'effective to superseded', 'effective', 'superseded', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777705', '77777777-7777-7777-7777-777777777701', 4, 'effective to withdrawn', 'effective', 'withdrawn', NULL, false, NULL, NULL),
  -- deviation
  ('77777777-7777-7777-7777-777777777711', '77777777-7777-7777-7777-777777777702', 0, 'open to submit', 'open', 'submitted', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777712', '77777777-7777-7777-7777-777777777702', 1, 'QA Officer investigation approval', 'submitted', 'approved', NULL, true, 'QA_OFFICER', 48),
  ('77777777-7777-7777-7777-777777777713', '77777777-7777-7777-7777-777777777702', 2, 'approved to actioned', 'approved', 'actioned', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777714', '77777777-7777-7777-7777-777777777702', 3, 'QA Manager closure', 'actioned', 'closed', NULL, true, 'QA_MANAGER', 72),
  -- capa
  ('77777777-7777-7777-7777-777777777721', '77777777-7777-7777-7777-777777777703', 0, 'initiated to submit', 'initiated', 'submitted', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777722', '77777777-7777-7777-7777-777777777703', 1, 'QA Officer plan approval', 'submitted', 'approved', NULL, true, 'QA_OFFICER', 72),
  ('77777777-7777-7777-7777-777777777723', '77777777-7777-7777-7777-777777777703', 2, 'approved to implemented', 'approved', 'implemented', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777724', '77777777-7777-7777-7777-777777777703', 3, 'QA Manager effectiveness close', 'implemented', 'closed', NULL, true, 'QA_MANAGER', 72),
  -- change control
  ('77777777-7777-7777-7777-777777777731', '77777777-7777-7777-7777-777777777704', 0, 'submitted to risk review', 'submitted', 'risk_review', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777732', '77777777-7777-7777-7777-777777777704', 1, 'QA Officer risk approval', 'risk_review', 'approved', NULL, true, 'QA_OFFICER', 72),
  ('77777777-7777-7777-7777-777777777733', '77777777-7777-7777-7777-777777777704', 2, 'approved to implemented', 'approved', 'implemented', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777734', '77777777-7777-7777-7777-777777777704', 3, 'implemented to verified', 'implemented', 'verified', NULL, false, NULL, NULL),
  ('77777777-7777-7777-7777-777777777735', '77777777-7777-7777-7777-777777777704', 4, 'QA Manager verification close', 'verified', 'closed', NULL, true, 'QA_MANAGER', 96)
on conflict (id) do nothing;

-- Backfill org/plant on the seeded steps: RLS on workflow_steps is org-scoped,
-- so steps with a NULL organization_id would be hidden from tenant users.
update public.workflow_steps ws
set organization_id = wd.organization_id,
    plant_id = wd.plant_id
from public.workflow_definitions wd
where ws.workflow_definition_id = wd.id
  and wd.id::text like '77777777%'
  and (ws.organization_id is null or ws.plant_id is null);

-- ---------- 3. refresh_my_notifications: QMS approval links ----------
-- Faithful recreation of the live org-scoped RPC with QMS entity-type link
-- branches added. search_path and every organization_id filter are preserved
-- exactly so existing notification behavior is unchanged.
create or replace function public.refresh_my_notifications()
returns void
language plpgsql
security definer
set search_path to ''
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
      when wa.entity_type = 'document' then '/quality/documents/' || wa.entity_id
      when wa.entity_type = 'deviation' then '/quality/deviations/' || wa.entity_id
      when wa.entity_type = 'capa' then '/quality/capas/' || wa.entity_id
      when wa.entity_type = 'change' then '/quality/change-control/' || wa.entity_id
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

-- ---------- 4. pg_cron job: approval deadline reminders / escalation ----------
-- Runs every 2 hours. Endpoint guarded by x-automation-secret (value = app
-- env AUTOMATION_TOKEN). Replace <AUTOMATION_TOKEN> at apply time; the real
-- token is never committed (repository is public).
-- Uses cron.schedule (SECURITY DEFINER) because the migration role cannot
-- insert into cron.job directly.
do $do$
begin
  if not exists (select 1 from cron.job where jobname = 'qa-approval') then
    perform cron.schedule(
      'qa-approval',
      '0 */2 * * *',
      $cron$
      select net.http_post(
        url := 'https://erp.brilliants.in/api/automations/approval-sla',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-automation-secret', '<AUTOMATION_TOKEN>'),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      )
      $cron$
    );
  end if;
end
$do$;