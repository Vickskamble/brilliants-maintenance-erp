# ERP-wide Access Control + Approval Subsystem

> Status: **Planned** (saved for execution after current in-flight work is finished).
> This blueprint targets a complete ERP — Maintenance is the first reference module.
> Benchmarking: Odoo (Groups/Access Rights/Approvals), Zoho CRM (Roles/Profiles/Approval Processes),
> SAP S/4HANA (Release Strategy + Approval Workflows).

## 1. Goal

A reusable subsystem where every module **registers** (not per-module hardcoding):
- Access Control (who can do what on which records)
- Document Lifecycle / allowed transitions
- Approval engine (submit → step-wise approve/reject → side-effects)
- Worklist + audit trail

Current modules (Maintenance: Work Orders, Material Requests, Purchase Orders, GRNs) go first;
future modules (HR, Finance, Purchase/Sales, Inventory adjustments) plug in via registration.

## 2. Four pillars

1. **Access Control** — `roles` + `permissions(module, action)` + matrix editor.
   Canonical action vocabulary: `view, create, edit, delete, approve, reject, cancel, close, post, receive, print, export`.
   Every button gates via one helper `canAction(module, action)`.
2. **Lifecycle / Transitions** — existing `workflow_statuses` + `getAllowedTransitions` (workflow engine).
   Button visibility = allowed-transition × permission × self-approval-guard × pending-lock.
3. **Approval Engine** — existing `workflow_definitions → workflow_steps → workflow_instances(entity_type, entity_id polymorphic) → workflow_approvals(audit)`.
   Enhance step config; no model rewrite.
4. **Worklist + Audit** — generic My Approvals / My Requests + sidebar badges + `activity_log` table.

## 3. Phase 1 — Engine core + Zoho-style admin UI

### DB (additive, `supabase/approval_additions.sql`)
- `workflow_steps` add columns:
  - `approver_user_id uuid`
  - `require_reject_reason boolean NOT NULL DEFAULT false`
  - `condition jsonb`
  - `notify_role_codes text[]`
- New table `activity_log(id, organization_id, user_id, module, action, entity_type, entity_id, metadata jsonb, created_at)` + RLS policy.
- Seed `permissions`: `inventory:approve`, `inventory:reject` (+ other modules as they register).

### Admin UI (all gated by `settings:edit`; default only ADMIN)
- **New Role Details page** `/settings/roles/[id]` (Zoho profile-page style), opened from Roles list:
  - Role info header + System badge
  - **Permission matrix** — module groups × action checkboxes; save writes `role_permissions` delta (applies immediately)
  - Users assigned to role (+ add/remove)
  - System roles (ADMIN etc.) permissions disabled + locked badge
  - Change history (activity_log)
- **User Details** (from Users list): assign roles + plant + status
- Permissions catalogue page stays as read-only reference

### Wiring (Maintenance reference)
- MR/PO: Submit/Approve/Reject gated by `inventory:approve` + allowed transition
- Record `approved_by` / `rejected_by` + mandatory reject reason
- Self-approval guard (creator cannot approve own document)
- Pending-lock: approved/ordered documents are not editable/deletable

## 4. Phase 2 — Maintenance wiring complete

- Register `material_request`, `purchase_order`, `grn_receipts` (+ polish work_order) in the engine:
  - submit → create `workflow_instances`; pending approver = step's role or user
  - final-approval **side-effects** (runtime callbacks, module-defined):
    - MR final approve → status `approved`
    - PO final approve → status `ordered` AND linked MR → `ordered`
    - GRN post → stock movement (already in `postGrn`)
- Delete allowed on draft/submitted/rejected only; forbidden on approved/ordered (engine rule)

## 5. Phase 3 — Worklist + audit UI

- **My Approvals** (`/approvals`): pending items across all registered entity types + sidebar badge count
- **My Requests**: user's submissions + status timeline
- Reusable **ApprovalPanel** component (history + approve/reject + reason) embedded in MR/PO/WO detail pages
- Settings → **Activity Log** page (audit trail)

## 6. Phase 4 — Intelligence (server-side only)

- **Conditions / thresholds**: `condition jsonb` e.g. `{"amount_gte": 50000}`; engine evaluates at submit
  via RPC `erp_evaluate_workflow` (never client-side)
- **Approver = specific user** (Phase 1 UI) + manager rule via `users.reports_to` + `departments` tables
  — "owner's manager" evaluation
- Delegate + revoke (Odoo-style) + rework loop (rejected → draft → resubmit)

## 7. Phase 5 — Template + reference module

- `docs/APPROVAL_INTEGRATION.md`: 7-step guide for registering a new module
  (entity_type → statuses → steps → side-effect handler → menu/tab → PermissionGate → worklist)
- Reference mini-module implementing the full flow (e.g. "Stock Adjustment Request")

## 8. Locked decisions

- Approver rule v1: **Role + User**
- Thresholds: **Phase 4, server-side**
- Permission matrix UI: **Zoho-style dedicated Role Details page** (not an inline modal)
- Who manages: **ADMIN** via `settings:edit`; system roles locked from edits; eventual `access:manage` /
  `approval:manage` sub-permissions for delegation; every admin change logged to `activity_log`

## 9. Known admin-surface gaps (pre-plan)

- No user→role assignment UI (`user_roles` only read in auth context)
- No role→permission assignment UI (`role_permissions` come from SQL seeds only)
- Permissions page is view-only catalogue
- Approve/Reject buttons not permission-gated (no `inventory:approve` permission)
- MR/PO/GRN not wired to the workflow engine (only WO partially)
- No reject reason, no self-approval guard, no pending-lock
- No worklist, no notifications, no audit UI

## 10. Gates & protocol

- Per commit: `npx tsc --noEmit` + `npm run build` EXIT=0; one page/feature per commit
- Per phase: authenticated SSR smoke on new routes, then user browser-verification
  **while file edits are frozen**
- DB changes: additive SQL files committed under `supabase/`, applied via admin API

## 11. Execution order

1. P1 — engine core + admin UI (this plan's doc commit is the first artifact)
2. P2 — maintenance wiring complete
3. P3 — worklist + audit UI
4. P4 — intelligence (thresholds, manager rules, delegate/revoke)
5. P5 — integration guide + reference mini-module