# Brilliants Maintenance ERP — Coding Conventions

## Scope

Conventions observed in `src/` today, plus the development rules the repo was built under. The
canonical rules live in [`docs/AI_DEVELOPMENT_RULES.md`](AI_DEVELOPMENT_RULES.md) with a
one-glance summary in [`docs/DEVELOPMENT-RULES.md`](DEVELOPMENT-RULES.md). This file records
the conventions actually observed in the code plus agreed session defaults.

## Page conventions

- Every route component is a client component (`"use client";` at the top).
- Protected pages render inside `<ERPLayout>`; public/auth-agnostic surfaces (`/`, `/login`)
  do not.
- Every module page uses `<PageHeader title=… description=… action=… />` where `action` holds
  the primary Create/New link or header buttons.
- List pages: `<Card><CardContent>` wrapping a search `<Input>`, filter `<Select>`s,
  `<DataTable columns=… data=… loading=… onRowClick=… />`, and `<Pagination>` wired to
  `page`/`pageSize`/`totalItems` with a `setPage` handler.
- Detail pages: `<Card>` + `<MetadataRow label=… value=… />` grid, header actions for
  Edit/Status/Back links, and inline action buttons (Delete etc.) at the bottom.
- Status/type values render through a `StatusBadge` fed by a `statusMeta` object looked up from
  `src/lib/constants` vocabularies (each constant entry is `{ value, label, color }`).

## Data access conventions

- Data access lives in `src/services/<module>.ts` (flat) or `src/services/<module>/index.ts`
  (directory modules). Both styles currently coexist; new code prefers returning
  `{ data, error }` (or `{ data, count, error }` for lists).
- Pages select tables directly too (list pages build their own filters/joins, detail pages
  call services). Prefer the service layer for shared queries.
- Query results are cast through locally-declared row types (`EquipmentRow`, `WorkOrderRow`,
  …) because Supabase types are not generated.
- Error handling is minimal and consistent: `error` is rendered via `FormError` / an inline red
  box on submit failure; list failures fall through to empty state.

## Form conventions

- New/edit forms that need strong validation use `react-hook-form` + `zod` with
  `@hookform/resolvers/zod` (`zodResolver`), schemas in `src/lib/validation/<module>.ts`.
  Supported zod validation pages: equipment, work-orders, spare-parts, and the shared
  `BreakdownForm` (`src/lib/validation/breakdowns.tsx`).
- Other forms (maintenance new, inspections new, vendors new, work-order status, spare-part
  stock movement) do **manual validation** with `useState` errors and `FormError`.
- Submit handlers: set `isLoading`/`saving` state, call the service, on
  `error` show it (`FormError message={error?.message}`), on success `router.push` to the
  detail page (or back).
- The shared `BreakdownForm` component accepts `initialData`, `defaultPlantId`,
  `defaultEquipmentId`, `onCancel`, `onSaved` and is reused by create and edit flows.

## UI conventions

- Class merging always via `cn()` (`clsx` + `tailwind-merge`) from `src/lib/utils`.
- Primitive components in `src/components/ui`; the `Button` API is
  `variant = primary|secondary|ghost|danger|outline`, `size = sm|md|lg`, `isLoading`.
- Prefer `Card`/`CardHeader`/`CardTitle`/`CardContent` for sections; `Dialog` and the RHF
  `Form` wrapper exist but **no page uses them today**.
- Icons from `lucide-react`.
- Colors encode meaning: blue = primary/active, green = success/active/purchase,
  red = danger/breakdown/urgent, yellow/orange = warnings/in-progress, gray = neutral/closed.
- Numbers/dates/currency are formatted with `src/lib/utils` formatters using `en-IN` locale
  and `INR` currency (`formatDate`, `formatDateTime`, `formatCurrency`, `timeAgo`, …).

## Documentation & reporting rule

Development work reports in a fixed end-state format covering:
1. Modified files
2. Created files
3. Database changes
4. Validation performed (typecheck/build)
5. Notes / decisions

Minimal, targeted changes; when the DB schema direction or a behavior choice is ambiguous,
stop and ask the user rather than guessing (per `docs/AI_DEVELOPMENT_RULES.md`).

## Session defaults agreed so far

- **Schema direction:** "App-first" — migrations mirror what `src/` actually reads/writes,
  not the official spec folder (`extracted_sql_migrations`). RLS intentionally off;
  status/type columns are `text` so the app is never rejected.
- **Placeholders:** Shutdowns and Calibration are "coming soon" pages by decision.
- **Git:** checkpoint commits happen when the user asks; commit messages are descriptive and
  follow the initial-commit style; no secrets are ever committed.

See [KNOWN-GAPS](KNOWN-GAPS.md) for where the code deviates from these conventions.