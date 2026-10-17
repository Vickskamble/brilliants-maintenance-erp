# Brilliants Maintenance ERP

A multi-tenant Industrial Maintenance & Quality Management ERP built on
**Next.js 16 (App Router)** with a **Supabase** (Postgres + Auth) backend.

It covers the full maintenance lifecycle — equipment/assets, work orders,
preventive maintenance, breakdowns, inspections, calibration, shutdowns,
spare-parts inventory and procurement — plus a QMS suite (documents,
deviations, CAPA, change control), a configurable multi-level **approval
engine**, a shop-floor **kiosk PWA**, dashboards/reports and role-based access
control.

- **Production:** https://erp.brilliants.in
- **Kiosk:** https://erp.brilliants.in/kiosk

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js `16.3.5` (App Router, Turbopack) |
| UI | React `19.2.8`, Tailwind CSS v4, `lucide-react`, `recharts` |
| Language | TypeScript (`strict`) |
| Backend | Supabase — Postgres, Auth (email/password), RLS |
| Data access | `@supabase/supabase-js`, `@supabase/ssr` |
| Forms/validation | `react-hook-form` + `zod` |
| PDF export | `jspdf` |
| QR / scanning | `qrcode`, `html5-qrcode` |
| Email | `nodemailer` (SMTP) |
| Scheduling | `pg_cron` + secured API automation routes |

---

## Features

### Maintenance
- **Equipment / Assets registry** — hierarchy (plant → department → section →
  area → location), asset categories, criticality profiles, components, status
  history.
- **Work Orders** — creation, editing, status workflow, activities, spare
  consumption, and submit-for-approval.
- **Preventive Maintenance** — PM schedules (auto `MAINT-XXXX`), next-run
  tracking, pause/resume, due/overdue reminders.
- **Breakdowns** — logging, status updates, resolution.
- **Inspections** — scheduled inspections (auto `INSP-XXXX`), results, close-out.
- **Calibration** — instrument/gauge calibration schedules.
- **Shutdowns** — planned plant shutdown planning.

### Inventory & Procurement
- **Spare parts** — part master, reorder/min levels, per-plant stock,
  components, and a signed stock-movement ledger.
- **Material Requests & Purchase Orders** — request → approval → PO flow, GRN
  receipt, vendor evaluation.
- **Stock adjustments** — additional to the direct ledger, adjustments raised by
  users without approval rights are routed to a manager for approval before they
  affect stock.
- **PDF export** — Material Request and Purchase Order documents (`jsPDF`).

### Quality (QMS)
- **Documents** (with controlled release flow), **Deviations**, **CAPA** and
  **Change Control** — each with configurable multi-level approval.

### Platform
- **Approval engine** — database-driven `workflow_definitions` / `workflow_steps`
  / `workflow_instances` / `workflow_approvals`, supporting single, sequential and
  parallel (AND) steps, SLA due dates and rejection reasons.
- **Kiosk PWA** — a separate installable surface (`/kiosk`) for shop-floor staff
  (my work, new work, PM due) with its own web-app manifest.
- **Notifications** and **automations** — due reminders and approval SLA via
  `pg_cron` invoking token-protected API routes.
- **Settings** — users, roles & permissions, plants, organizations, master data,
  SLA, workflows, SSO, audit logs.
- **Multi-tenant** — organization + plant scoping enforced in the database
  through Row-Level Security.

---

## Roles & permissions

Authorization is **permission-based** (not by role name): `user_roles` grants a
role to a user, `role_permissions` maps a role to `module.action` permissions,
and the UI/DB check `<module>.<action>` (e.g. `work_order.approve`). Ship-with
roles:

| Role | Purpose | Permissions |
|---|---|---|
| `ADMIN` | Company administrator (system role, locked) | 80 |
| `SYSTEM_ADMIN` | Platform super admin (system role, locked) | 56 |
| `MAINTENANCE_MANAGER` | Department head / plant manager — approves every workflow, manages users & roles | 52 |
| `MAINTENANCE_OFFICER` | Creates/edits WOs, breakdowns, PM, inventory requests; submits for approval | 32 |
| `QA_MANAGER` | QMS approvals (release / closure) | 24 |
| `QA_OFFICER` | QMS reviews (investigation / plan / risk) | 24 |
| `VIEWER` | Read-only (system role, locked) | 18 |
| `TECHNICIAN` | Kiosk execution; creates WOs/breakdowns, completes PM | 13 |
| `DOC_CONTROLLER` | Document control | 5 |

Approval gates stay **permission-based** (`workflow_steps.approval_role_code`
is `NULL`): only roles holding `<module>.approve` may approve. In practice that
is `ADMIN`, `SYSTEM_ADMIN` and `MAINTENANCE_MANAGER` for the maintenance
workflows (work orders, material requests, purchase orders, stock adjustments).

---

## Getting started

### Prerequisites
- Node.js 20+ (Node 24 used in CI/prod)
- A Supabase project (Postgres + Auth)

### 1. Install
```bash
npm install
```

