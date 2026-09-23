# Brilliants Maintenance ERP — Known Gaps & TODO

Status snapshot and known issues, last reviewed 2026-09-23. Every item is verified against the
current code.

## Functional gaps (pages that are partial)

1. **Equipment detail tabs** — Work Orders / Breakdowns / Inspections / Calibration / Spares /
   Documents / Cost render an empty `EmptyState`; only Overview, Components, Maintenance,
   History are implemented.
2. **Equipment Edit dead link** — `/equipment/[id]` renders an "Edit" header button linking to
   `/equipment/[id]/edit`, but that route file does **not** exist (would 404). Either create the
   route or remove the button.
3. **Work-order detail tabs** — `activities`, `spares`, and `history` tabs have no render
   branch (render nothing); `details` branch is unreachable. Effectively overview-only.
4. **Settings create buttons** — "Add User", "Add Role", "Add Plant" buttons are inert
   (no handler, no route). Users/roles/plants/permissions screens are read-only.
5. **Placeholders** — `/shutdowns` and `/calibration` are "Coming Soon" cards. Dashboard still
   counts calibration-due from `maintenance_schedules.task_type = 'calibration'`.

## Data-layer inconsistencies

6. **Work-order status history** — `changeWorkOrderStatus` **writes** `work_order_statuses`
   (keyed by text `work_order_no`, no FK) while `getWorkOrderStatusHistory` **reads**
   `work_order_status_history` (FK to `work_orders`). Nothing replaces that ordering/read, so
   transitions are never actually visible. Fix by aligning both on one table.
7. **Spare-part stock triple mirrors** — `spare_part_plants` (list page), `spare_part_stock`
   (detail page relation), `spare_part_stock_movements` (legacy service history) overlap with
   the `stock_movements` ledger. All are fed by the same trigger today; the legacy
   `spare_part_stock_movements` table is never written by any page or trigger.
8. **Spare-parts pagination off-by-one** — `getSpareParts` computes range end as
   `pageSize - 1 - 1`, skipping the second item of the page window relative to the page's own list.
9. **Movement type drift** — DB `CHECK` on `stock_movements.movement_type` lists `…, transfer`
   only; the spare-parts service type includes `transfer_out`/`transfer_in`; the zod
   `stockMovementSchema` uses `transfer`. Pick one vocabulary and align check/type/schema.
10. **Movement page plant ignored** — `/spare-parts/[id]/stock` loads a `plants` dropdown but
    never submits `plant_id`; plant attribution only lands via triggers from
    `from/to_plant_id` (which the page does not set). Consider wiring the selected plant into
    `to_plant_id`/`plant_id`.
11. **Profiles: department link is loose** — `profiles.department_id` is unconstrained (typed
    `uuid`, no FK to `departments`).
12. **Legacy flat services vs directory modules** — `equipment.ts`, `work-orders.ts`,
    `spare-parts.ts` coexist with `equipment/`, `work-orders/`, `spare-parts/` index modules.
    Pages mostly use the flat ones; the directory ones contain richer (mostly unused) functions.
    Consolidate to one per module.

## Product / UX gaps

13. **No seed data** — app requires an `organizations` row, at least one `plants` row, and a
    `profiles` row per auth user (insert via Supabase SQL editor). No README seed script.
14. **Components added via `window.prompt`** — equipment detail's Components tab uses a browser
    prompt instead of a form (a `Dialog` exists but is unused).
15. **Inert "Profile" menu item** — header user menu "Profile" has no handler.
16. **Notifications bell** — decorative only (red dot always on).
17. **Spare-part list uses raw low-stock filter** — `lt("current_stock","reorder_level")` is a
    PostgREST column-reference filter; behaves like the dashboard's explicit criteria but is
    more obscure. Standardize on the dashboard's `gt(0).lte(current,reorder)` form.
18. **Next.js middleware deprecation** — `src/middleware.ts` works but prints a warning that the
    `middleware` convention is deprecated in favor of `proxy`. Migrate to `src/proxy.ts`
    (`updateSession` import) when convenient.

## Infrastructure / housekeeping

19. **RLS is off by decision** — fine for single-org; enabling multi-tenancy later requires
    org-scoped RLS + org-scoped queries in every service/page (official policies live under
    `extracted_sql_migrations/` at the repo root).
20. **No generated Supabase types** — `src/types/database.ts` is hand-written; if `supabase gen
    types` is adopted, the casts in services become typed.
21. **`@tanstack/react-table` unused** — installed but the app ships its own `DataTable`;
    either use it or drop the dependency.
22. **Typed-but-absent tables** — `audit_logs`, `documents`, `document_links`,
    `service_visits`, `notifications`, `spare_equipment_map` are referenced in
    `src/types/database.ts` but not created by migrations.

## Suggested next steps (in priority order)

1. Fix #2 (create `/equipment/[id]/edit` or remove the link) and #6 (align work-order status
   history read/write).
2. Wire the settings create flows (#4) using existing zod schemas where possible.
3. Implement remaining equipment detail tabs (#1) and work-order activities/history (#3) using
   the already-written service functions.
4. Standardize the stock tables (#7) and movement vocabulary (#9), then fix pagination (#8).
5. Add a seed SQL script (#13) and the `proxy` migration (#18).