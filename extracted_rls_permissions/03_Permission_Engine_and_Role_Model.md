# Permission Engine & Role Model

## Recommended role hierarchy

### Organization-level roles
- Super Admin: full organization control
- Organization Admin: users, masters, settings, reports
- Maintenance Manager: maintenance planning, approvals, KPIs
- Maintenance Engineer: PM, WO, breakdown, RCA, inspections
- Maintenance Technician: assigned work, readings, completion
- Store Manager: spares, stock, issues/returns
- Store Operator: stock transactions
- Calibration Officer: instruments and calibration
- Auditor/Viewer: read-only and audit/report access

### Plant-level scope

A role assignment can be:
- `plant_id = NULL`: organization-wide scope
- `plant_id = <UUID>`: restricted to one plant

This allows the same user to be a Maintenance Manager for Plant A while another role can be assigned at organization scope.

## Permission format

Permissions are stored as:

`module + action`

Examples:
- `equipment + view`
- `equipment + create`
- `equipment + edit`
- `maintenance + manage`
- `work_order + execute`
- `work_order + verify`
- `calibration + manage`
- `inventory + issue`
- `reports + view`
- `audit + view`

## Important security rule

The browser must never be trusted to decide:
- organization_id
- plant scope
- role
- permission

The database/RLS layer must enforce these values.

## Role assignment uniqueness

PostgreSQL treats NULL values as distinct in ordinary unique constraints. Therefore the role assignment should use a unique expression:

```sql
create unique index uq_user_roles_user_role_plant
on public.user_roles (
  user_id,
  role_id,
  coalesce(plant_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
```

## Permission check flow

1. `auth.uid()` identifies the signed-in user.
2. `profiles` resolves organization membership.
3. `user_roles` resolves assigned roles and plant scope.
4. `roles` resolves role definitions.
5. `role_permissions` resolves granted permissions.
6. RLS policy checks the requested organization and plant.
7. The application UI may hide unavailable actions, but database RLS remains the final enforcement layer.

## Status transitions

Recommended server-side transition rules:

### Work Order
Draft -> Submitted -> Approved -> Planned -> Assigned -> In Progress -> Completed -> Verified -> Closed

Alternative:
- In Progress -> On Hold -> In Progress
- Draft/Submitted/Approved -> Cancelled where authorized

### Breakdown
Reported -> Diagnosing -> Repairing -> Restored -> Closed

### Calibration
Scheduled -> In Progress -> Completed
Result:
- Pass
- Fail
- Conditional
- Not Applicable

### Inspection
Scheduled -> In Progress -> Completed
Result:
- Pass
- Fail
- Observation
- Not Applicable

## V1 design principle

The ERP should work completely without IoT or automation.

It should capture:
- manual readings
- condition observations
- inspection results
- breakdown history
- maintenance history
- labor
- parts
- downtime
- cost
- calibration history

This historical data becomes the foundation for future predictive analytics/IoT integrations.
