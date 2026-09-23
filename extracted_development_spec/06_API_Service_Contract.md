# API / Service Contract

## Authentication

`GET current-user`

Returns:
- user
- organization
- plant scope
- roles
- permissions

## Dashboard

`GET dashboard/summary`
`GET dashboard/pm`
`GET dashboard/work-orders`
`GET dashboard/breakdowns`
`GET dashboard/inventory`
`GET dashboard/calibration`

All queries must respect RLS.

## Equipment

`GET equipment`
`GET equipment/:id`
`POST equipment`
`PATCH equipment/:id`
`POST equipment/:id/status`
`GET equipment/:id/history`
`GET equipment/:id/work-orders`
`GET equipment/:id/breakdowns`
`GET equipment/:id/documents`

## Preventive Maintenance

`GET pm/plans`
`POST pm/plans`
`PATCH pm/plans/:id`
`GET pm/schedules`
`GET pm/due`
`GET pm/overdue`
`POST pm/generate-work-orders`

## Work Orders

`GET work-orders`
`GET work-orders/:id`
`POST work-orders`
`POST work-orders/:id/submit`
`POST work-orders/:id/approve`
`POST work-orders/:id/assign`
`POST work-orders/:id/start`
`POST work-orders/:id/hold`
`POST work-orders/:id/complete`
`POST work-orders/:id/verify`
`POST work-orders/:id/close`

## Breakdown

`GET breakdowns`
`POST breakdowns`
`POST breakdowns/:id/diagnose`
`POST breakdowns/:id/restore`
`POST breakdowns/:id/close`
`POST breakdowns/:id/rca`

## Inspection

`GET inspection-templates`
`POST inspection-templates`
`GET inspections`
`POST inspections`
`POST inspections/:id/complete`

## Calibration

`GET instruments`
`POST instruments`
`GET calibration/due`
`POST calibration-records`
`POST calibration-records/:id/complete`

## Inventory

`GET spare-parts`
`GET stock`
`POST stock/issue`
`POST stock/return`
`POST stock/transfer`
`POST stock/adjust`
`GET stock/ledger`

## Reports

`GET reports/asset-register`
`GET reports/pm-compliance`
`GET reports/breakdown`
`GET reports/downtime`
`GET reports/mtbf`
`GET reports/mttr`
`GET reports/maintenance-cost`
`GET reports/calibration`
`GET reports/inventory`
`GET reports/technician-workload`

## API design rules

- Pagination on all list endpoints.
- Server-side filtering/sorting.
- Date range filters use ISO dates.
- IDs are UUIDs.
- Numbers are human-readable transaction numbers.
- Never accept organization_id from a normal client as an authorization decision.
- Use RLS for data access.
- Use RPC/Edge Functions for multi-step atomic transactions.
