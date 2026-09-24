-- Additive Phase 8: in-app notifications. New tables only.
-- Engine = refresh_my_notifications() RPC that materializes fresh notifications
-- for the calling user, scoped to their org/plant and respecting preferences.
-- CALIBRATION_DUE is an extension point until the calibration module ships a table.

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  plant_id uuid REFERENCES public.plants(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON public.app_notifications (user_id, read_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_org ON public.app_notifications (organization_id, plant_id);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type)
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read/update/delete only their own notifications. Inserts are done by
-- the security-definer engine function, which bypasses RLS by design.
CREATE POLICY "erp_own_app_notifications_select"
  ON public.app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "erp_own_app_notifications_update"
  ON public.app_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "erp_own_app_notifications_delete"
  ON public.app_notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "erp_own_preferences_all"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Explicit per-recipient notification (callable from app code or future modules).
CREATE OR REPLACE FUNCTION public.add_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text DEFAULT NULL,
  p_link text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_plant uuid;
  v_in_app boolean;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT organization_id, plant_id INTO v_org, v_plant
  FROM public.profiles WHERE id = p_user_id;
  IF v_org IS NULL THEN RETURN; END IF;

  SELECT in_app INTO v_in_app
  FROM public.notification_preferences WHERE user_id = p_user_id AND type = p_type;
  IF v_in_app IS NOT TRUE THEN RETURN; END IF;

  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  ) VALUES (
    v_org, v_plant, p_user_id, p_type, p_title, p_message, p_link, p_entity_type, p_entity_id
  );
END;
$$;

