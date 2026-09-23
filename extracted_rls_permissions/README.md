# Brilliants Industrial Maintenance ERP — RLS & Permission Package

Files:
- `002_rls_policies.sql` — Supabase RLS policies, permission helper functions and plant-scope enforcement.
- `03_Permission_Engine_and_Role_Model.md` — role/permission architecture and status rules.
- `04_Application_Module_Map.md` — complete V1 application module structure.

## Apply order

1. Run `001_initial_schema.sql`.
2. Review and run `002_rls_policies.sql` in a staging Supabase project.
3. Seed organization, plant, roles and permissions.
4. Create a test user for each role.
5. Test two organizations to confirm tenant isolation.
6. Test two plants to confirm plant-level scope.
7. Test CRUD permissions for every major module.
8. Only then connect the production frontend.

## Critical testing matrix

Test:
- User A from Organization A cannot read Organization B.
- Plant A user cannot read Plant B data.
- Organization-wide manager can access permitted plants.
- Viewer cannot create/update transactions.
- Technician sees assigned/authorized work.
- Store user cannot edit equipment masters unless explicitly granted.
- Audit logs cannot be casually deleted.
- Notifications are private to their recipient.

## Important note

The migration is intentionally conservative around authorization. UI visibility is not security. Every sensitive operation must still be protected by PostgreSQL RLS and, where appropriate, server-side RPC/service functions.

Before production, validate all table names/columns against the exact `001_initial_schema.sql` currently deployed.
