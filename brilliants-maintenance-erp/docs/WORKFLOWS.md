# Brilliants Maintenance ERP — End-to-End Workflows

## Generic page flows (repeated across modules)

**List** → search box (debounced via `useDebouncedValue`, 400 ms) + filter `Select`s +
per-page `DataTable` (row click → detail) + `Pagination` (page size 10) + `PageHeader` action
("Add X" / "New X" link).

**New** → form (zod or manual validation) → service `create…` → on success push to detail page.

**Detail** → `get…` single + joined references rendered via `MetadataRow`/status badges →
header links (Edit, Status, Back) + bottom action buttons.

**Edit** → prefill the record, `update…` on save, navigate back.

**Status change** → dedicated page or inline `Select` → `update…` with the new status.

## Shared data relationships

- `equipment` is the hub: referenced by `maintenance_schedules.equipment_id`,
  `breakdowns.equipment_id`, `inspections.equipment_id`, `work_orders.equipment_id`, and
  (optionally) by the equipment detail's full hierarchy (departments → sections → areas →
  locations, cost centers, parent equipment, supplier vendor).
- `plants` scopes most operational records (`plant_id` on equipment, work orders, breakdowns,
  inspections, schedules, spare parts, stock movements) and is the tenant context in the header.
- `vendors.supplier_vendor_id` links equipment to a supplier; vendors are master data only.
- `spare_parts` drives inventory; movements live on `stock_movements` and update
  `spare_parts.current_stock` and per-plant stock via triggers (see [DATABASE](DATABASE.md)).
- `organizations` → `profiles.organization_id` → `plants` → active plant selection (header),
  loaded once in `AuthProvider`.

## Module workflows

### Dashboard

1. On mount, `ERPLayout` guards the session; the dashboard fires ~13 Supabase queries in
   parallel buildTrend/promises.
2. Renders KPI cards, a 6-month breakdown trend, and the next 5 upcoming PM schedules.
3. KPI definitions (all in `src/app/dashboard/page.tsx`):
   - total machines = `equipment` count
   - critical = `equipment` join `criticality_profiles!inner` where `level = 'critical'`
   - open work orders = `work_orders` where `status` not in `(completed, closed, cancelled)`
   - breakdowns this month = `breakdowns` where `reported_at` in current month
   - PM compliance = on-track schedules / total active schedules
   - PM due today = `maintenance_schedules` where `next_run_at` is today
   - PM overdue = `next_run_at < now`
   - calibration due ≤30 days = `maintenance_schedules` where `task_type = 'calibration'`
     and `next_run_at <= now + 30d`
   - low stock = `spare_parts` where `current_stock > 0` and `current_stock <= reorder_level`
   - maintenance trend = monthly breakdown counts for the last 6 months

### Equipment

- **Create** (`/equipment/new`): zod `equipmentSchema`; required `equipment_code`,
  `equipment_name`, `plant_id`; optional category/criticality/financial/dates; payload carries
  `description` when populated. Success → `/equipment/[id]`.
- **Detail** (`/equipment/[id]`): default tab **Overview**; **Components** tab lists
  `equipment_components` and supports add/delete (`addEquipmentComponent` uses `window.prompt`
  for the name — worth replacing with a Dialog, see [KNOWN-GAPS](KNOWN-GAPS.md));
  **Maintenance** shows linked schedules; **History** shows `equipment_status_history`
  (read-only). Work Orders/Breakdowns/Inspections/Calibration/Spares/Documents/Cost tabs are
  empty placeholders. Header Edit is a dead link (route missing).
- **Status** changes are recorded in `equipment_status_history` by the
  `changeEquipmentStatus` service (`equipment` update + history insert) — the UI reads this
  history on the History tab but has no status-change control on the page itself.

### Work Orders

- **Create** (`/work-orders/new`): zod `workOrderSchema` (refines `planned_end >= planned_start`);
  `work_order_no` + `plant_id` + `title` required; type/priority/status from constants.
- **Detail** (`/work-orders/[id]`): overview only today — tabs Activities/Spares/History render
  nothing (see [KNOWN-GAPS](KNOWN-GAPS.md)).
