# Brilliants Maintenance ERP — State of the Repo

> Updated: 2026-09-23.

## Modules

All sidebar modules are delivered and routable (29 routes).

| Module | Pages | Notes |
|--------|-------|-------|
| Dashboard | `/dashboard` | Live KPIs + breakdown trend & upcoming PM (real queries) |
| Equipment | list / new / `[id]` / `[id]/edit` | CRUD, components, status history |
| Work Orders | list / new / `[id]` / `[id]/edit` / `[id]/status` | CRUD + status transitions |
| Breakdowns | list / new / `[id]` | CRUD, status/resolve, delete |
| Maintenance | list / new / `[id]` | Preventive schedule CRUD, pause/resume |
| Inspections | list / new / `[id]` | CRUD, status + result updates |
| Spare Parts | list / new / `[id]` / `[id]/edit` / `[id]/stock` | CRUD + stock movements |
| Inventory | `/inventory` | Stock levels + recent movements |
| Vendors | list / new / `[id]` | CRUD |
| Reports | `/reports` | Overview stats + status breakdowns |
| Calibration / Shutdowns | placeholders | "Coming soon" per decision |
| Settings | plants, users, roles, permissions | Read views (Add buttons are stubs) |

## Database

- `supabase/migrations/20260921100000_spare_parts.sql` (inventory) and
  `supabase/migrations/20260923100000_app_schema.sql` (app-first schema for all
  modules). Both idempotent; RLS intentionally not enabled.
- Full official spec/schema lives at the repo root in the `extracted_*` folders
  (development spec, schema spec, RLS, SQL migrations, how-to-start). The app
  intentionally diverges from the official spec for inventory/maintenance
  (e.g. `current_stock` + `stock_movements` instead of `spare_stocks` +
  `stock_transactions`).

## Verification

- `npx tsc --noEmit` → 0 errors
- `npm run build` → success, 29 routes
- Next.js prints a non-blocking warning that the `middleware` convention is
  deprecated in favor of `proxy` (harmless, not yet migrated).

## Known gaps

- Settings "Add"/create flows are placeholders (no forms).
- Calibration & Shutdowns modules are placeholders awaiting a decision.
- No seed data; app expects an existing `profiles` row + at least one `plants`
  row (insert directly via Supabase).
- Legacy `src/services/*.ts` modules reference `spare_part_components` /
  `spare_part_stock_movements` (tables now exist) but no pages use them yet.