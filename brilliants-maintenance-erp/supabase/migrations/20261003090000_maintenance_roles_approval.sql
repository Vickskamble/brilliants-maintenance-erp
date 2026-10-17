-- Maintenance ERP: role-based approvals
-- Converts the generic ENGINEER role into MAINTENANCE_OFFICER and adds
-- MAINTENANCE_MANAGER (department head / plant manager who approves every
-- workflow and can manage users + roles) and TECHNICIAN (kiosk execution).
--
-- Approval gating stays permission-based (workflow_steps.approval_role_code
-- remains NULL): only roles holding `<module>.approve` may approve. After this
-- migration only ADMIN, SYSTEM_ADMIN and MAINTENANCE_MANAGER can approve
-- work orders and inventory (MR/PO) flows; OFFICER and TECHNICIAN can only
-- submit. Admin is made org-wide (no plant binding).

-- 1) Rename ENGINEER -> MAINTENANCE_OFFICER (keeps role id + user assignments)
update public.roles
set code = 'MAINTENANCE_OFFICER',
    name = 'Maintenance Officer',
    description = 'Maintenance engineer/officer: creates and edits work orders, breakdowns, PM schedules and inventory requests; submits for approval. Cannot approve.',
    updated_at = now()
where code = 'ENGINEER';

-- 2) New roles
insert into public.roles (id, organization_id, code, name, description, system_role)
values
  ('33333333-3333-3333-3333-333333333337', '11111111-1111-1111-1111-111111111111', 'MAINTENANCE_MANAGER', 'Maintenance Manager', 'Department head / plant manager: approves all maintenance, breakdown, PM and inventory workflows; can create users and assign roles for the plant.', false),
  ('33333333-3333-3333-3333-333333333338', '11111111-1111-1111-1111-111111111111', 'TECHNICIAN', 'Technician', 'Shop-floor technician: raises work orders and breakdowns and completes PM via the kiosk; submits for approval.', false)
on conflict (id) do nothing;

-- 3) Reset MAINTENANCE_OFFICER grants then assign officer matrix (no approve/reject)
delete from public.role_permissions rp
using public.roles r
where rp.role_id = r.id and r.code = 'MAINTENANCE_OFFICER';

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'MAINTENANCE_OFFICER'
  and (p.module, p.action) in (
    ('work_order','view'), ('work_order','create'), ('work_order','edit'), ('work_order','close'),
    ('breakdown','view'), ('breakdown','create'), ('breakdown','edit'), ('breakdown','close'),
    ('maintenance','view'), ('maintenance','create'), ('maintenance','edit'),
    ('inventory','view'), ('inventory','create'), ('inventory','edit'),
    ('equipment','view'), ('equipment','create'), ('equipment','edit'),
    ('inspection','view'), ('inspection','create'), ('inspection','edit'),
    ('calibration','view'), ('calibration','create'), ('calibration','edit'),
    ('shutdown','view'), ('shutdown','create'), ('shutdown','edit'),
    ('vendor','view'), ('vendor','create'), ('vendor','edit'),
    ('reports','view'), ('dashboard','view'),
    ('approval','view')
  )
on conflict (role_id, permission_id) do nothing;

-- 4) MAINTENANCE_MANAGER: full maintenance + approvals + user/role management
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'MAINTENANCE_MANAGER'
  and (p.module, p.action) in (
    ('work_order','view'), ('work_order','create'), ('work_order','edit'), ('work_order','delete'), ('work_order','close'), ('work_order','approve'), ('work_order','reject'),
    ('breakdown','view'), ('breakdown','create'), ('breakdown','edit'), ('breakdown','delete'), ('breakdown','close'),
    ('maintenance','view'), ('maintenance','create'), ('maintenance','edit'), ('maintenance','delete'),
    ('inventory','view'), ('inventory','create'), ('inventory','edit'), ('inventory','delete'), ('inventory','approve'), ('inventory','reject'),
    ('equipment','view'), ('equipment','create'), ('equipment','edit'), ('equipment','delete'),
    ('inspection','view'), ('inspection','create'), ('inspection','edit'), ('inspection','delete'),
    ('calibration','view'), ('calibration','create'), ('calibration','edit'),
    ('shutdown','view'), ('shutdown','create'), ('shutdown','edit'),
    ('vendor','view'), ('vendor','create'), ('vendor','edit'), ('vendor','delete'),
    ('reports','view'), ('dashboard','view'), ('dashboard','create'),
    ('approval','view'), ('approval','approve'), ('approval','reject'),
    ('settings','view'), ('settings','create'), ('settings','edit'), ('settings','delete'),
    ('organization','view'), ('organization','edit')
  )
on conflict (role_id, permission_id) do nothing;

-- 5) TECHNICIAN: kiosk execution (submit only)
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.code = 'TECHNICIAN'
  and (p.module, p.action) in (
    ('work_order','view'), ('work_order','create'), ('work_order','edit'),
    ('breakdown','view'), ('breakdown','create'),
    ('maintenance','view'), ('maintenance','create'), ('maintenance','edit'),
    ('inventory','view'),
    ('equipment','view'),
    ('reports','view'), ('dashboard','view'),
    ('approval','view')
  )
on conflict (role_id, permission_id) do nothing;

-- 6) Notify the maintenance manager on pending WO / inventory approvals.
update public.workflow_steps s
set notify_role_codes = array['MAINTENANCE_MANAGER']
from public.workflow_definitions d
where d.id = s.workflow_definition_id
  and d.module in ('work_order', 'inventory')
  and s.require_approval = true;

-- 7) Admin (company superadmin) is org-wide: not bound to any single plant.
update public.profiles
set plant_id = null
where email = 'admin@brilliants.in';

update public.user_roles
set plant_id = null
where user_id in (select id from public.profiles where email = 'admin@brilliants.in');
