# Phase 5 — Workflow & SLA

> Roadmap: `docs/AI_DEVELOPMENT_RULES.md` §21.4 (Phase 5). Status: **DONE** (committed `8a2c390`, `4bfec1d`, `ca43e7c`, browser-verified).
> Har section me ek pura **worked example** hai — real values ke saath, start se end tak.

---

## 1. Kya banaya (with a one-line example)

A configurable **status-transition workflow engine** + **SLA rules**, on top of existing statuses. No existing table/status changed.

> Example: pehle WO status dropdown me **saare 11 statuses** dikhte the aur koi bhi badal sakta tha.
> Ab admin flow banata hai → technician ko dropdown me sirf wo statuses dikhte hain jo flow define karta hai.

---

## 2. Character roles (kis ke liye, with example)

| User | Where | Example of what they do |
|---|---|---|
| **Admin / Maintenance Manager** | `/settings/workflows` | Flow banata hai: `draft → submitted → approved` (submitted par approval required) |
| **Admin / Plant Manager** | `/settings/sla` | WO-high-priority ke liye: completion 8 hours |
| **Technician** | WO Change Status page | WO-2026-001 ko `draft` se `submitted` me move karta hai |
| **Future: Engineer/Approver** | workflow_instances/approvals | `submitted` par approval request aata hai, wo decide karta hai |

---

## 3. DB tables — EACH WITH A REAL ROW EXAMPLE

### 3.1 `workflow_definitions` (flow ka header)
**Kaise apply:** `/settings/workflows` → New Workflow form se.
**Kyu:** kisi module ke liye kaunsi flow exist karti hai, active hai ya nahi, kisme (org/plant).

> **Example row (admin form submit se insert hoti hai):**
> | id | organization_id | plant_id | module | name | description | status |
> |---|---|---|---|---|---|---|
> | `a1b2…` | `11111…111` | `22222…222` | `work_order` | `WO Repair Approval` | `Partner-1 fix` | `active` |

### 3.2 `workflow_steps` (har transition)
**Kaise apply:** usi form ke dynamic "step" rows; save = delete-all + re-insert.
**Kyu:** `from_status → to_status` rules, order, approval flag.

> **Example rows (wo same flow ke liye):**
> | id | workflow_definition_id | order_index | step_name | from_status | to_status | require_approval | approval_role_code |
> |---|---|---|---|---|---|---|---|
> | `s1…` | `a1b2…` | 0 | `Dispatch` | `draft` | `submitted` | **false** | – |
> | `s2…` | `a1b2…` | 1 | `Approve work` | `submitted` | `approved` | **true** | `approver` |

### 3.3 `workflow_instances` (engine-ready; abhi UI nahi)
**Kyu:** har running record ki position track karna.

> **Example (future): wo WO-2026-001 submitted hote hi → instance `active`, `current_step_id=s2…`, `current_status=submitted`.**

### 3.4 `workflow_approvals` (engine-ready)
**Kyu:** approve/reject decisions + `requested_by/approved_by`.

> **Example (future): instance par approval row → `status='pending'`, request `approved_by=…` par decide hoga.**

### 3.5 `sla_rules`
**Kaise apply:** `/settings/sla` → Add SLA Rule.
**Kyu:** module-level target times.

> **Example row:**
> | id | module | sla_type | priority | duration_minutes | escalation_role_code | status |
> |---|---|---|---|---|---|---|
> | `r1…` | `work_order` | `completion` | `high` | `480` | `sup` | `active` |

> ⚙️ SQL: `supabase/workflow_additions.sql` (idempotent), RLS `erp_allow_access_*` — same as Phase 4. Commit `8a2c390`.

---

## 4. Code layer — EACH FUNCTION WITH EXAMPLE

`src/services/workflow.ts`

| Function | Called from | Example use |
|---|---|---|
| `listWorkflowDefinitions(scope)` | `/settings/workflows` list | Kartaa `WO Repair Approval` + uske 2 steps nested order se |
| `createWorkflowDefinition(scope, input)` | Builder form | Inserts def + steps; agar steps fail → **def bhi auto-delete** (atomic) |
| `updateWorkflowDefinition` / `replaceWorkflowSteps` | Builder edit | Name/desc update; steps whole-replace |
| `setWorkflowDefinitionStatus` | Power toggle | `active → inactive` = **instant kill-switch** |
| `deleteWorkflowDefinition` | Delete | Steps `ON DELETE CASCADE` delete ho jaate hain |
| **`getAllowedTransitions(module, currentStatus)`** | WO Change Status page | Core guard (section 5) |
| SLA CRUD (`list/create/update/toggle`) | `/settings/sla` | Rule add/edit/toggle |

