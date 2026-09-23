# Master Coding Prompt — Brilliants Industrial Maintenance ERP

You are a senior full-stack ERP architect and developer.

Build a production-ready Industrial Maintenance ERP for Brilliants using the existing Supabase PostgreSQL schema and RLS architecture.

## Product principle

This is an ERP-style industrial maintenance system.

V1 MUST work completely without IoT, sensors, automation or AI.

The architecture must remain future-ready for those capabilities.

## Existing database

Use the existing migrations:
- 001_initial_schema.sql
- 002_rls_policies.sql

Do not redesign the database unless a concrete incompatibility is found.

## Required modules

1. Authentication
2. Organization/Plant hierarchy
3. Dashboard
4. Equipment/Asset Register
5. Critical Equipment
6. Preventive Maintenance
7. PM Calendar
8. Work Requests
9. Work Orders
10. Breakdown Management
11. Corrective Actions
12. RCA
13. Inspection
14. Calibration
15. Spare Parts
16. Inventory
17. Vendors
18. AMC/Warranty
19. Shutdown/Turnaround
20. Documents
21. Reports
22. Users/Roles/Permissions
23. Approval workflow
24. Notifications
25. Audit log

## Security

- Supabase Auth
- PostgreSQL RLS
- organization isolation
- plant-level scope
- role + permission checks
- private document storage
- no service-role key in frontend
- no authorization decisions based only on UI
- no hardcoded organization_id
- no hardcoded production records

## UX

Professional industrial ERP interface.

Prioritize:
- fast data entry
- clear status
- powerful filters
- responsive tables
- equipment history
- technician usability
- manager dashboards

Do not over-design with unnecessary animations.

## Coding rules

- Reuse existing components.
- Keep modules separated.
- Create reusable table/filter/form components.
- Validate all forms.
- Handle loading, empty, error and permission states.
- Use server-side pagination/filtering.
- Use transactions/RPC for multi-step operations.
- Never silently ignore API/database errors.
- Use typed models/interfaces.
- Keep environment secrets out of source control.

## Development order

1. Auth + layout
2. organization/plant
3. equipment
4. PM
5. work orders
6. breakdown
7. inspection/calibration
8. inventory
9. vendors/contracts
10. shutdown
11. reports
12. admin/audit
13. testing and hardening

## Before coding each module

Provide:
- files to create/change
- DB tables used
- permissions used
- API/service methods
- UI screens
- validation rules
- acceptance criteria

Then implement the module.

Never make unrelated UI or database changes.