-- Engine: materialize fresh notifications for the calling user.
CREATE OR REPLACE FUNCTION public.refresh_my_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_plant uuid;
  v_enabled text[];
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;

  SELECT organization_id, plant_id INTO v_org, v_plant
  FROM public.profiles WHERE id = v_uid;
  IF v_org IS NULL THEN RETURN; END IF;

  -- Ensure a preference row exists for every supported type, defaulting to on.
  INSERT INTO public.notification_preferences (user_id, type)
  SELECT v_uid, t
  FROM unnest(ARRAY['pm_due','pm_overdue','wo_assigned','breakdown_sla','low_stock','approval_required']) AS t
  ON CONFLICT (user_id, type) DO NOTHING;

  SELECT array_agg(type) INTO v_enabled
  FROM public.notification_preferences
  WHERE user_id = v_uid AND in_app;

  -- PM due / overdue (from maintenance_schedules, next_run_at within 7 days).
  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  SELECT
    v_org,
    COALESCE(e.plant_id, v_plant),
    v_uid,
    CASE WHEN s.next_run_at < now() THEN 'pm_overdue' ELSE 'pm_due' END,
    CASE
      WHEN s.next_run_at < now() THEN 'PM overdue: ' || COALESCE(e.equipment_code, s.schedule_no, 'Scheduled maintenance')
      ELSE 'PM due: ' || COALESCE(e.equipment_code, s.schedule_no, 'Scheduled maintenance')
    END,
    'Runs ' || COALESCE(s.task_type, 'maintenance') || ' at ' ||
      to_char(s.next_run_at, 'YYYY-MM-DD HH24:MI'),
    '/maintenance/' || s.id,
    'maintenance_schedule',
    s.id
  FROM public.maintenance_schedules s
  LEFT JOIN public.equipment e ON e.id = s.equipment_id
  WHERE s.is_active
    AND s.next_run_at IS NOT NULL
    AND s.next_run_at <= now() + interval '7 days'
    AND (v_plant IS NULL OR e.plant_id IS NULL OR e.plant_id = v_plant)
    AND (CASE WHEN s.next_run_at < now() THEN 'pm_overdue' ELSE 'pm_due' END) = ANY(v_enabled)
    AND NOT EXISTS (
      SELECT 1 FROM public.app_notifications n
      WHERE n.user_id = v_uid
        AND n.entity_type = 'maintenance_schedule'
        AND n.entity_id = s.id
        AND n.type IN ('pm_due', 'pm_overdue')
    );

  -- Work orders assigned to the caller.
  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  SELECT
    v_org,
    COALESCE(w.plant_id, v_plant),
    v_uid,
    'wo_assigned',
    'Work order assigned: ' || w.work_order_no,
    COALESCE(w.title, 'Work order'),
    '/work-orders/' || w.id,
    'work_order',
    w.id
  FROM public.work_orders w
  WHERE w.status NOT IN ('closed', 'cancelled', 'completed')
    AND w.assigned_to IS NOT NULL
    AND w.assigned_to <> ''
    AND 'wo_assigned' = ANY(v_enabled)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_uid
        AND (lower(p.name) = lower(w.assigned_to) OR lower(p.email) = lower(w.assigned_to))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.app_notifications n
      WHERE n.user_id = v_uid
        AND n.entity_type = 'work_order'
        AND n.entity_id = w.id
        AND n.type = 'wo_assigned'
    );

  -- SLA breach on open breakdowns.
  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  SELECT
    v_org,
    COALESCE(b.plant_id, v_plant),
    v_uid,
    'breakdown_sla',
    'SLA breach: ' || b.breakdown_no,
    COALESCE(b.problem_description, 'Breakdown exceeds response SLA'),
    '/breakdowns/' || b.id,
    'breakdown',
    b.id
  FROM public.breakdowns b
  WHERE b.status IN ('reported', 'acknowledged', 'in_progress')
    AND b.reported_at IS NOT NULL
    AND (v_plant IS NULL OR b.plant_id IS NULL OR b.plant_id = v_plant)
    AND 'breakdown_sla' = ANY(v_enabled)
    AND (
      EXISTS (
        SELECT 1 FROM public.sla_rules s
        WHERE s.module = 'breakdown'
          AND s.status = 'active'
          AND (s.priority = b.severity OR s.priority IS NULL)
          AND extract(epoch FROM (now() - b.reported_at)) / 60 > s.duration_minutes
      )
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.sla_rules s
          WHERE s.module = 'breakdown' AND s.status = 'active'
        )
        AND extract(epoch FROM (now() - b.reported_at)) / 60 > 480
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.app_notifications n
      WHERE n.user_id = v_uid
        AND n.entity_type = 'breakdown'
        AND n.entity_id = b.id
        AND n.type = 'breakdown_sla'
    );

  -- Low stock parts (current_stock at or below reorder level).
  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  SELECT
    v_org,
    COALESCE(sp.plant_id, v_plant),
    v_uid,
    'low_stock',
    'Low stock: ' || sp.part_name,
    sp.part_code || ' — ' || sp.current_stock || ' ' || COALESCE(sp.unit, 'pcs') ||
      ' (reorder at ' || sp.reorder_level || ')',
    '/spare-parts/' || sp.id,
    'spare_part',
    sp.id
  FROM public.spare_parts sp
  WHERE sp.reorder_level > 0
    AND sp.current_stock <= sp.reorder_level
    AND (v_plant IS NULL OR sp.plant_id IS NULL OR sp.plant_id = v_plant)
    AND 'low_stock' = ANY(v_enabled)
    AND NOT EXISTS (
      SELECT 1 FROM public.app_notifications n
      WHERE n.user_id = v_uid
        AND n.entity_type = 'spare_part'
        AND n.entity_id = sp.id
        AND n.type = 'low_stock'
    );

  -- Pending approvals where the caller is an approver (or no role gated).
  INSERT INTO public.app_notifications (
    organization_id, plant_id, user_id, type, title, message, link, entity_type, entity_id
  )
  SELECT
    v_org,
    COALESCE(wd.plant_id, v_plant),
    v_uid,
    'approval_required',
    'Approval required: ' || wa.entity_type || ' #' || left(wa.entity_id::text, 8),
    COALESCE(ws.step_name, 'Approve pending'),
    CASE
      WHEN wa.entity_type = 'work_order' THEN '/work-orders/' || wa.entity_id
      WHEN wa.entity_type = 'material_request' THEN '/inventory/requests'
      WHEN wa.entity_type = 'purchase_order' THEN '/inventory/orders'
      ELSE '/settings/workflows'
    END,
    wa.entity_type,
    wa.entity_id
  FROM public.workflow_approvals wa
  JOIN public.workflow_steps ws ON ws.id = wa.step_id
  JOIN public.workflow_definitions wd ON wd.id = wa.workflow_definition_id
  WHERE wa.status = 'pending'
    AND wa.requested_by IS DISTINCT FROM v_uid
    AND 'approval_required' = ANY(v_enabled)
    AND (v_plant IS NULL OR wd.plant_id IS NULL OR wd.plant_id = v_plant)
    AND (
      ws.approval_role_code IS NULL
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = v_uid AND r.code = ws.approval_role_code
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.app_notifications n
      WHERE n.user_id = v_uid
        AND n.entity_type = wa.entity_type
        AND n.entity_id = wa.entity_id
        AND n.type = 'approval_required'
    );
END;
$$;

-- Unread count for the calling user (cheap for header badge).
CREATE OR REPLACE FUNCTION public.get_unread_notifications_count()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT count(*)::int
  FROM public.app_notifications
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;
