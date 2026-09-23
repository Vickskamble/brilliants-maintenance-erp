-- ============================================================
-- Demo / sample data for the Brilliants Maintenance ERP.
-- Depends on seed.sql having run (org 11111111-..., plant 22222222-...,
-- roles 33333333-...). All inserts are conflict-guarded -> safe to
-- re-run. Uses deterministic UUIDs.
-- ============================================================

-- ---------- asset categories ----------
insert into public.asset_categories (id, organization_id, code, name, status) values
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'PUMP', 'Pumps', 'active'),
  ('00000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'COMP', 'Compressors', 'active'),
  ('00000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'CONV', 'Conveyors', 'active'),
  ('00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'HVAC', 'HVAC Systems', 'active')
on conflict (id) do nothing;

-- ---------- criticality profiles ----------
insert into public.criticality_profiles (id, name, level, safety_score, total_score, description) values
  ('00000000-0000-0000-0000-000000000011', 'Critical', 'critical', 95, 92, 'Unplanned stop halts plant'),
  ('00000000-0000-0000-0000-000000000012', 'Standard', 'normal', 50, 48, 'Failure causes minor downtime')
on conflict (id) do nothing;

-- ---------- departments ----------
insert into public.departments (id, organization_id, plant_id, code, name, department_type, status) values
  ('00000000-0000-0000-0000-000000000021', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'MECH', 'Mechanical', 'maintenance', 'active'),
  ('00000000-0000-0000-0000-000000000022', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'ELEC', 'Electrical', 'maintenance', 'active'),
  ('00000000-0000-0000-0000-000000000023', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'PROD', 'Production', 'production', 'active')
on conflict (id) do nothing;

-- ---------- sections / areas / locations ----------
insert into public.sections (id, organization_id, plant_id, department_id, code, name, status) values
  ('00000000-0000-0000-0000-000000000031', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000021', 'S1', 'Boiler House', 'active'),
  ('00000000-0000-0000-0000-000000000032', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000022', 'S2', 'Switchgear Yard', 'active'),
  ('00000000-0000-0000-0000-000000000033', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000023', 'S3', 'Assembly Line', 'active')
on conflict (id) do nothing;

insert into public.areas (id, organization_id, plant_id, section_id, code, name, status) values
  ('00000000-0000-0000-0000-000000000041', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000031', 'A1', 'Boiler Feed Area', 'active'),
  ('00000000-0000-0000-0000-000000000042', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000033', 'A2', 'Line 1 Zone', 'active')
on conflict (id) do nothing;

insert into public.locations (id, organization_id, plant_id, area_id, code, name) values
  ('00000000-0000-0000-0000-000000000051', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000041', 'L1', 'Bay 1'),
  ('00000000-0000-0000-0000-000000000052', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000041', 'L2', 'Bay 2')
on conflict (id) do nothing;

insert into public.cost_centers (id, organization_id, plant_id, code, name, status) values
  ('00000000-0000-0000-0000-000000000061', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CC-01', 'Maintenance Opex', 'active'),
  ('00000000-0000-0000-0000-000000000062', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'CC-02', 'Utilities', 'active')
on conflict (id) do nothing;

-- ---------- vendors ----------
insert into public.vendors (id, organization_id, vendor_code, name, vendor_type, contact_person, phone, email, status) values
  ('00000000-0000-0000-0000-000000000071', '11111111-1111-1111-1111-111111111111', 'V-0001', 'SKF Bearing Distributors', 'parts', 'R. Shah', '+91 98901 21101', 'sales@skfdist.example', 'active'),
  ('00000000-0000-0000-0000-000000000072', '11111111-1111-1111-1111-111111111111', 'V-0002', 'Lubricants India', 'consumable', 'M. Patil', '+91 98901 21102', 'orders@lubindia.example', 'active'),
  ('00000000-0000-0000-0000-000000000073', '11111111-1111-1111-1111-111111111111', 'V-0003', 'Control Systems Pvt Ltd', 'service', 'S. Iyer', '+91 98901 21103', 'service@controls.example', 'active')
on conflict (id) do nothing;

-- ---------- equipment ----------
insert into public.equipment (
  id, organization_id, plant_id, equipment_code, equipment_name, category_id, department_id,
  section_id, area_id, location_id, cost_center_id, make, model, serial_number,
  installation_date, commissioning_date, criticality_id, status, description
) values
  ('00000000-0000-0000-0000-000000000101', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EQ-PUMP-001', 'Boiler Feed Water Pump', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000061', 'Kirloskar', 'KDS-40/25', 'SN-P-1001', '2023-03-15', '2023-04-01', '00000000-0000-0000-0000-000000000011', 'operational', 'Main water feed pump, 40HP'),
  ('00000000-0000-0000-0000-000000000102', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EQ-PUMP-002', 'Cooling Tower Pumps (2)', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000061', 'Grundfos', 'CRN-32', 'SN-P-1002', '2022-07-01', '2022-07-20', '00000000-0000-0000-0000-000000000011', 'operational', 'Cooling water circulation'),
  ('00000000-0000-0000-0000-000000000103', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EQ-COMP-001', 'Air Compressor - Screw Type', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000062', 'Atlas Copco', 'GA 37 VSD', 'SN-C-2001', '2021-11-10', '2021-12-01', '00000000-0000-0000-0000-000000000011', 'under_maintenance', 'Plant compressed air supply'),
  ('00000000-0000-0000-0000-000000000104', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EQ-CONV-001', 'Main Assembly Conveyor', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000052', '00000000-0000-0000-0000-000000000061', 'Bosch Rexroth', 'TS5-7000', 'SN-V-3001', '2020-05-05', '2020-05-25', '00000000-0000-0000-0000-000000000011', 'operational', 'Line 1 main belt conveyor'),
  ('00000000-0000-0000-0000-000000000105', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EQ-HVAC-001', 'HVAC Air Handling Unit', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000051', '00000000-0000-0000-0000-000000000062', 'Daikin', 'AHU-80', 'SN-H-4001', '2022-01-15', '2022-02-01', '00000000-0000-0000-0000-000000000012', 'operational', 'Central AHU for control room')
on conflict (id) do nothing;

-- ---------- equipment components ----------
insert into public.equipment_components (id, organization_id, equipment_id, component_code, component_name, component_type, serial_number, criticality) values
  ('00000000-0000-0000-0000-000000000201', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000101', 'CMP-101-A', 'Drive End Bearing', 'bearing', 'BR-5511', 'high'),
  ('00000000-0000-0000-0000-000000000202', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000101', 'CMP-101-B', 'Mechanical Seal', 'seal', 'SL-8822', 'high'),
  ('00000000-0000-0000-0000-000000000203', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000103', 'CMP-103-A', 'Air Filter Element', 'filter', 'FL-2201', 'medium'),
  ('00000000-0000-0000-0000-000000000204', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000103', 'CMP-103-B', 'Oil Separator Cartridge', 'cartridge', 'CS-3302', 'high')
on conflict (id) do nothing;

-- ---------- maintenance plans ----------
insert into public.maintenance_plans (id, organization_id, plant_id, equipment_id, plan_code, name, maintenance_type, frequency_type, frequency_value, priority, status) values
  ('00000000-0000-0000-0000-000000000301', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000101', 'PM-PUMP-001', 'Monthly Pump PM', 'preventive', 'monthly', 1, 'high', 'active'),
  ('00000000-0000-0000-0000-000000000302', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000103', 'PM-COMP-001', 'Compressor Quarterly Service', 'preventive', 'monthly', 3, 'high', 'active'),
  ('00000000-0000-0000-0000-000000000303', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000104', 'PM-CONV-001', 'Conveyor Lubrication', 'lubrication', 'weekly', 1, 'medium', 'active')
on conflict (id) do nothing;

-- ---------- maintenance schedules ----------
insert into public.maintenance_schedules (id, schedule_no, equipment_id, task_type, frequency, interval_days, last_run_at, next_run_at, assigned_to, is_active, notes) values
  ('00000000-0000-0000-0000-000000000401', 'CAL-2026-01', '00000000-0000-0000-0000-000000000101', 'calibration', 'quarterly', 90, now() - interval '60 days', now() + interval '30 days', 'admin@brilliants.in', true, 'Pressure gauge calibration'),
  ('00000000-0000-0000-0000-000000000402', 'CAL-2026-02', '00000000-0000-0000-0000-000000000103', 'calibration', 'quarterly', 90, now() - interval '95 days', now() - interval '5 days', 'admin@brilliants.in', true, 'Safety valve calibration OVERDUE'),
  ('00000000-0000-0000-0000-000000000403', 'PM-2026-03', '00000000-0000-0000-0000-000000000104', 'preventive', 'weekly', 7, now() - interval '10 days', now() - interval '3 days', 'admin@brilliants.in', true, 'Weekly conveyor lubrication'),
  ('00000000-0000-0000-0000-000000000404', 'PM-2026-04', '00000000-0000-0000-0000-000000000105', 'inspection', 'monthly', 30, now() - interval '20 days', now() + interval '10 days', 'admin@brilliants.in', true, 'AHU filter check')
on conflict (id) do nothing;

-- ---------- work orders ----------
insert into public.work_orders (
  id, organization_id, plant_id, work_order_no, equipment_id, assigned_to, type, priority, status,
  title, description, planned_start, planned_end, actual_start, actual_end, closure_remarks
) values
  ('00000000-0000-0000-0000-000000000501', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'WO-2026-001', '00000000-0000-0000-0000-000000000101', 'admin@brilliants.in', 'preventive', 'high', 'completed', 'Replace drive-end bearing of feed pump', 'Routine PM - bearing replacement per PM-PUMP-001', now() - interval '20 days', now() - interval '18 days', now() - interval '20 days', now() - interval '19 days', 'Bearing replaced, vibration normal'),
  ('00000000-0000-0000-0000-000000000502', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'WO-2026-002', '00000000-0000-0000-0000-000000000103', 'admin@brilliants.in', 'corrective', 'high', 'in_progress', 'Compressor oil separator renewal', 'Oil carry-over reported, planned during next window', now() - interval '2 days', now() + interval '1 day', now() - interval '1 day', null, null),
  ('00000000-0000-0000-0000-000000000503', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'WO-2026-003', '00000000-0000-0000-0000-000000000104', 'admin@brilliants.in', 'preventive', 'medium', 'scheduled', 'Weekly conveyor lubrication', 'Grease conveyor bearings and inspect belt', now() + interval '3 days', now() + interval '3 days', null, null, null),
  ('00000000-0000-0000-0000-000000000504', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'WO-2026-004', '00000000-0000-0000-0000-000000000105', 'admin@brilliants.in', 'shutdown', 'emergency', 'draft', 'AHU shutdown for coil cleaning', 'Annual shutdown scope - clean cooling coil and replace filters', now() + interval '15 days', now() + interval '17 days', null, null, null),
  ('00000000-0000-0000-0000-000000000505', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'WO-2026-005', '00000000-0000-0000-0000-000000000102', 'admin@brilliants.in', 'breakdown', 'high', 'cancelled', 'Cooling pump coupling alignment check', 'Cancelled after operations rescheduled', now() - interval '30 days', now() - interval '29 days', null, null, 'Rescheduled to next quarter')
on conflict (id) do nothing;

-- ---------- work order status history + activities (WO-2026-002) ----------
insert into public.work_order_status_history (id, work_order_id, old_status, new_status, remarks) values
  ('00000000-0000-0000-0000-000000000701', '00000000-0000-0000-0000-000000000502', 'draft', 'scheduled', 'Planned during window'),
  ('00000000-0000-0000-0000-000000000702', '00000000-0000-0000-0000-000000000502', 'scheduled', 'in_progress', 'Work started')
on conflict (id) do nothing;

insert into public.work_order_activities (id, work_order_id, activity_type, description, started_at, created_by) values
  ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000502', 'diagnosis', 'De-oiled compressor, confirmed separator clogged', now() - interval '1 day', 'bc939a99-cd93-4d17-932c-da5cab43c1ce'),
  ('00000000-0000-0000-0000-000000000602', '00000000-0000-0000-0000-000000000502', 'replacement', 'Replaced oil separator cartridge', now() - interval '20 hours', 'bc939a99-cd93-4d17-932c-da5cab43c1ce')
on conflict (id) do nothing;

-- ---------- breakdowns ----------
insert into public.breakdowns (
  id, organization_id, plant_id, breakdown_no, equipment_id, reported_by, reported_at, breakdown_start, restored_at,
  problem_description, root_cause, action_taken, severity, downtime_minutes, status, created_by
) values
  ('00000000-0000-0000-0000-000000000801', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'BD-2026-001', '00000000-0000-0000-0000-000000000103', 'production', now() - interval '2 days', now() - interval '2 days', null, 'Compressor tripping on high temp', 'Blocked oil separator causing bypass', 'Renew separator; monitoring', 'critical', 210, 'in_progress', 'admin'),
  ('00000000-0000-0000-0000-000000000802', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'BD-2026-002', '00000000-0000-0000-0000-000000000105', 'production', now() - interval '12 days', now() - interval '12 days', now() - interval '11 days', 'AHU noise and vibration', 'Loose fan pulley belt', 'Tensioned belt and aligned pulley', 'medium', 90, 'resolved', 'admin')
on conflict (id) do nothing;

-- ---------- inspections ----------
insert into public.inspections (id, organization_id, plant_id, inspection_no, equipment_id, inspector_id, scheduled_date, performed_at, status, overall_result, remarks) values
  ('00000000-0000-0000-0000-000000000901', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'INS-2026-001', '00000000-0000-0000-0000-000000000101', 'bc939a99-cd93-4d17-932c-da5cab43c1ce', now() - interval '5 days', now() - interval '4 days', 'completed', 'pass', 'No leakage; seal replaced'),
  ('00000000-0000-0000-0000-000000000902', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'INS-2026-002', '00000000-0000-0000-0000-000000000104', 'bc939a99-cd93-4d17-932c-da5cab43c1ce', now() + interval '6 days', null, 'scheduled', null, null)
on conflict (id) do nothing;

-- ---------- spare parts ----------
insert into public.spare_parts (id, part_code, part_name, category, unit, current_stock, min_stock, reorder_level, location, plant_id) values
  ('00000000-0000-0000-0000-000000000a01', 'SP-0001', 'Drive End Bearing 60x110', 'spare_part', 'pcs', 4, 2, 5, 'Store Rack A1', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000a02', 'SP-0002', 'Mechanical Seal 40mm', 'spare_part', 'pcs', 1, 2, 3, 'Store Rack A2', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000a03', 'SP-0003', 'Compressor Oil Separator Cartridge', 'consumable', 'pcs', 8, 2, 4, 'Store Rack B1', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000a04', 'SP-0004', 'Air Filter Element', 'consumable', 'pcs', 12, 4, 6, 'Store Rack B2', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000a05', 'SP-0005', 'HT Grease (25kg)', 'lubricant', 'drum', 2, 1, 2, 'Store Rack C1', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- per-plant stock views + detail stock
insert into public.spare_part_plants (id, part_id, plant_id, quantity, location) values
  ('00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a01', '22222222-2222-2222-2222-222222222222', 4, 'Store Rack A1'),
  ('00000000-0000-0000-0000-000000000b02', '00000000-0000-0000-0000-000000000a02', '22222222-2222-2222-2222-222222222222', 1, 'Store Rack A2'),
  ('00000000-0000-0000-0000-000000000b03', '00000000-0000-0000-0000-000000000a03', '22222222-2222-2222-2222-222222222222', 8, 'Store Rack B1'),
  ('00000000-0000-0000-0000-000000000b04', '00000000-0000-0000-0000-000000000a04', '22222222-2222-2222-2222-222222222222', 12, 'Store Rack B2'),
  ('00000000-0000-0000-0000-000000000b05', '00000000-0000-0000-0000-000000000a05', '22222222-2222-2222-2222-222222222222', 2, 'Store Rack C1')
on conflict (id) do nothing;

insert into public.spare_part_stock (id, spare_part_id, plant_id, quantity) values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-000000000a01', '22222222-2222-2222-2222-222222222222', 4),
  ('00000000-0000-0000-0000-000000000c02', '00000000-0000-0000-0000-000000000a02', '22222222-2222-2222-2222-222222222222', 1),
  ('00000000-0000-0000-0000-000000000c03', '00000000-0000-0000-0000-000000000a03', '22222222-2222-2222-2222-222222222222', 8),
  ('00000000-0000-0000-0000-000000000c04', '00000000-0000-0000-0000-000000000a04', '22222222-2222-2222-2222-222222222222', 12),
  ('00000000-0000-0000-0000-000000000c05', '00000000-0000-0000-0000-000000000a05', '22222222-2222-2222-2222-222222222222', 2)
on conflict (id) do nothing;

-- components / bill of materials for spare-parts service
insert into public.spare_part_components (id, spare_part_id, part_code, part_name, quantity) values
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-000000000a01', 'CMP-101-A', 'Drive End Bearing', 1),
  ('00000000-0000-0000-0000-000000000d02', '00000000-0000-0000-0000-000000000a02', 'CMP-101-B', 'Mechanical Seal', 1)
on conflict (id) do nothing;

-- stock movement ledger (feeds the sync trigger -> spare_part_plants/stock)
insert into public.stock_movements (id, part_id, movement_type, quantity, from_plant_id, to_plant_id, reference_no, note, created_by, plant_id) values
  ('00000000-0000-0000-0000-000000000e01', '00000000-0000-0000-0000-000000000a03', 'purchase_in', 10, null, '22222222-2222-2222-2222-222222222222', 'GRN-2026-011', 'Bulk purchase from Lubricants India', 'bc939a99-cd93-4d17-932c-da5cab43c1ce', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000e02', '00000000-0000-0000-0000-000000000a01', 'workorder_issue', 2, '22222222-2222-2222-2222-222222222222', null, 'WO-2026-001', 'Issued for feed pump bearing PM', 'bc939a99-cd93-4d17-932c-da5cab43c1ce', '22222222-2222-2222-2222-222222222222'),
  ('00000000-0000-0000-0000-000000000e03', '00000000-0000-0000-0000-000000000a05', 'adjustment', 1, null, '22222222-2222-2222-2222-222222222222', 'ADJ-2026-003', 'Cycle count correction', 'bc939a99-cd93-4d17-932c-da5cab43c1ce', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;