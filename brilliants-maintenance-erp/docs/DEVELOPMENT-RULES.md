# Brilliants Maintenance ERP — Development Rules (Quick Reference)

> Canonical source of truth: [`docs/AI_DEVELOPMENT_RULES.md`](AI_DEVELOPMENT_RULES.md).
> This page is the one-glance summary; the canonical file governs when they differ.

**Golden rule:** do not break working software while adding new functionality.
Every change is **Small → Understandable → Testable → Reversible → Build-verified**.

## The 20 rules at a glance

1. **Core principle** — minimal, targeted changes. No unrelated rewrites, no schema changes
   without approval, no architecture swaps.
2. **Before changing** — understand structure; locate exact files; reuse existing
   components/utils/types/constants/helpers; verify imports exist; preserve conventions.
3. **File modification** — change only required files; prefer small edits over full-file
   rewrites; never silently drop features, queries, validation, permissions, auth, RLS logic,
   error/loading/empty states, or UI behavior.
4. **Code-gen safety** — never leave malformed/placeholder text; validate TS/TSX after edits
   (syntax, brackets, generics, JSX, imports).
5. **TypeScript / Next.js** — valid TS; avoid `any`; reuse existing types; never invent imports;
   respect app-router + client/server boundaries and existing `"use client"` markers; don't
   touch Next config unless needed.
6. **UI components** — search before creating; reuse; keep shared UI in `src/components/ui`;
   no duplicate Button/Input/Label/Select/Textarea/Card; never leave a broken import.
7. **Supabase/database** — never invent tables/columns, rename columns, change RLS or auth, or
   hardcode IDs/credentials without approval; check existing schema/types/client/queries/RLS
   assumptions first; state any schema change explicitly.
8. **Production data safety** — never hardcode secrets/keys/tokens/service-role keys/personal
   data; use env vars. (`NEXT_PUBLIC_SUPABASE_*` anon key only.)
9. **Error handling** — every data operation: loading, success, empty, error states +
   user-friendly message; never hide errors or fake success.
10. **Workflow** — Understand → Inspect → Plan minimal change → Implement → Type check →
    Build → Review → Commit.
11. **Build gate** — task is not done if `npm run build` fails; fix and rebuild until green.
    (This repo: `npx tsc --noEmit` then `npm run build` — there is no `typecheck` script.)
12. **One feature at a time** — small batches: Feature → typecheck → build → commit.
13. **Git rules** — checkpoint before major changes; review `status`/`diff`; clear commit
    messages; no destructive git unless requested; verify before reverting.
14. **Dependencies** — don't add packages out of convenience; check for equivalents; report
    every added dependency; never silently change versions.
15. **Security** — never weaken auth/authorization/RLS; no secrets in client code; no insecure
    production workarounds.
16. **No fake implementation** — never claim implemented when mocked; distinguish UI-only /
    mock / local / Supabase-connected / production-ready; no fake DB records for demos unless
    explicitly requested.
17. **No unrelated UI changes** — preserve layout, colors, spacing, nav, typography, existing
    interactions when fixing functionality.
18. **Response format** — end every task with: **Modified Files / Created Files / Dependencies
    Added / Database Changes / Validation (typecheck + build) / Notes**.
19. **Stop conditions** — pause and ask when: unknown schema, destructive migration, business
    logic conflict, missing credentials, possible data loss/corruption, or ambiguous behavior
    where guessing could break the system.
20. **Golden rule** — see top of page.

## Done checklist

Existing code inspected · only required files modified · no unrelated UI changes · no fake
data · no secrets exposed · components reused · imports verified · TS valid · error/loading/
empty states handled · database changes reviewed · typecheck + build passed · changed files
reported · new dependencies reported · git checkpoint created.

**Not satisfied? The task isn't finished.**

## Repo-specific adaptations

- Validation commands are `npx tsc --noEmit` and `npm run build` (no `typecheck` script;
  rule 11 / rule 10 note this).
- Reporting format (rule 18) is used verbatim in this repo, e.g. at the end of every task a
  fixed end-state block: modified/created/database/validation/notes.