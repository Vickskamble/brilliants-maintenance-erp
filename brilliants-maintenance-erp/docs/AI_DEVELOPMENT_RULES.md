# AI DEVELOPMENT RULES
## Brilliants Maintenance ERP

> **Purpose:** These rules must be followed whenever AI is used to create, modify, debug, refactor, or extend this project.

---

## 1. CORE PRINCIPLE

**Make minimal, targeted changes.**

AI must modify only what is required for the requested task.

Do NOT:
- Rewrite unrelated files
- Change working functionality without permission
- Refactor the whole project unnecessarily
- Change the database schema without explicit approval
- Replace existing architecture just because another approach is available

---

## 2. BEFORE MAKING CHANGES

Before editing code, AI must:

1. Understand the existing project structure.
2. Identify the exact files related to the requested task.
3. Check existing reusable components, utilities, types, constants, and database helpers.
4. Check existing patterns before creating new ones.
5. Confirm that required imports/files actually exist.
6. Preserve existing naming conventions and architecture.

If the required context is missing, inspect the relevant files first instead of guessing.

---

## 3. FILE MODIFICATION RULES

### 3.1 Modify only required files

Every task must have a clear list of files that may be changed.

If another file must be changed, explain why before making the change.

### 3.2 Do not rewrite complete files unnecessarily

Prefer a small targeted change over replacing an entire file.

### 3.3 Preserve existing code

Do not silently remove:
- Features
- Database queries
- Validation
- Permissions
- Authentication
- RLS-related logic
- Error handling
- Loading states
- Empty states
- Existing UI behavior

---

## 4. AI CODE GENERATION SAFETY

AI-generated code must never introduce malformed or unrelated text.

Do NOT leave artifacts such as:

```text
nulltot nested>
[]osse
[]apse
PAYLOAD_MAX_REDACTED
Recall out of bounds
```

Any generated code must be valid TypeScript/JavaScript/TSX before the task is considered complete.

After editing a file, inspect the affected section for:
- Broken syntax
- Duplicate code
- Missing brackets
- Missing parentheses
- Incorrect generics
- Broken JSX
- Corrupted text
- Invalid imports
- Accidental placeholders

---

## 5. TYPESCRIPT / NEXT.JS RULES

1. Maintain valid TypeScript.
2. Do not use `any` unless absolutely necessary and justified.
3. Reuse existing project types.
4. Do not invent interfaces when an existing type already exists.
5. Do not invent imports.
6. Do not import components that do not exist.
7. Follow the existing Next.js App Router structure.
8. Respect Server Component / Client Component boundaries.
9. Preserve existing `"use client"` requirements.
10. Do not change Next.js configuration unless required.

---

## 6. UI COMPONENT RULES

Before creating a UI component:

1. Search for an existing component.
2. Reuse it if available.
3. Keep shared UI components inside the established UI component directory.
4. Do not create duplicate Button, Input, Label, Select, Textarea, Card, etc.

If a component is imported but missing, either:
- Create the required component following the project's existing pattern, or
- Use an existing equivalent component.

Never leave a broken import.

---

## 7. SUPABASE / DATABASE RULES

The project uses Supabase.

### NEVER:
- Invent database tables
- Invent columns
- Rename columns without approval
- Change RLS policies without approval
- Change authentication logic without approval
- Insert fake production data
- Hardcode production IDs or credentials
- Expose secrets or service-role keys in client code

### Before database-related changes:

Check:
- Existing schema
- Existing types
- Existing Supabase client
- Existing queries
- Existing RLS assumptions

If a schema change is genuinely required, clearly state it before implementation.

---

## 8. PRODUCTION DATA SAFETY

Never hardcode real production data into application code.

Do not commit:
- API keys
- Passwords
- Tokens
- Supabase service-role keys
- Private credentials
- Personal sensitive information

Use environment variables where appropriate.

---

## 9. ERROR HANDLING

Every new data operation should consider:

- Loading state
- Success state
- Empty state
- Error state
- User-friendly error message

Do not hide errors silently.

Do not use fake success messages.

---

## 10. DEVELOPMENT WORKFLOW

Follow this workflow for every meaningful change:

```text
Understand
   ↓
Inspect existing code
   ↓
Plan minimal change
   ↓
Implement
   ↓
Type check
   ↓
Build
   ↓
Review changed files
   ↓
Commit
```

Recommended commands:

```bash
npm run typecheck
npm run build
```

If the project does not have a `typecheck` script, use the project's existing TypeScript validation command.

---

## 11. BUILD GATE

A task is NOT complete if the production build fails.

Before declaring success:

```bash
npm run build
```

must pass, unless the user explicitly asks for an incomplete/debugging state.

