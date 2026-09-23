-- Additive Phase 5: workflow engine + SLA rules. New tables only, existing status values untouched.
-- Guardrail: workflow rows reference existing module statuses; they never alter existing tables.

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plant_id uuid,
  module text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  step_name text NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  required_roles text[],
  require_approval boolean NOT NULL DEFAULT false,
  approval_role_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  current_step_id uuid REFERENCES public.workflow_steps(id),
  current_status text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_definition_id uuid NOT NULL REFERENCES public.workflow_definitions(id),
  workflow_instance_id uuid REFERENCES public.workflow_instances(id) ON DELETE SET NULL,
  step_id uuid NOT NULL REFERENCES public.workflow_steps(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requested_by uuid,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending',
  comments text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  plant_id uuid,
  module text NOT NULL,
  sla_type text NOT NULL,
  priority text,
  duration_minutes integer NOT NULL,
  escalation_user_id uuid,
  escalation_role_code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_allow_access_workflow_definitions" ON public.workflow_definitions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_workflow_steps" ON public.workflow_steps
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_workflow_instances" ON public.workflow_instances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_workflow_approvals" ON public.workflow_approvals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_sla_rules" ON public.sla_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);