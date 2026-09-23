# Brilliants Maintenance ERP — Database Reference

## Migrations

| File | Scope |
|---|---|
| `supabase/migrations/20260921100000_spare_parts.sql` | Inventory module: `spare_parts`, `spare_part_plants`, `stock_movements`, sync triggers, `set_updated_at` trigger function |
| `supabase/migrations/20260923100000_app_schema.sql` | App-first schema: everything else the app queries (identity/RBAC, asset master, equipment, work management, inspections, inventory complements, per-plant stock, indexes, extended sync trigger) |

Both are idempotent (`create table if not exists`, `add column if not exists`) and safe to run
in any order. Apply with `npx supabase db push` (or paste into the Supabase SQL editor).
No seed data ships — the app needs an `organizations` row, at least one `plants` row, and a
`profiles` row for each auth user before it shows data.

## Design decisions

- **App-first** (approved direction): tables/columns mirror what `src/` actually reads/writes —
  they intentionally diverge from the official spec (`extracted_sql_migrations/001_initial_schema.sql`,
  which uses `spare_stocks`/`stock_transactions`, requires `template_id` on inspections, and makes
  `organization_id` mandatory everywhere).
- **RLS is OFF.** Pages query without org/tenant filters; a strict org-scoped RLS policy would
  hide all data. Safe for a single-organization deployment. Enable RLS only if multi-tenant
  access is introduced (the official RLS policies are stored under `extracted_sql_migrations/`).
- Status/type columns are `text` with app-side vocabularies (`src/lib/constants`) — no strict
  DB enum checks, so the app is never rejected for a value it sends.
- `updated_at` defaults to `now()` everywhere but is only auto-refreshed by triggers on
  `spare_parts` (see below).

## Table reference

### Identity, tenant & authentication

**`organizations`** — root tenant.
`id uuid PK`, `legal_name text NN`, `display_name text NN`, `code text NN`, `industry text`,
`timezone text NN default 'UTC'`, `country/state/city/address text`, `contact_email`,
`contact_phone`, `status text NN default 'active'`, `created_at`, `updated_at`.

**`plants`** — site/tenant child.
`id PK`, `organization_id FK→organizations`, `code text NN`, `name text NN`, `address`,
`timezone`, `status text NN default 'active'`, `created_at`, `updated_at`.

**`profiles`** — mirrors Supabase auth users.
`id uuid PK FK→auth.users ON DELETE CASCADE`, `organization_id FK→organizations`,
`employee_code`, `name text NN`, `email`, `phone`, `department_id uuid` (no FK today),
`plant_id FK→plants`, `status text NN default 'active'`, `created_at`, `updated_at`.

### RBAC

**`roles`** — `id PK`, `organization_id FK`, `code text NN`, `name text NN`, `description`,
`system_role bool NN default false`, `created_at`, `updated_at`.

**`permissions`** — `id PK`, `module text NN`, `action text NN`, `description`,
`unique(module, action)`.

**`user_roles`** — `user_id FK→auth.users ON DELETE CASCADE`, `role_id FK→roles ON DELETE
CASCADE`, `plant_id FK→plants`, `PK(user_id, role_id)`.

**`role_permissions`** — `role_id FK`, `permission_id FK`, `PK(role_id, permission_id)`.

### Asset master data

**`asset_categories`** — `id PK`, `organization_id FK`, `parent_id FK→asset_categories`,
`code`, `name NN`, `description`, `status NN default 'active'`.

**`criticality_profiles`** — `id PK`, `organization_id FK`, `code`, `name NN`,
`level text NN default 'normal'` (critical|major|normal), scorE fields (`safety_score`,
`production_score`, `quality_score`, `environmental_score`, `failure_frequency_score`,
`repair_time_score`, `spare_availability_score`, `backup_availability_score` all `numeric`),
`total_score numeric`, `description`.

**`departments`** — `id PK`, `organization_id FK`, `plant_id FK→plants ON DELETE CASCADE`,
`code`, `name NN`, `department_type`, `status NN default 'active'`, timestamps.

**`sections`** — `id PK`, `organization_id FK`, `plant_id FK→plants`, `department_id
FK→departments`, `code`, `name NN`, `status default 'active'`.

**`areas`** — `id PK`, `organization_id FK`, `plant_id FK→plants`, `section_id FK→sections`,
`code`, `name NN`, `status default 'active'`.

**`locations`** — `id PK`, `organization_id FK`, `plant_id FK→plants`, `area_id FK→areas`,
`code`, `name NN`, `description`.

**`cost_centers`** — `id PK`, `organization_id FK`, `plant_id FK→plants`, `code`, `name NN`,
`description`, `status default 'active'`.

### Vendors

**`vendors`** — `id PK`, `organization_id FK`, `vendor_code`, `code` (both accepted by the app),
`name NN`, `vendor_type`, `contact_person`, `phone`, `email`, `address`, `tax_identifier`,
`status NN default 'active'`, `created_at`, `updated_at`.

### Equipment

