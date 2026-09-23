# Brilliants Maintenance ERP — Modules & Routes

Complete route inventory (all files under `src/app`, per route `page.tsx`). Every page is a
client component. Tables referenced are the actual Supabase tables each page queries.

Legend — status: ✅ functional · 🟡 partial / read-only bits · ⏳ placeholder

## Root & auth

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | Redirect gate → `/dashboard` or `/login` | — (auth only) | ✅ |
| `/login` | `src/app/login/page.tsx` | Sign-in form (email + password) | — (auth only) | ✅ |
| `/dashboard` | `src/app/dashboard/page.tsx` | KPI overview | `equipment`, `criticality_profiles`, `maintenance_schedules`, `work_orders`, `breakdowns`, `spare_parts` | ✅ |

Dashboard KPIs (all read-only): total machines, critical equipment, open work orders, breakdowns
this month (+ 6-month trend chart), PM compliance %, PM due today, PM overdue, calibration due
≤30 days, active PM schedules, low-stock parts, next-5 upcoming PM.

## Equipment

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/equipment` | `src/app/equipment/page.tsx` | List + search + filters + paginated `DataTable` | `equipment` (+ joins: `asset_categories`, `criticality_profiles`, `plants`); options: `plants`, `asset_categories`, `criticality_profiles` | ✅ |
| `/equipment/new` | `src/app/equipment/new/page.tsx` | Create form (zod) | `equipment` insert; options: `plants`, `asset_categories`, `criticality_profiles` | ✅ |
| `/equipment/[id]` | `src/app/equipment/[id]/page.tsx` | Detail + 11 tabs (Overview, Components, Maintenance, Work Orders, Breakdowns, Inspections, Calibration, Spares, Documents, Cost, History) | `equipment`, `equipment_components`, `equipment_status_history` | 🟡 (only Overview / Components / Maintenance / History implemented; other tabs are empty placeholders) |

Notes: header "Edit" button links to `/equipment/[id]/edit` which **does not exist** (404).
Components are added via `window.prompt`. Status history is read-only display. Detail joins the
full asset hierarchy (departments, sections, areas, locations, cost centers, parent equipment,
vendors).

## Work Orders

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/work-orders` | `src/app/work-orders/page.tsx` | List + filters + pagination | `work_orders` (+ `plants`, `equipment`); options: `plants` | ✅ |
| `/work-orders/new` | `src/app/work-orders/new/page.tsx` | Create form (zod) | `work_orders` insert; options: `plants`, `equipment` | ✅ |
| `/work-orders/[id]` | `src/app/work-orders/[id]/page.tsx` | Detail with tabs `overview \| activities \| spares \| history` | `work_orders` (+ `plants`, `equipment`, `maintenance_plans`, `work_requests`) | 🟡 (overview tab only; other tabs render nothing) |
| `/work-orders/[id]/edit` | `src/app/work-orders/[id]/edit/page.tsx` | Edit form | `work_orders` update; options: `plants`, `equipment` | ✅ |
| `/work-orders/[id]/status` | `src/app/work-orders/[id]/status/page.tsx` | Change status form | `work_orders` update (`status`, `status_changed_at`) | ✅ |

## Maintenance (PM schedules)

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/maintenance` | `src/app/maintenance/page.tsx` | List (next-run ascending) | `maintenance_schedules` (+ `equipment`) | ✅ |
| `/maintenance/new` | `src/app/maintenance/new/page.tsx` | Create form (manual validation) | `maintenance_schedules` insert (auto `schedule_no` `MAINT-XXXX`); options: `equipment` | ✅ |
| `/maintenance/[id]` | `src/app/maintenance/[id]/page.tsx` | Detail + pause/resume + delete | `maintenance_schedules` update/delete | ✅ |

## Breakdowns

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/breakdowns` | `src/app/breakdowns/page.tsx` | List + status filter | `breakdowns` (+ `plants`, `equipment`) | ✅ |
| `/breakdowns/new` | `src/app/breakdowns/new/page.tsx` | Create form wrapping shared `BreakdownForm` (react-hook-form + zod) | `breakdowns` insert; options: `plants`, `equipment` | ✅ |
| `/breakdowns/[id]` | `src/app/breakdowns/[id]/page.tsx` | Detail + status updates + resolve + delete | `breakdowns` update/delete | ✅ |