If build fails:
1. Fix the errors caused by the current change.
2. Run the build again.
3. Continue until the build passes or clearly report the remaining blocker.

---

## 12. ONE FEATURE AT A TIME

Do not make large batches of unrelated changes.

Preferred:

```text
Feature A
 ↓
Typecheck
 ↓
Build
 ↓
Commit

Feature B
 ↓
Typecheck
 ↓
Build
 ↓
Commit
```

Avoid:

```text
Feature A + B + C + D + E
 ↓
Build
 ↓
20 errors
```

---

## 13. GIT RULES

Use Git for meaningful project changes.

Before a major change:

```bash
git status
git add .
git commit -m "Checkpoint before <change>"
```

After a successful change:

```bash
git status
git diff
git add .
git commit -m "<clear description>"
```

Never use destructive Git commands unless explicitly requested.

Before reverting anything, verify what will be lost.

---

## 14. DEPENDENCY RULES

Do not install a package just because it is convenient.

Before adding a dependency:
1. Check whether the project already has an equivalent package.
2. Check whether the functionality can be implemented with existing dependencies.
3. Add the dependency only when justified.
4. Report every newly added dependency.

Never silently modify package versions.

---

## 15. SECURITY RULES

Never weaken security to make a feature work.

Do NOT:
- Disable authentication
- Disable authorization
- Bypass RLS
- Expose private database data
- Put secrets in client-side code
- Disable security checks
- Add insecure temporary production workarounds

Any security-sensitive change must be explicit.

---

## 16. NO FAKE IMPLEMENTATION

Do not claim a feature is implemented when it is only mocked.

Clearly distinguish:

- UI only
- Mock data
- Local functionality
- Supabase-connected functionality
- Production-ready functionality

Do not create fake database records to make dashboards look complete unless explicitly requested for demo purposes.

---

## 17. NO UNRELATED UI CHANGES

When fixing functionality:

**Do not redesign the UI unless requested.**

Preserve:
- Layout
- Colors
- Spacing
- Navigation
- Typography
- Existing interactions

Only change UI elements necessary for the requested feature or bug fix.

---

## 18. AI RESPONSE FORMAT

At the end of every development task, AI should report:

### Modified Files
- `path/to/file`
- `path/to/file`

### Created Files
- `path/to/file`

### Dependencies Added
- None / list packages

### Database Changes
- None / describe changes

### Validation
- Typecheck: PASS / FAIL
- Build: PASS / FAIL

### Notes
Briefly explain anything important or any remaining issue.

---

## 19. STOP CONDITIONS

AI must stop and ask for clarification when:

- The requested change requires an unknown database schema.
- A destructive migration appears necessary.
- Existing business logic conflicts with the requested behavior.
- Required credentials/secrets are missing.
- The task could delete or corrupt existing data.
- The requested behavior is ambiguous and guessing could break the system.

Do not guess on destructive or business-critical operations.

---

## 20. FINAL GOLDEN RULE

> **Do not break working software while adding new functionality.**

Every change should be:

**Small → Understandable → Testable → Reversible → Build-verified**

---

## QUICK CHECKLIST

Before saying "Done":

- [ ] Existing code inspected
- [ ] Only required files modified
- [ ] No unrelated UI changes
- [ ] No fake production data
- [ ] No secrets exposed
- [ ] Existing components reused
- [ ] Imports verified
- [ ] TypeScript valid
- [ ] Error/loading/empty states handled
- [ ] Database changes reviewed
- [ ] `npm run typecheck` passed
- [ ] `npm run build` passed
- [ ] Changed files reported
- [ ] New dependencies reported
- [ ] Git checkpoint created

**If any applicable item is not satisfied, the task is not finished.**

---

## 21. PHASED ROADMAP — ERP FOUNDATION (NON-BREAKING INCREMENTS)

> **Goal:** Upgrade the app to an enterprise ERP interaction layer (SAP / Zoho / Odoo /
> ERPNext level) **without breaking or corrupting any working code, table, service, page,
> or workflow.**
>
> Every phase below must follow the golden rule: **incremental, additive, rollback-able**.
> Do not remove, rename, or rewrite existing functionality in one shot.

### 21.1 Verified baseline (2026-09-23 audit)

- `@tanstack/react-table` `^9.2.4` is installed but **unused** — available for `ERPDataTable`.
- No charting library is installed (dashboard charts are hand-rolled divs).
- `src/hooks/use-permissions.ts` provides `canView/canCreate/canEdit/canDelete/canManage`,
  but pages do not consistently enforce them on direct routes/actions.
- Service layer is duplicated: `services/equipment.ts` + `services/equipment/`,
  `services/work-orders.ts` + `services/work-orders/`, `services/spare-parts.ts` +
  `services/spare-parts/`. Consolidate **only after** dependency mapping (see Phase 9).