- **Edit** (`/work-orders/[id]/edit`): updates title/type/priority/dates/description.
- **Status** (`/work-orders/[id]/status`): pick from `WORK_ORDER_STATUSES`; on save the page
  updates `work_orders.status` + `status_changed_at`.
- Service-level extras exist but are not wired to pages: `changeWorkOrderStatus` (inserts into
  `work_order_statuses`), `getWorkOrderStatusHistory` (reads `work_order_status_history`),
  `getWorkOrderActivities` / `addWorkOrderActivity` / `deleteWorkOrderActivity`
  (`work_order_activities`).

### Maintenance schedules

- **Create** (`/maintenance/new`): manual validation; `schedule_no` auto-generated
  (`MAINT-{seq}` via a count query); fields equipment, task_type, frequency, interval_days,
  last/next run, assigned_to, `is_active` checkbox, notes.
- **Detail** (`/maintenance/[id]`): toggle **Pause/Resume** (`is_active`) and **Delete**.

### Breakdowns

- **Create** (`/breakdowns/new`): reuses the shared `BreakdownForm`
  (`src/lib/validation/breakdowns.tsx`) — react-hook-form + `breakdownSchema`; report basics
  (report_no, category, title, plant, equipment, reported_at, downtime_minutes, description)
  plus Diagnosis/Repair fields (root_cause, action_taken, resolution_notes) shown when editing
  a record past `reported` status.
- **Detail** (`/breakdowns/[id]`): status `Select` (constants `BREAKDOWN_STATUSES`); marking
  `restored` also sets `resolved_at`; **Delete** available.

### Inspections

- **Create** (`/inspections/new`): manual validation; `inspection_no` auto-generated
  (`INSP-{seq}`); status always defaults to `scheduled`.
- **Detail** (`/inspections/[id]`): **Mark Completed** (`status='completed'` sets
  `performed_at`), overall result `Select` (pass/fail/conditional/observation), **Delete**.

### Spare parts & inventory

- **Create** (`/spare-parts/new`): zod `sparePartSchema` (refines `reorder_level >= min_stock`);
  `initial_quantity` is mapped to `current_stock` on insert.
- **Detail** (`/spare-parts/[id]`): per-plant stock from the embedded relation
  `spare_part_stock`; **Record Movement**, **Edit**, **Delete**.
- **Record movement** (`/spare-parts/[id]/stock`): zod `stockMovementSchema`; selects a
  `movement_type` from `STOCK_MOVEMENT_TYPES` and quantity (+/- direction inferred by
  `includes("in")`); inserts into `stock_movements` and updates `spare_parts.current_stock`.
  The `plants` dropdown is loaded but **not submitted** with the movement (plant attribution
  only lands via the triggers from `to/from_plant_id`).
- **List** (`/spare-parts`): filters low stock (`current_stock > 0 AND current_stock <=
  reorder_level`) and out of stock (`current_stock = 0`).
- **Inventory** (`/inventory`): spare-parts table + last 8 `stock_movements` with part names;
  link to `/spare-parts`.

### Vendors

- **Create** (`/vendors/new`): manual validation; auto-generated `vendor_code` style not used —
  the form accepts `vendor_code` + `vendor_type` + mandatory `name`; status defaults `active`.
- **Detail** (`/vendors/[id]`): status `Select` + **Delete**.

### Settings

- All four settings screens are read-only: users (`profiles`), roles (+ permission counts from
  `role_permissions`/`permissions`), plants, permissions (grouped by module via
  `groupPermissionsByModule`). The three "Add X" buttons are inert (see
  [KNOWN-GAPS](KNOWN-GAPS.md)).

## Money / dates displayed

- Dates & date-times: `en-IN` locale (`formatDate`, `formatDateTime`).
- Costs: INR, no decimals (`formatCurrency`), e.g. equipment `purchase_cost`.
- Relative time: `timeAgo`.
- Generated codes use prefixes from `src/types/common.ts`
  (`NUMBER_PREFIXES`: `EQ`, `PM`, `WO`, `BRK`, `CAL`, `INS`, `STO`, `SD`, `WR`).

See [MODULES](MODULES.md) for the route table and [KNOWN-GAPS](KNOWN-GAPS.md) for partial flows.