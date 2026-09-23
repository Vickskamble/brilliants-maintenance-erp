-- Additive master-data seed: restore the three departments referenced by existing
-- sections/equipment so their names resolve again. Safe re-runnable.
INSERT INTO public.departments (id, organization_id, plant_id, code, name, department_type, status)
VALUES
  ('00000000-0000-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'MECH', 'Mechanical', 'mechanical', 'active'),
  ('00000000-0000-0000-0000-000000000022', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'ELEC', 'Electrical', 'electrical', 'active'),
  ('00000000-0000-0000-0000-000000000023', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'PROD', 'Production', 'production', 'active')
ON CONFLICT (id) DO NOTHING;