---

## 5. `getAllowedTransitions` — FULL WORKED QUERY

Admin ne `WO Repair Approval` (`active`) create kiya jisme:
- step A: `draft → submitted`
- step B: `submitted → approved`

**Scenario 1 — technician WO-2026-001 (status `draft`) par Change Status kholta hai:**
```ts
getAllowedTransitions("work_order", "draft")
```
Query (exact):
```sql
SELECT to_status FROM workflow_steps ws
JOIN workflow_definitions wd ON wd.id = ws.workflow_definition_id
WHERE wd.module = 'work_order'
  AND wd.status  = 'active'
  AND ws.from_status = 'draft';
-- result: ['submitted']   → dropdown: current(draft) + submitted
```

**Scenario 2 — same WO, ab `submitted`:** result → `['approved']` (step B), plus approval flag true.

**Scenario 3 — koi WO workflow exist nahi (ya flow inactive):**
```sql
-- 0 rows → function returns []
-- → dropdown extra kuch nahi filter hota: saare 11 statuses, behavior exactly pehle jaisa
```

> **Rule:** `[]` = "no restriction". Yehi fallback makes the whole feature **additive and break-safe**.

---

## 6. BUILDERS IN THE BROWSER — STEP BY STEP (example-filled)

### Scenario: "WO Repair Approval"

**Step 1 — Admin, `/settings/workflows`:**
- Module dropdown → **Work Order**
- Name → `WO Repair Approval`, Description → `Partner-1 fix`
- Row 1: name `Dispatch`, From `draft`, To `submitted`, approve **off**
- Row 2: name `Approve work`, From `submitted`, To `approved`, approve **on** → role `approver`
- Create → card: badge `Work Order`, `2 steps`, green **active**. Chevron par steps show.

**Step 2 — Live preview panel (demo/QA saath me):**
- Module `Work Order` + Status `draft` → blue badge **`submitted`**
- Status `submitted` → badge **`approved`**
- Module `Breakdown` (no flow) → **"No restriction (all transitions allowed)"**

### Scenario: SLA rule
**Step 1 — Admin, `/settings/sla`:** + Add → Module `Work Order`, Type `Completion`, Priority `High`, Duration `480`, Escalation `sup` → Create → row visible, green `active`.
**Step 2 — Edit → duration `240`** → row updates. **Toggle** → `inactive`.

---

## 7. USER EXPERIENCE ON WO STATUS PAGE — before vs after

| | Before (no flow) | After (active flow) |
|---|---|---|
| `/work-orders/…/status` dropdown | 11 statuses | `draft` (current) + `submitted` (allowed) |
| Hint | – | "Workflow restricts transitions to: **submitted**" (badge) |
| Unauthorized move (e.g. `draft → completed`) | Possible | Option existing hi nahi → **impossible** |

> Save ke baad WO ka status change hokar detail par navigate hota hai; resubmit karne par ab `draft + approved` (step 2) dikhte hain.

---

## 8. Commits

| Commit | Content |
|---|---|
| `8a2c390` | Additive tables + RLS (`supabase/workflow_additions.sql`) |
| `4bfec1d` | `src/services/workflow.ts` + builder + SLA pages + settings hub cards |
| `ca43e7c` | Allowed-transition check wired into WO Change Status page |

## 9. QA proof

Smoke (temp rows cleaned): def+steps insert → `draft→submitted` nested query hit → cascade delete → SLA insert/delete. `tsc` + `build` PASS, settings routes SSR 200.

**Browser checklist** — 1) workflow create (+ preview: draft→submitted, submitted→approved, breakdown→"No restriction"), 2) WO status dropdown restricted + hint, save works, next step options, 3) control: **inactive → saare statuses wapas**, 4) SLA CRUD, 5) settings hub 7 cards + old pages + Ctrl+K unaffected.

## 10. Guardrails (never touch)

- §21.5: **workflow tables are new**; existing WO status values **kabhi alter nahi** (pages/history/queries depend).
- `getAllowedTransitions` ka `[]` fallback — bina-config modules kabhi na tootein.
- SLA rules abhi org-level (plant-scope intentionally off).