# Brilliants Maintenance ERP — Configuration & Environment

## npm scripts

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Dev server (Turbopack) |
| `build` | `next build` | Production build — the build gate that must pass |
| `start` | `next start` | Serve the production build |
| `lint` | `eslint` | ESLint (`eslint-config-next` core-web-vitals + typescript) |

There is no `typecheck` script; verification is `npx tsc --noEmit`.

## Dependencies

Runtime (`package.json`):

- `next@16.3.5`, `react@19.2.8`, `react-dom@19.2.8`
- `@supabase/supabase-js@^2.116.0`, `@supabase/ssr@^0.12.7`
- `react-hook-form@^7.88.0`, `@hookform/resolvers@^5.9.1`, `zod@^4.6.5`
- `@tanstack/react-table@^9.2.4` (installed; the app ships its own lightweight `DataTable`)
- `clsx@^2.1.1`, `tailwind-merge@^3.7.0`, `date-fns@^4.4.0`, `lucide-react@^1.47.0`

Dev:

- `typescript@^5`, `eslint@^9`, `eslint-config-next@^15.3.4`
- `tailwindcss@^4`, `@tailwindcss/postcss@^4`
- `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`

## Environment variables

Required for real data (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

All three Supabase client factories (`src/lib/supabase/{client,server,middleware}.ts`)
fall back to a placeholder client when `NEXT_PUBLIC_SUPABASE_URL` is missing, empty, or equal
to `your_supabase_url` — this lets `next build` succeed pre-configuration, at the cost of empty
query results at runtime.

No server-side secrets are used; the anon key is the only key and it is `NEXT_PUBLIC_*`.
`.env*` files are git-ignored (root `.gitignore`).

## Config files

| File | Contents |
|---|---|
| `tsconfig.json` | `strict`, `moduleResolution: bundler`, `jsx: react-jsx`, path alias `"@/*": ["./src/*"]`, `incremental`, includes `.next/types` |
| `next.config.ts` | Empty config (`NextConfig` default) — no rewrites, images, or experimental flags |
| `postcss.config.mjs` | `@tailwindcss/postcss` (Tailwind v4) |
| `eslint.config.mjs` | `eslint-config-next` core-web-vitals + typescript, ignores `.next/out/build/next-env.d.ts` |
| `src/app/globals.css` | `@import "tailwindcss"` + `--background`/`--foreground` theme tokens |
| `gitignore` | Lives at repo root (`node_modules/`, `.next/`, `out/`, `build-log*.txt`, `.env*`, `*.tsbuildinfo`, `*.log`, `*.pem`, `.vercel`) |
| `package-lock.json` | Lockfile |

## Middleware

`src/middleware.ts` exports `middleware` (calls `updateSession` from
`src/lib/supabase/middleware.ts`) with a matcher that excludes `_next/static`,
`_next/image`, `favicon.ico`, and common image extensions.

It refreshes the Supabase session cookie and redirects unauthenticated requests to `/login`.
When env vars are missing the middleware short-circuits and lets requests through (build-safe).

> **Deprecation note:** Next.js 16 prints a non-blocking warning that the `middleware`
> convention is deprecated in favor of `proxy` (`src/proxy.ts`). Not migrated yet — see
> [KNOWN-GAPS](KNOWN-GAPS.md).

## Verify

```bash
npx tsc --noEmit   # 0 errors expected
npm run build      # 29+ routes, success expected
```