## Inspections

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/inspections` | `src/app/inspections/page.tsx` | List (scheduled date desc) | `inspections` (+ `plants`, `equipment`) | ✅ |
| `/inspections/new` | `src/app/inspections/new/page.tsx` | Create form (manual validation) | `inspections` insert (auto `inspection_no` `INSP-XXXX`, status default `scheduled`); options: `plants`, `equipment` | ✅ |
| `/inspections/[id]` | `src/app/inspections/[id]/page.tsx` | Detail + mark completed + result + delete | `inspections` update/delete | ✅ |

## Spare Parts & Inventory

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/spare-parts` | `src/app/spare-parts/page.tsx` | List (custom `Table` + hand-rolled pagination; low-stock / out-of-stock filters) | `spare_parts` (+ `plants`); options: `plants` | ✅ |
| `/spare-parts/new` | `src/app/spare-parts/new/page.tsx` | Create form (zod) | `spare_parts` insert (`initial_quantity` → `current_stock`) | ✅ |
| `/spare-parts/[id]` | `src/app/spare-parts/[id]/page.tsx` | Detail + per-plant stock table + delete | `spare_parts` (+ `plants`, relation `spare_part_stock`) | ✅ |
| `/spare-parts/[id]/edit` | `src/app/spare-parts/[id]/edit/page.tsx` | Edit form (zod) | `spare_parts` update | ✅ |
| `/spare-parts/[id]/stock` | `src/app/spare-parts/[id]/stock/page.tsx` | Record stock movement | `spare_parts` update (`current_stock`), `stock_movements` insert; options: `plants` (loaded, not submitted) | ✅ |
| `/inventory` | `src/app/inventory/page.tsx` | Stock overview + recent movements | `spare_parts`, `stock_movements` (+ `spare_parts`) | ✅ |

## Vendors

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/vendors` | `src/app/vendors/page.tsx` | List + search + filter + pagination | `vendors` | ✅ |
| `/vendors/new` | `src/app/vendors/new/page.tsx` | Create form (manual validation) | `vendors` insert | ✅ |
| `/vendors/[id]` | `src/app/vendors/[id]/page.tsx` | Detail + status control + delete | `vendors` update/delete | ✅ |

## Reports

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/reports` | `src/app/reports/page.tsx` | Operational overview: counts + status breakdowns per module | `equipment`, `work_orders`, `breakdowns`, `spare_parts`, `maintenance_schedules`, `plants` | ✅ |

## Placeholders

| Route | File | Type | Status |
|---|---|---|---|
| `/shutdowns` | `src/app/shutdowns/page.tsx` | "Coming Soon" card | ⏳ |
| `/calibration` | `src/app/calibration/page.tsx` | "Coming Soon" card | ⏳ |

## Settings

| Route | File | Type | Tables | Status |
|---|---|---|---|---|
| `/settings` | `src/app/settings/page.tsx` | Hub with cards linking to users/roles/plants/permissions | — | ✅ |
| `/settings/users` | `src/app/settings/users/page.tsx` | Read-only user list (search) | `profiles` | 🟡 ("Add User" button is inert) |
| `/settings/roles` | `src/app/settings/roles/page.tsx` | Read-only role list (+ permission counts per role) | `roles`, `permissions`, `role_permissions` | 🟡 ("Add Role" button is inert) |
| `/settings/plants` | `src/app/settings/plants/page.tsx` | Read-only plant list (search) | `plants` | 🟡 ("Add Plant" button is inert) |
| `/settings/permissions` | `src/app/settings/permissions/page.tsx` | Read-only permissions grouped by module | `permissions` | ✅ |

## Cross-cutting facts

- **Tables the app touches** (verified from `.from("…")`): `equipment`,
  `equipment_components`, `equipment_status_history`, `asset_categories`,
  `criticality_profiles`, `plants`, `departments`, `sections`, `areas`, `locations`,
  `cost_centers`, `vendors`, `work_orders`, `work_order_statuses`,
  `work_order_status_history`, `work_order_activities`, `maintenance_plans`,
  `work_requests`, `maintenance_schedules`, `breakdowns`, `spare_parts`,
  `spare_part_plants`, `spare_part_stock`, `spare_part_components`,
  `spare_part_stock_movements`, `stock_movements`, `inspections`, `profiles`,
  `organizations`, `roles`, `permissions`, `role_permissions`, `user_roles`.
- `Dialog` and the RHF `Form` component exist but are unused by pages; `DataTable` +
  `Pagination` are used by the six main list pages; `Tabs` only on equipment and work-order
  detail; the spare-parts list uses the raw `Table` primitives + custom prev/next.

See [WORKFLOWS](WORKFLOWS.md) for end-to-end flows and [KNOWN-GAPS](KNOWN-GAPS.md) for partial
items listed above.