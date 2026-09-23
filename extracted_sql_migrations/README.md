# SQL Migration Package

## File
`001_initial_schema.sql`

## Target
Supabase PostgreSQL.

## Before Running
1. Create a dedicated Supabase project.
2. Review table names against the final application code.
3. Review RLS policies before production use.
4. Take a database backup before applying to an existing project.
5. Do not run this blindly on an existing production database containing conflicting tables.

## Important
The migration creates the core schema, indexes, enums, timestamps, RLS enablement and system permission definitions.

It intentionally does **not** install permissive production RLS policies. Tenant membership and role authorization must be finalized and then policies added.

## Next Migration
Create `002_rls_policies.sql` after the exact membership/role model is confirmed.