**`equipment`** — the asset hub.
`id PK`, `organization_id FK`, `plant_id FK→plants`, `equipment_code NN`, `equipment_name NN`,
`category_id FK→asset_categories`, `parent_equipment_id FK→equipment`,
`department_id FK→departments`, `section_id FK→sections`, `area_id FK→areas`,
`location_id FK→locations`, `cost_center_id FK→cost_centers`, `make`, `model`,
`serial_number`, `capacity numeric`, `capacity_unit`, `manufacturer`,
`supplier_vendor_id FK→vendors`, `installation_date/commissioning_date/purchase_date`,
`purchase_cost numeric`, `warranty_start/warranty_end`, `amc_start/amc_end`,
`criticality_id FK→criticality_profiles`, `status NN default 'active'`, `description`,
`qr_code`, `photo_url`, `created_at`, `updated_at`.
Indexes: `plant_id`, `category_id`, `status`.

**`equipment_components`** — `id PK`, `organization_id FK`, `equipment_id FK→equipment ON DELETE
CASCADE`, `component_code`, `component_name`, `component_type`, `make`, `model`,
`serial_number`, `criticality NN default 'normal'`, `status NN default 'active'`, `remarks`,
timestamps.

**`equipment_status_history`** — `id PK`, `organization_id FK`, `equipment_id FK ON DELETE
CASCADE`, `old_status`, `new_status NN`, `reason`, `changed_at NN default now()`,
`changed_by FK→auth.users`. Index on `(equipment_id, changed_at desc)`.

### Work management

**`work_requests`** — `id PK`, `organization_id FK`, `plant_id FK→plants`, `request_no NN`,
`requested_by FK→auth.users`, `equipment_id FK→equipment`, `request_type`, `priority NN default
'medium'`, `requested_at NN default now()`, `description NN`, `status NN default 'submitted'`,
`reviewed_by FK→auth.users`, `reviewed_at`, `created_at`.

**`maintenance_plans`** — `id PK`, `organization_id FK`, `plant_id FK→plants`,
`equipment_id FK→equipment`, `plan_code NN`, `name NN`, `maintenance_type`,
`frequency_type`, `frequency_value integer`, `start_date date`,
`estimated_duration_minutes integer`, `responsible_role_id FK→roles`,
`responsible_user_id FK→auth.users`, `priority NN default 'medium'`, `safety_instructions`,
`status NN default 'active'`, timestamps.

**`work_orders`** —
`id PK`, `organization_id FK`, `plant_id FK→plants`, `work_order_no NN`,
`work_request_id FK→work_requests`, `equipment_id FK→equipment`,
`maintenance_plan_id FK→maintenance_plans`, `assigned_to text` (free-form name/email),
`type NN default 'preventive'`, `priority NN default 'medium'`, `status NN default 'draft'`,
`title NN`, `description`, `planned_start/planned_end/actual_start/actual_end timestamptz`,
`verified_by/closed_by FK→auth.users`, `verified_at/closed_at`, `closure_remarks`, timestamps.
Indexes: `plant_id`, `status`.

**`work_order_statuses`** — drop-history table (no FK to work_orders):
`id PK`, `work_order_no text`, `old_status`, `new_status NN`, `remarks`,
`changed_by FK→auth.users`, `changed_at NN default now()`. *(Inserted by
`changeWorkOrderStatus`; see inconsistency below.)*

**`work_order_status_history`** — read table used by `getWorkOrderStatusHistory`:
`id PK`, `work_order_id FK→work_orders ON DELETE CASCADE`, `old_status`, `new_status NN`,
`remarks`, `changed_by FK→auth.users`, `changed_at NN default now()`.
Index on `(work_order_id, changed_at desc)`. *(Nothing writes here today.)*

**`work_order_activities`** — `id PK`, `work_order_id FK→work_orders ON DELETE CASCADE`,
`activity_type`, `description`, `started_at NN default now()`, `ended_at`, `note`,
`created_by FK→auth.users`, `created_at`. Index on `(work_order_id, started_at desc)`.

### Maintenance schedules (PM)

**`maintenance_schedules`** —
`id PK`, `schedule_no`, `equipment_id FK→equipment`, `task_type`, `frequency`,
`interval_days integer`, `last_run_at`, `next_run_at`, `assigned_to text`,
`is_active bool NN default true`, `notes`, timestamps.
Indexes: `next_run_at`, `is_active`.

### Breakdowns

**`breakdowns`** —
`id PK`, `organization_id FK`, `plant_id FK→plants`, `breakdown_no NN`,
`equipment_id FK→equipment`, `reported_by text`, `reported_at NN default now()`,
`breakdown_start`, `restored_at`, `problem_description`, `description`, `root_cause`,
`action_taken`, `resolution_notes`, `resolution`, `severity`,
`downtime_minutes integer CHECK (>= 0 or null)`, `production_impact`, `status NN default
'reported'`, `resolved_at`, `linked_work_order_id FK→work_orders`, `created_by text`, timestamps.
Indexes: `equipment_id`, `reported_at`.