### 2. Configure environment
Create `.env.local` (see [Environment variables](#environment-variables)):
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

### 3. Apply database migrations
Migrations live in `supabase/migrations/` and build the schema **and** the
RLS/multi-tenant layer, so they must be applied in order.
```bash
npx supabase db push
```
(A small management-API SQL runner is also used in this project to apply
multi-statement migration files and record them in
`supabase_migrations.schema_migrations`.)

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000. Sign in with a Supabase Auth user that has a
`profiles` row and at least one `user_roles` grant; at least one `plants` row is
required.

---

## Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client | Supabase anon key (RLS-enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Privileged server operations (user invite, automations) |
| `SMTP_HOST` | server | Outgoing mail host |
| `SMTP_PORT` | server | Outgoing mail port |
| `SMTP_USER` | server | SMTP username |
| `SMTP_PASS` | server | SMTP password |
| `SMTP_FROM` | server | From address for notifications |
| `AUTOMATION_TOKEN` | server | Bearer token protecting `/api/automations/*` |
| `SSO_ENABLED` | server | Toggles the SSO settings surface |

`.env*` files are git-ignored and never committed. Only the anon key is exposed
to the browser; all privileged access is RLS-scoped.

When `NEXT_PUBLIC_SUPABASE_URL` is missing the Supabase client factories fall
back to a placeholder so `next build` still succeeds (with empty data at
runtime).

---

## Database

The schema is layered across ordered migrations in `supabase/migrations/`:

1. `app_base` → `spare_parts` → `app_schema` — core domain tables.
2. `multi_tenant_scoping` → `system_admin_role` → `rls_org_scoping` — the
   organization/plant tenancy model and Row-Level Security.
3. `pm_due_reminders` and account-seed migrations.
4. `qms_*` — roles/permissions, shared infra, the **approval engine**, and the
   QMS entities (documents, deviations, CAPA, change control).
5. `maintenance_roles_approval` — maintenance roles and permission-based
   approval gating.
6. `stock_adjustment_approval` — `stock_adjustments` table + inventory approval
   step.

Key points:
- **RLS is enabled** on tenant tables. Access is granted via helper functions
  (`app_current_org_id()`, `app_current_plant_id()`, `app_is_system_admin()`)
  that read `app_metadata` off the request JWT, plus the `erp_org_*` policy
  family.
- **Stock integrity is trigger-driven**: inserting into `stock_movements` keeps
  `spare_parts.current_stock` in sync (signed quantity), and in-flow movements
  (`purchase_in`/`return_in`/`transfer`) also sync per-plant `spare_part_stock`.
  Application code applies movements through a single helper
  (`src/services/stock-movements.ts`) so it never double-counts.
- **Approvals are data-driven**: configuring `workflow_definitions` +
  `workflow_steps` (from_status → to_status, `require_approval`) is all that is
  needed to add a new approval gate.

See [docs/DATABASE.md](docs/DATABASE.md) for the full reference.

---

## Kiosk (PWA)

The app installs/opens to the **ERP** (`/manifest.webmanifest`, `start_url:
/dashboard`). A separate shop-floor surface is served at `/kiosk` with its own
installable manifest (`public/kiosk-manifest.webmanifest`, `start_url: /kiosk`).
The kiosk shell is a dedicated client component
(`src/components/kiosk/kiosk-shell.tsx`).

---

## Deployment

Deployed on **Vercel**, aliased to **https://erp.brilliants.in**:

```bash
vercel deploy --prod --yes --scope <team>
```

Set the environment variables above in the Vercel project. Database migrations
are applied against the Supabase project (they are **not** run by the Vercel
build).

---

## Verification

```bash
npx tsc --noEmit   # type-check — 0 errors expected
npm run build      # production build — must pass (65 routes)
npm run lint       # eslint (next core-web-vitals + typescript)
```

---

## Project structure

```
brilliants-maintenance-erp/
├─ src/
│  ├─ app/                 # App Router routes (pages, API routes, manifests)
│  │  ├─ (maintenance)     # dashboard, equipment, work-orders, breakdowns,
│  │  │                    # maintenance, inspections, calibration, shutdowns
│  │  ├─ inventory/        # requests, orders, grn, vendor-evaluation, stock
│  │  ├─ spare-parts/      # part master, per-plant stock, stock movements
│  │  ├─ quality/          # documents, deviations, capas, change-control
│  │  ├─ kiosk/            # shop-floor PWA surface
│  │  ├─ settings/         # users, roles, plants, master-data, sla, workflows…
│  │  └─ approvals/        # approval inbox
│  ├─ components/          # layout, common UI, data-table, approvals, kiosk
│  ├─ hooks/               # react hooks
│  ├─ lib/                 # auth (context, query-scope), supabase clients,
│  │                       # validation (zod), pdf, constants, utils
│  ├─ services/            # data-access layer (per domain) + approval engine
│  └─ types/               # database & shared types
├─ supabase/
│  ├─ migrations/          # ordered SQL migrations (schema + RLS + workflows)
│  └─ seed.sql             # roles / reference bootstrap
├─ public/                 # static assets + kiosk manifest
└─ docs/                   # in-depth documentation (see below)
```

---

## Documentation

Everything detailed lives under [`docs/`](docs/):

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, rendering model, auth & authorization flow.
- [MODULES.md](docs/MODULES.md) — route inventory and the tables each touches.
- [WORKFLOWS.md](docs/WORKFLOWS.md) — end-to-end flows per module.
- [DATABASE.md](docs/DATABASE.md) — schema, triggers, migrations, design decisions.
- [SERVICES.md](docs/SERVICES.md) — the data-access layer, function by function.
- [UI-COMPONENTS.md](docs/UI-COMPONENTS.md) — component library and form primitives.
- [CONFIG-ENV.md](docs/CONFIG-ENV.md) — env vars, config files, scripts, middleware/proxy.
- [CONVENTIONS.md](docs/CONVENTIONS.md) · [DEVELOPMENT-RULES.md](docs/DEVELOPMENT-RULES.md) — coding conventions and rules.
- [KNOWN-GAPS.md](docs/KNOWN-GAPS.md) · [STATE-OF-REPO.md](docs/STATE-OF-REPO.md) — open items and current status.

> Some files under `docs/` predate the multi-tenant/RLS and QMS work and may lag
> the current schema; treat this README and the migrations as the source of truth
> when they disagree.

---

*Private / proprietary — © Brilliants. All rights reserved.*