- Domain/DB foundation is strong (departments → sections → areas → locations →
  equipment; WO → activities → stock movements → status history).

### 21.2 Explicit NON-GOALS (do NOT do in any phase)

- ❌ Rewrite the existing `DataTable`, services, DB schema, or all pages together.
- ❌ Rename/delete existing DB tables, columns, or roles (only additive SQL).
- ❌ Replace existing *working* pages/forms with new UIs in one batch.
- ❌ Increase work without verification — one feature per commit per build.

### 21.3 Standard migration strategy for every feature

1. Existing system backup / git checkpoint
2. Build new component/service/table (additive)
3. Typecheck + build green
4. Verify existing modules unaffected
5. Migrate ONE page (pilot = Equipment list)
6. Verify + commit
7. Replicate to next page
8. Never multi-page or multi-module in a single change

### 21.4 Phase plan

| Phase | Focus | Key deliverables | Risk |
|-------|-------|------------------|------|
| 0 | Safety baseline | branch strategy, `npx tsc --noEmit` + `npm run build` green, current-stable checkpoint | 🟢 |
| 1 | ERP UI foundation | `src/components/erp/` set + reusable `ERPDataTable` (search/filter/sort/select/bulk/column mgr/saved views/export/pagination/row actions) using TanStack Table; existing `DataTable` untouched | 🟢 |
| 2 | Data-entry & master-detail | `ERPModal`, `ERPDrawer`, `ERPForm`, quick-add; `ERPDetailLayout`, `ERPTabs`, `ERPLineItemTable`, `ERPActivityTimeline`, `ERPAttachmentPanel`, `ERPAuditHistory` | 🟢 |
| 3 | Global search | `src/components/search/` dialogs + `src/services/search/`, Ctrl+K, module-scoped results (WO/Equipment/Spare/Vendor/PM/Breakdown) | 🟢 |
| 4 | Security & context | route/action permission guards; plant scoping through shared query context; master-data UI (departments/sections/areas/locations/cost centers/asset categories/criticality/BOM); RLS hardening (additive, reviewed) | 🟡 |
| 5 | Workflow & SLA | additive `workflow_definitions/steps/instances/approvals` + `sla_rules`; reuse current statuses; allowed-transition checks | 🟡 |
| 6 | Multi-view UI | `ERPKanban` (WO), `ERPCalendar` (PM/Calibration/Shutdown), `ERPAssetTree` (plant→department→…→equipment→components), `ERPGantt` (shutdown) — presentation layers only | 🟡 |
| 7 | Inventory + procurement | MR/requisition → PO → GRN over existing `stock_movements` ledger; vendor evaluation; existing inventory engine reused | 🟡 |
| 8 | Notifications | additive `notifications` + `notification_preferences`; engine for PM_DUE / PM_OVERDUE / CALIBRATION_DUE / WO_ASSIGNED / BREAKDOWN_SLA / LOW_STOCK / APPROVAL_REQUIRED; in-app first, email later | 🟡 |
| 9 | Analytics + platform | reports engine (MTBF/MTTR/downtime/cost/PM compliance/SLA/Pareto) with a real chart library; export (CSV/Excel/PDF/Print); scheduled reports; generic CSV import; central `attachments` + `audit_logs`; service-layer consolidation; mobile/i18n/currency polish | 🟡/🟢 |

### 21.5 Per-phase guardrails

- **Phase 1**: build `ERPDataTable` standalone; migrate Equipment as pilot only; keep
  `src/components/ui/data-table.tsx` intact for other modules.
- **Phase 2**: new form/detail components are additive; existing `/new` and detail routes stay.
- **Phase 4**: permission checks are UI enforcement; server-side security remains Supabase
  RLS — never weaken auth/RLS to ship a screen.
- **Phase 5**: workflow tables are new; never alter existing WO status values relied on by
  pages/history/queries.
- **Phase 9**: consolidate duplicate services only after mapping all imports; keep both
  compatible until migration verified.

### 21.6 PHASE GATE — next phase starts ONLY after this phase is build-green

> **Hard rule:** `npx tsc --noEmit` **AND** `npm run build` must both PASS, and the completed
> phase work must be committed, **before** any work on the next phase begins.

Phase N is considered **DONE** and Phase N+1 may **only** start when ALL of these hold:

- [ ] All Phase N deliverables merged/committed (existing modules verified unaffected)
- [ ] `npx tsc --noEmit` → PASS
- [ ] `npm run build` → PASS
- [ ] No open broken imports, lint-blocking errors, or TODOs left behind by the phase
- [ ] Phase pilot page (Equipment) verified working in browser

**If any gate fails → fix, don't proceed.** No skipping phases, no parallel phase work,
no "start next phase while previous build is red".
