# Supabase RLS & Security Policy

## Core Rule

No authenticated user may read or modify another organization's data.

## Tenant Scope

Every tenant table must be protected using: 1. authenticated user
identity 2. membership/profile relationship 3. organization_id 4. plant
scope where applicable 5. role permission where applicable

## Recommended Membership Model

Use `profiles.organization_id` as the primary tenant relationship. If a
user can belong to multiple organizations later, introduce
`organization_memberships`.

## Policy Layers

### Read

User can read a record only if: - user is authenticated -
record.organization_id = user's organization_id - plant scope is
permitted

### Insert

-   organization_id must be assigned server-side where possible.
-   Never trust organization_id supplied by the browser.

### Update

-   Same tenant check.
-   Role must have update permission.
-   Closed transactional records require controlled reopen permission.

### Delete

Avoid physical delete for: - work orders - breakdowns - calibration
records - stock transactions - audit logs - maintenance history

Use archive/status.

## Service Role

Service-role keys must never be exposed to the browser.

## Storage

All technical documents must use private buckets. Access through
authorized signed URLs.

## API

RLS is not a substitute for application authorization. Both database
policies and application-level permissions must be enforced.
