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

## Verification

```bash
npx tsc --noEmit
npm run build
```

`npm run build` (29 routes) and `npx tsc --noEmit` both pass.