### Inspections

**`inspections`** —
`id PK`, `organization_id FK`, `plant_id FK→plants`, `inspection_no NN`,
`equipment_id FK→equipment`, `inspector_id FK→auth.users`, `scheduled_date timestamptz`,
`performed_at`, `status NN default 'scheduled'`, `overall_result`, `remarks`, timestamps.
Index: `status`.

### Inventory & stock

**`spare_parts`** —
`id PK`, `part_code NN UNIQUE`, `part_name NN`, `category NN default 'electrical'`,
`unit NN default 'pcs'`, `current_stock integer NN default 0` (denormalized live balance),
`min_stock NN default 0`, `reorder_level NN default 0`, `location`, `description`,
`plant_id FK→plants`, `created_at`, `updated_at`.

**`spare_part_plants`** — per-plant balance (embedded by the spare-parts list as
`spare_part_plants`): `id PK`, `part_id FK→spare_parts ON DELETE CASCADE`,
`plant_id FK→plants ON DELETE CASCADE`, `quantity integer NN default 0`, `location`,
`created_at`, `UNIQUE(part_id, plant_id)`.

**`spare_part_stock`** — per-plant balance shown on the spare-part detail page (embedded as
relation `spare_part_stock`): `id PK`, `spare_part_id FK→spare_parts ON DELETE CASCADE`,
`plant_id FK→plants ON DELETE CASCADE`, `quantity integer NN default 0`, `created_at`,
`UNIQUE(spare_part_id, plant_id)`.

> Note: `spare_part_plants` and `spare_part_stock` are two parallel per-plant mirrors, both fed
> by the same trigger; the app reads one or the other depending on the page.

**`spare_part_components`** — BOM rows used by the spare-parts service:
`id PK`, `spare_part_id FK→spare_parts ON DELETE CASCADE`, `part_code`, `part_name NN`,
`quantity integer NN default 1`, `created_at`.

**`spare_part_stock_movements`** — stock history used by the spare-parts service:
`id PK`, `spare_part_id FK→spare_parts ON DELETE CASCADE`, `movement_type`, `quantity NN`,
`reference_no`, `note`, `created_by FK→auth.users`, `created_at`.

**`stock_movements`** — the primary movements ledger (created in the spare-parts migration,
extended here by `add column if not exists plant_id`):
`id PK`, `part_id FK→spare_parts ON DELETE CASCADE`,
`movement_type NN CHECK (∈ purchase_in, return_in, workorder_issue, breakdown_use, adjustment,
scrap_out, transfer)`, `quantity NN CHECK (<> 0)`, `from_plant_id FK→plants`,
`to_plant_id FK→plants`, `work_order_id FK→work_orders`, `reference_no`, `note`,
`created_by FK→auth.users`, `created_at`, plus added `plant_id FK→plants`.
Indexes: `part_id`, `created_at desc`. The inventory service filters on `plant_id`.

## Functions & triggers

| Object | Table | Kind | Effect |
|---|---|---|---|
| `set_updated_at()` | `spare_parts` | function + `before update` trigger `trg_spare_parts_updated` | keeps `updated_at` current |
| `sync_spare_part_stock()` | `stock_movements` | function + `after insert or delete` trigger `trg_sync_spare_part_stock` | adds/subtracts movement `quantity` to `spare_parts.current_stock` |
| `sync_spare_part_plant()` | `stock_movements` | function (extended in app schema) + `after insert` trigger `trg_sync_spare_part_plant` (only when `movement_type` in `purchase_in, transfer, return_in`) | upserts `spare_part_plants` **and** `spare_part_stock` per plant (`coalesce(to_plant_id, from_plant_id)`) |

## Typed tables that are NOT yet created

`src/types/database.ts` also types tables the schema does not create today (reserved for future
work): `audit_logs`, `documents`, `document_links`, `service_visits`, `notifications`,
`spare_equipment_map`. Any code that touches them will fail until migrated.

## Known schema inconsistencies

See [KNOWN-GAPS](KNOWN-GAPS.md) for the working detail on:

1. `work_order_statuses` (written by service) vs `work_order_status_history` (read by service) —
   two different tables, nothing connects them.
2. Four overlapping stock tables: `spare_part_plants`, `spare_part_stock`,
   `spare_part_stock_movements`, and `stock_movements` — each exists because a different page
   or service reads it; the ledger is `stock_movements`, the rest are mirrors/history.
3. `stock_movements.movement_type` DB `CHECK` list omits `transfer_in`/`transfer_out`, but the
   spare-parts service type (`StockMovement.movement_type`) includes them.
4. `profiles.department_id` is a plain `uuid` with no FK (typed as linked to `departments`).
5. The app-first migrations drop the official spec constraints (`organization_id` enforced
   everywhere, strict enums, inspection templates) — drift is intentional and documented in
   [ARCHITECTURE](ARCHITECTURE.md) / [KNOWN-GAPS](KNOWN-GAPS.md).