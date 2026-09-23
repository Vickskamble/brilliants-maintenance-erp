# Brilliants Maintenance ERP

Next.js (App Router) maintenance management app with Supabase backend:
equipment registry, work orders, breakdowns, preventive-maintenance schedules,
inspections, spare-parts inventory, vendors, reports and a live dashboard.

## Stack

- Next.js 16 (Turbopack), TypeScript (`strict`), Tailwind CSS
- Supabase (auth + Postgres via `@supabase/supabase-js`)
- `react-hook-form` + `zod` for form validation

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with Supabase credentials:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. Apply the database migrations (from `supabase/migrations/`):

   ```bash
   npx supabase db push
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

Open http://localhost:3000. Sign in with a Supabase auth user; the app
expects a `profiles` row for that user and at least one `plants` row to
function.

## Database

- Migrations live in `supabase/migrations/`:
  - `20260921100000_spare_parts.sql` — inventory module
  - `20260923100000_app_schema.sql` — everything else the app queries
- Schema is deliberately "app-first": tables/columns mirror what the app
  reads and writes (see `src/types/database.ts`). RLS is not enabled;
  okay for a single-organization deployment.

## Documentation

Everything is documented under `docs/`:

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — stack, rendering model, auth & authorization flow,
  project layout.
- [MODULES.md](docs/MODULES.md) — every route, what it does, and which DB tables it touches.
- [WORKFLOWS.md](docs/WORKFLOWS.md) — end-to-end flows per module.
- [DATABASE.md](docs/DATABASE.md) — schema reference, triggers, migrations, design decisions.
- [SERVICES.md](docs/SERVICES.md) — the data-access layer, function by function.
- [UI-COMPONENTS.md](docs/UI-COMPONENTS.md) — component library and form primitives.
- [CONFIG-ENV.md](docs/CONFIG-ENV.md) — env vars, config files, scripts, middleware.
- [CONVENTIONS.md](docs/CONVENTIONS.md) — coding conventions and dev rules.
- [DEVELOPMENT-RULES.md](docs/DEVELOPMENT-RULES.md) — one-glance summary of the 20 AI
  development rules (canonical: `docs/AI_DEVELOPMENT_RULES.md`).
- [KNOWN-GAPS.md](docs/KNOWN-GAPS.md) — partial tabs, inconsistencies, and a prioritized TODO.
- [STATE-OF-REPO.md](docs/STATE-OF-REPO.md) — current module/database status snapshot.

## Verification

```bash
npx tsc --noEmit
npm run build
```

`npm run build` (29 routes) and `npx tsc --noEmit` both pass.