-- Additive approval-engine support (P1-P3 of docs/ACCESS_APPROVAL_PLAN.md).
-- Extends workflow tables, adds an activity_log audit trail, seeds approve/reject
-- permissions, and bootstraps an inventory approval definition. All idempotent.

-- >>> 1. workflow_steps: direct approver + reject-reason + condition + notify
ALTER TABLE public.workflow_steps
  ADD COLUMN IF NOT EXISTS approver_user_id uuid,
  ADD COLUMN IF NOT EXISTS require_reject_reason boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS condition jsonb,
  ADD COLUMN IF NOT EXISTS notify_role_codes text[] NOT NULL DEFAULT '{}';

-- >>> 2. workflow_instances: snapshot of the entity status at submit + decided status
ALTER TABLE public.workflow_instances
  ADD COLUMN IF NOT EXISTS entity_current_status text,
  ADD COLUMN IF NOT EXISTS entity_updated_status text;

-- >>> 3. activity_log audit trail
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  plant_id uuid,
  user_id uuid,
  module text,
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "erp_allow_access_activity_log" ON public.activity_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- >>> 4. approve / reject / approval-view permissions
INSERT INTO public.permissions (id, module, action, description)
SELECT
  ('44444444-4444-4444-4444-' || substr(md5(m.module || m.action), 1, 12))::uuid,
  m.module,
  m.action,
  m.module || ' ' || m.action
FROM (
  SELECT 'work_order' AS module, a.action FROM (VALUES ('reject')) AS a(action)
  UNION ALL
  SELECT 'inventory', a.action FROM (VALUES ('approve'), ('reject')) AS a(action)
  UNION ALL
  SELECT 'approval', a.action FROM (VALUES ('view'), ('approve'), ('reject')) AS a(action)
  UNION ALL
  SELECT 'work_order', a.action FROM (VALUES ('approve')) AS a(action)
) m
ON CONFLICT (module, action) DO NOTHING;

-- >>> 5. role grants (ADMIN gets everything on these modules; ENGINEER gets action roles)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON (p.module = 'approval' AND p.action IN ('view', 'approve', 'reject'))
  OR (p.module = 'work_order' AND p.action IN ('approve', 'reject'))
  OR (p.module = 'inventory' AND p.action IN ('approve', 'reject'))
WHERE r.code = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p
  ON (p.module = 'approval' AND p.action = 'view')
  OR (p.module = 'work_order' AND p.action IN ('approve', 'reject'))
  OR (p.module = 'inventory' AND p.action IN ('approve', 'reject'))
WHERE r.code = 'ENGINEER'
ON CONFLICT DO NOTHING;

-- >>> 6. Existing "WO approval flow": approve via work_order:approve permission (role-agnostic)
UPDATE public.workflow_steps ws
SET approval_role_code = NULL
FROM public.workflow_definitions wd
WHERE ws.workflow_definition_id = wd.id
  AND wd.module = 'work_order'
  AND ws.require_approval = true
  AND ws.to_status = 'approved';

-- >>> 7. Inventory approval flow (used by material requests + purchase orders)
INSERT INTO public.workflow_definitions (id, organization_id, plant_id, module, name, description, status)
VALUES (
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'inventory',
  'Inventory approval flow',
  'Material request / purchase order approval',
  'active'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.workflow_steps (id, workflow_definition_id, order_index, step_name, from_status, to_status, required_roles, require_approval, approval_role_code)
VALUES
  ('55555555-5555-5555-5555-555555555552', '55555555-5555-5555-5555-555555555551', 0, 'draft to submit', 'draft', 'submitted', NULL, false, NULL),
  ('55555555-5555-5555-5555-555555555553', '55555555-5555-5555-5555-555555555551', 1, 'submit to approve', 'submitted', 'approved', NULL, true, NULL)
ON CONFLICT (id) DO NOTHING;