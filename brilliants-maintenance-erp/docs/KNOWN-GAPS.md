# Brilliants Maintenance ERP — Known Gaps & TODO

Status snapshot and known issues, last reviewed 2026-09-23 (post gap-fix batch).

## Resolved (2026-09-23 batch)

1. **Equipment detail tabs** — Work Orders / Breakdowns / Inspections / Calibration now render
   real, data-backed tables linking to their detail pages. Spares row is a clean empty state
   (no data model links parts to a parent asset yet); Documents / Cost are marked "not available".
2. **Equipment Edit page** — `/equipment/[id]/edit` created (load + save via `updateEquipment`);
   header Edit button now works.
3. **Work-order detail tabs** — `activities`, `spares`, `history` implemented (activities list,
   issued-spares table via `stock_movements`, status transition history).
4. **Settings create flows** — Add Plant and Add Role dialogs work; Add User opens a guidance
   dialog (auth accounts are created in Supabase Auth, since client invites aren't available).
5. **Placeholders** — `/calibration` lists `maintenance_schedules` where `task_type =
   'calibration'`; `/shutdowns` lists `work_orders` where `type = 'shutdown'`.
6. **Work-order status history** — `changeWorkOrderStatus` now writes
   `work_order_status_history` (FK to `work_orders`), matching what
   `getWorkOrderStatusHistory` reads. The status page also dropped the invalid
   `status_changed_at` column write (column did not exist; would 400).
8. **Spare-parts pagination** — `getSpareParts` range end is now `from + pageSize - 1`.
9. **Movement type** — spare-parts service type union aligned to the DB CHECK (`transfer`,
   removed `transfer_out`/`transfer_in`).
10. **Movement page plant** — selected plant is now submitted as `plant_id` plus
    `to_plant_id`/`from_plant_id` depending on movement direction.
13. **Seed data** — `supabase/seed.sql` bootstraps organisation, plant, roles (ADMIN/ENGINEER/
    VIEWER), full permission matrix, role grants, and auto-wires the first auth user as an
    Administrator profile + role.
14. **Components via prompt** — replaced with a `Dialog` form (name/type/serial/criticality) and
    per-row delete.
18. **Next.js middleware → proxy** — `src/middleware.ts` migrated to `src/proxy.ts`;
    build logs show `ƒ Proxy (Middleware)`.

## Environment / remote DB (2026-09-23)

- **Project `ironbook` (`ekjakdhxodugncdpwkrj`) hosts a legacy gym app too** — 25 gym tables
  (`gyms`, `members`, `partners`, `staff`, `attendance`, `payments`, `inventory`, `expenses`,
  `notifications`, …), **14 existing auth users**, and 12 legacy `profiles`.
- **`profiles` schema collision** — the legacy `profiles` (with `gym_id`, `role`, `is_active`)
  existed before our migrations, so `create table if not exists profiles` was silently skipped.
  Fixed non-destructively: added our columns (`organization_id`, `employee_code`,
  `department_id`, `plant_id`, `status`) to the existing table. All other 32 ERP tables match our
  migrations exactly.
- **`seed.sql` applied via the Management API query endpoint** (postgres SQL access through the
  access token — no DB password/psql needed): 1 org (`Brilliants`/BRI), 1 plant (Pune Plant),
  3 system roles, 42 permissions, 84 role-permission grants. Idempotent; safe to re-run.
- **Admin wiring** — the seed's "first user" rule originally granted ADMIN to the oldest
  existing auth user (`testuser@ironbook.com`); that grant was removed and **ERP ADMIN moved to
  `admin@brilliants.in`**, keeping the ERP admin distinct from the gym app's admin
  (`admin@ironbook.com` / `superadmin@ironbook.com`). All 12 profiles were pointed at the seeded
  org + plant, so any existing / newly created auth user logs into a working ERP (profile → org →
  plant → roles).
- **No auto-profile trigger** — auth signup does NOT create a `profiles` row (no
  `handle_new_user` trigger); new ERP users need a `profiles` insert (seed handles the first
  created user) or a manual insert, then a `user_roles` grant.

## Still open

7. **Spare-part stock triple mirrors** — `spare_part_plants` (list page), `spare_part_stock`
   (detail page relation), `spare_part_stock_movements` (legacy service history) overlap with
   the `stock_movements` ledger. All are fed by the same trigger today; the legacy
   `spare_part_stock_movements` table is never written by any page or trigger.
11. **Profiles: department link is loose** — `profiles.department_id` is unconstrained (typed
    `uuid`, no FK to `departments`).
12. **Legacy flat services vs directory modules** — `equipment.ts`, `work-orders.ts`,
    `spare-parts.ts` coexist with `equipment/`, `work-orders/`, `spare-parts/` index modules.
    Pages mostly use the flat ones; the directory ones contain richer (mostly unused) functions.
    Consolidate to one per module.
15. **Inert "Profile" menu item** — header user menu "Profile" has no handler.
16. **Notifications bell** — decorative only (red dot always on).
17. **Spare-part list uses raw low-stock filter** — `lt("current_stock","reorder_level")` is a
    PostgREST column-reference filter; standardize on the dashboard's `gt(0).lte(current,reorder)`
    form.
19. **RLS is off by decision** — fine for single-org; enabling multi-tenancy later requires
    org-scoped RLS + org-scoped queries in every service/page (official policies live under
    `extracted_sql_migrations/` at the repo root).
20. **No generated Supabase types** — `src/types/database.ts` is hand-written; if `supabase gen
    types` is adopted, the casts in services become typed.
21. **`@tanstack/react-table` unused** — installed but the app ships its own `DataTable`.
22. **Typed-but-absent tables** — `audit_logs`, `documents`, `document_links`,
    `service_visits`, `notifications`, `spare_equipment_map` are referenced in
    `src/types/database.ts` but not created by migrations.
23. **Lint command broken** — `eslint.config.mjs` imports `eslint-config-next` v15 under ESLint 9
    flat config, which fails (`nextVitals is not iterable`). Build + `tsc --noEmit` are the
    working gates.

## Suggested next steps (in priority order)

1. Log in as `admin@brilliants.in` in Supabase Auth (reset its password there if needed), then
   smoke-test the app end-to-end (login, create equipment, work order, spare-part movement,
   status transitions).
2. Standardize the stock tables (#7) and movement vocabulary, or drop the unused mirrors.
3. Consolidate duplicate service modules (#12).
4. Header cleanup (#15, #16) and low-stock filter (#17).
5. Fix the lint config (upgrade `eslint-config-next` to v16 or use the legacy config loader).