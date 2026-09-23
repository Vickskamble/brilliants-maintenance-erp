# Brilliants Maintenance ERP — Architecture

> Companion docs: [MODULES](MODULES.md) | [WORKFLOWS](WORKFLOWS.md) |
> [DATABASE](DATABASE.md) | [SERVICES](SERVICES.md) | [UI-COMPONENTS](UI-COMPONENTS.md) |
> [CONFIG-ENV](CONFIG-ENV.md) | [CONVENTIONS](CONVENTIONS.md) | [KNOWN-GAPS](KNOWN-GAPS.md)

## What this is

A browser-based maintenance management ERP for industrial plants:

- **Equipment registry** — assets, hierarchy (category → parent equipment), per-equipment components and status history.
- **Maintenance** — preventive maintenance (PM) schedules with frequencies and next-run tracking.
- **Work orders** — planned/corrective/breakdown work with a status lifecycle.
- **Breakdowns** — incident logging (report → diagnose → repair → restore).
- **Inspections** — scheduling and completion with overall results.
- **Spare parts / inventory** — parts, per-plant stock, stock movements ledger, reorder levels.
- **Vendors** — supplier master data.
- **Dashboard & reports** — live KPIs and status roll-ups.
- **Settings** — users, roles, permissions, plants (read-only views today).

## Technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js **16.3.5** (App Router, Turbopack) |
| UI | React 19, Tailwind CSS **v4** (`@import "tailwindcss"`), `lucide-react` icons |
| Data | Supabase Postgres via `@supabase/supabase-js` + `@supabase/ssr` |
| Forms | `react-hook-form` + `zod` v4 (`@hookform/resolvers`), plus manual validation in some pages |
| Tables | `@tanstack/react-table` (installed; the app uses a lightweight custom `DataTable` instead) |
| Misc | `clsx` + `tailwind-merge` (`cn`), `date-fns` |
| Language | TypeScript, `strict`, path alias `@/*` → `./src/*` |

## Rendering model

Every page (`src/app/**/page.tsx`, 37 files) begins with `"use client"` — the app is
effectively a client-rendered SPA wrapped in Next.js App Router. There are **no server
components** among the pages.

The root layout (`src/app/layout.tsx`) mounts one client provider:

```
<html> → <AuthProvider> → page
```

- `AuthProvider` (`src/lib/auth/context.tsx`) owns the Supabase browser client, session
  state, the logged-in user's profile/roles/permissions, and the selected organization/plant.
- `ERPLayout` (used by every protected page) guards the session and paints the shell:
  `Sidebar` (permission-filtered nav) + `Header` (org/plant switcher, user menu) + `<main>`.
- `/` redirects to `/dashboard` or `/login` once auth state resolves; `/login` renders a
  standalone sign-in card without the ERP shell.

## Data access layer

Three client factories, all reading `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`:

| File | Used for |
|---|---|
| `src/lib/supabase/client.ts` | Browser client (`createBrowserClient`) used by client pages/hooks/services |
| `src/lib/supabase/server.ts` | Server component client (`createServerClient` + `next/headers` cookies) |
| `src/lib/supabase/middleware.ts` | Session-refresh client used by `src/middleware.ts` |

All three return a **placeholder client** when the env vars are missing or unset
(so builds work before configuration). With a `"use client"` page this means queries simply
return no data until real credentials are configured.

Business logic lives in `src/services/*`; pages call service functions, which return
`{ data, error }` (or `{ data, count, error }`) tuples. See [SERVICES](SERVICES.md).

Database access is **untyped at runtime** — `src/types/database.ts` is a hand-written type
layer, not generated Supabase types — so service code casts query results.

## Authentication & authorization flow

1. **Middleware** (`src/middleware.ts`) — matches all paths except static assets; calls
   `updateSession()` which refreshes the auth cookie via `getUser()` and redirects unauthenticated
   users to `/login`. (Next.js warns the `middleware` file convention is deprecated in favor of
   `proxy`; not yet migrated — see [KNOWN-GAPS](KNOWN-GAPS.md).)
2. **AuthProvider bootstrap** — on mount (and on `SIGNED_IN`), it loads:
   - `profiles` row for the auth uid (`id = auth.users.id`),
   - `organizations` for `profile.organization_id`,
   - `plants` for the org (`status = 'active'`); selects `profile.plant_id` if present else the first plant,
   - `user_roles` (+ `roles`) for the user,
   - `role_permissions` (+ `permissions`) for those role ids, deduplicated by `(module, action)`.
3. **Permissions model** — a permission is `{ module, action }` (e.g. `{ work_order, view }`).
   `hasPermission(permissions, module, action)` (`src/lib/permissions/index.ts`) checks membership.
   The sidebar only renders entries the user can view. `usePermissions` exposes
   `canView/canCreate/canEdit/canDelete/canManage`. **Note:** pages themselves do not gate
   buttons/actions on permissions today — permission checks are used for navigation visibility only.

## Project layout

```
brilliants-maintenance-erp/
├─ src/
│  ├─ app/                  # App Router pages (all "use client")
│  ├─ components/
│  │  ├─ common/            # PageHeader, StatusBadge, EmptyState, Loading, MetadataRow
│  │  ├─ layout/            # ERPLayout, Sidebar, Header (ERP shell)
│  │  └─ ui/                # Form primitives (Button, Input, Card, DataTable, …)
│  ├─ hooks/                # useUser, usePermissions, useOrganization, useDebouncedValue
│  ├─ lib/
│  │  ├─ auth/context.tsx   # AuthProvider + useAuth
│  │  ├─ supabase/          # client, server, middleware factories
│  │  ├─ permissions/       # hasPermission & helpers
│  │  ├─ constants/         # APP_* + all status/type vocabularies + SIDEBAR_ITEMS
│  │  ├─ utils/             # cn, formatters (dates/currency/numbers), generateCode
│  │  └─ validation/        # zod schemas + shared BreakdownForm (breakdowns.tsx)
│  ├─ middleware.ts
│  ├─ services/             # per-module data access
│  └─ types/                # database, auth, common
├─ supabase/migrations/     # 20260921100000_spare_parts.sql, 20260923100000_app_schema.sql
└─ docs/                    # this documentation set
```

## Build & verification pipeline

The build gate is `npx tsc --noEmit` (0 errors) followed by `npm run build`
(currently 29 pre-routed + dashboard routes; both pass). `npm run lint` runs ESLint
(`eslint-config-next` core-web-vitals + typescript). See [CONFIG-ENV](CONFIG-ENV.md) and
[KNOWN-GAPS](KNOWN-GAPS.md).

The application assumes a single-organization deployment: queries are not org-scoped and
**RLS is intentionally not enabled** (see [DATABASE](DATABASE.md#design-decisions)).