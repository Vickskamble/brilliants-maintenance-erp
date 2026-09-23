# Backend Development Specification

## Service Boundaries

Keep domain logic modular even if deployed as a single application
initially.

Suggested services/modules: - Auth & Tenant - Master Data - Asset -
Maintenance - Work Orders - Calibration - Inspection - Inventory -
Vendor/Contracts - Shutdown - Reports - Documents - Notifications -
Audit

## Transaction Rule

Business transactions should be created through validated server-side
services/API endpoints.

## Number Generation

Generate human-readable numbers server-side: - EQ-000001 -
WO-2026-000001 - BR-2026-000001 - CAL-2026-000001 - INS-2026-000001

Actual prefixes can be organization-configurable.

## Status Transitions

Each workflow must have an explicit allowed transition map. The UI must
not be the only place enforcing status rules.

## Audit

Record material state changes, approvals, assignment changes and
closure/reopening actions.

## Error Handling

Return consistent errors: - code - message - field errors -
correlation/request id

Never expose database internals or secrets.
