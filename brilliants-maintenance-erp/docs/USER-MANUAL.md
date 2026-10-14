# Brilliants Industrial Maintenance ERP — Complete User Manual

Version: 1.0 (Applies to the live deployment at `https://erp.brilliants.in`)

---

## Table of Contents

1. [What is this system?](#1-what-is-this-system)
2. [Access & Important Links](#2-access--important-links)
3. [First-Time Setup](#3-first-time-setup)
4. [Login, Roles & Permissions](#4-login-roles--permissions)
5. [Dashboard (Home)](#5-dashboard-home)
6. [Kiosk (Shop-Floor Tablet / PWA App)](#6-kiosk-shop-floor-tablet--pwa-app)
7. [Equipment](#7-equipment)
8. [Assets](#8-assets)
9. [Maintenance (Preventive / PM Schedules)](#9-maintenance-preventive--pm-schedules)
10. [Work Orders](#10-work-orders)
11. [Breakdowns](#11-breakdowns)
12. [Inspections](#12-inspections)
13. [Calibration](#13-calibration)
14. [Shutdown](#14-shutdown)
15. [Inventory & Spare Parts](#15-inventory--spare-parts)
16. [Vendors & Procurement](#16-vendors--procurement)
17. [Reports & Analytics](#17-reports--analytics)
18. [Approvals & Approval Workflow](#18-approvals--approval-workflow)
19. [Global Search & Notifications](#19-global-search--notifications)
20. [Settings & Master Data](#20-settings--master-data)
21. [Recommended End-to-End Flows](#21-recommended-end-to-end-flows)
22. [Troubleshooting & FAQ](#22-troubleshooting--faq)

---

## 1. What is this system?

Brilliants ERP is a complete digital management system for industrial
maintenance and asset reliability. It replaces paper registers, Excel sheets
and phone calls for:

- Equipment master data with QR codes
- Preventive maintenance (PM) planning and execution
- Work orders (corrective / breakdown / shutdown work)
- Breakdown reporting and downtime tracking
- Inspections, calibration and shutdown planning
- Spare parts inventory and stock movements
- Vendors, purchase orders and material requests
- Approvals (workflow / SLA) and detailed reports

There are **two interfaces**:

| Interface | URL | Purpose |
|---|---|---|
| Full ERP (office use) | `https://erp.brilliants.in` | All modules, master data, approvals, reports |
| **Kiosk** (shop floor / tablet) | `https://erp.brilliants.in/kiosk` | QR scanning, My Work, PM Due, Equipment Hub — installable as an app |

---

## 2. Access & Important Links

| Page | URL |
|---|---|
| Login | `https://erp.brilliants.in/login` |
| Dashboard | `https://erp.brilliants.in/dashboard` |
| Kiosk | `https://erp.brilliants.in/kiosk` |
| Kiosk – My Work | `https://erp.brilliants.in/kiosk/my-work` |
| Kiosk – PM Due | `https://erp.brilliants.in/kiosk/pm-due` |
| Equipment list | `https://erp.brilliants.in/equipment` |
| Work Orders | `https://erp.brilliants.in/work-orders` |
| Reports | `https://erp.brilliants.in/reports` |

Supported browsers: **Chrome / Edge** (desktop & Android), **Brave**,
**Safari** (iOS). The kiosk is optimized for **Chrome on Android tablets**.

---

## 3. First-Time Setup

### 3.1 Who creates the first user account?

The system administrator (or the person managing the project) creates user
accounts from **Settings → Users** after logging in with an admin account.
Every user logs in with an **email + password** (Supabase Auth). There is no
public self-registration.

### 3.2 What the admin should set up first (recommended order)

1. **Plants** — `Settings → Plants` (e.g. Hinganghat, Pune).
2. **Users** — `Settings → Users` (create one account per person).
3. **Roles & Permissions** — `Settings → Roles` and `Settings → Permissions`
   (team-member / supervisor / engineer / admin defaults).
4. **Master data** — `Settings → Department-Section-Area-Location`,
   `Asset Categories`, `Criticality Profiles`.
5. **Equipment** — add machines with their plant, department, location.
6. **Spare parts** — `Inventory → Spare Parts`.
7. **Maintenance schedules** — `Maintenance → Schedules` so PM due dates exist.
8. **Print + paste QR labels** on the machines (see §7.5).

### 3.3 User's first login checklist

- Received email/password from admin.
- Login at `https://erp.brilliants.in`.
- Check your **Plant** shown in the sidebar (if your profile has no plant,
  you see data of all plants — admin usually sets one).
- If you only work on the shop floor, install the **Kiosk app** (see §6.1).

---

## 4. Login, Roles & Permissions

### 4.1 Login

1. Open `https://erp.brilliants.in`. Unauthenticated users are redirected to
   the **Login** page automatically (except `/kiosk` and `/auth`).
2. Enter your **Email** and **Password** → click **Sign In**.
3. Wrong credentials show a red error box on the form.

### 4.2 Roles

Roles control what a user can see and do. Typical roles:

| Role | Typical rights |
|---|---|
| Admin | Everything — settings, users, all modules |
| Engineer / Supervisor | Work orders, PM execution, approvals, reports |
| Team member / Technician | Kiosk work — start/complete own WOs, perform PM, scan equipment |
| Viewer | Read-only access to lists and reports |

Permissions are checked **per module** and **per action** (view / create /
update / delete / approve). If a menu or button is hidden, your role does not
have that permission.

### 4.3 Organisation & Plant scoping

Every record belongs to an **organisation** and usually a **plant**. A user
without a plant sees all plants; a user with a plant only sees that plant's
data. This scoping is applied automatically on lists, reports, dashboards and
global search.

---

## 5. Dashboard (Home)

After login you land on **Dashboard** (`/dashboard`). It shows:

- **KPI cards** — e.g. Total Equipment, Open Work Orders, PM Overdue/Due,
  Low Stock items, Open Breakdowns (cards are clickable and jump to the list).
- **Low stock alert** — items where `reorder_level` > 0 and `current_stock` ≤
  reorder level.
- **Recent/Open work** — open/unverified work orders, latest breakdowns.

All counter queries are organisation + plant scoped. Numbers update on page
load; press **F5** (or pull-to-refresh in the kiosk) to refresh.

---

## 6. Kiosk (Shop-Floor Tablet / PWA App)

The kiosk is a **full-screen, mobile-optimised** interface for the shop floor.

### 6.1 Install the Kiosk as an app (PWA)

**Android (Chrome):**

1. Open `https://erp.brilliants.in/kiosk` in Chrome on the tablet.
2. Log in (once — the kiosk remembers the session).
3. Tap the browser **⋮ menu → "Add to Home screen"** (or **"Install app" / "Install BEM Kiosk"**).
4. Confirm. A **BEM Kiosk** icon appears on the home screen.
5. Sign out or clear browser data **permanently** — the login page will re-appear, keep that.

**iOS (Safari):**

1. Open the kiosk URL in Safari.
2. Tap **Share (□↑) → "Add to Home Screen"**.
3. Confirm. It opens full-screen (standalone) via `apple-mobile-web-app`.

> Requirement for Android "Install": the site must be served over HTTPS
> (it is) with a valid web-app manifest and service worker — both are set up.
> If the Install option still does not appear, close and reopen all tabs
> (the service worker registers on first visit), then reload `/kiosk`.

### 6.2 Kiosk screens and flows

The kiosk has its own bottom menu:

| Section | What it does |
|---|---|
| **Scan** (scanner) | Scans a machine's **QR code** and opens its **Equipment Hub** |
| **My Work** | All open work orders (submitted → on-hold). Start / Complete directly from the floor |
| **PM Due** | Preventive-maintenance tasks whose next-run date is due (≤ now + 7 days) |
| **Equipment Hub** | Machine detail card — location, status, components, status history, open WOs and PM — opened from a scan |

**Scanner:**

- Uses the device **rear camera** automatically (`facingMode: environment`).
- Point the QR at the camera; it reads continuously and opens the hub.
- If the camera does not start (permission denied), the app falls back to a
  QR-reader library. Allow camera permission when the browser asks.

**My Work flow:**

1. Tap a work order.
2. **Start Work** → status becomes `In Progress` (equipment status set to
   `Under Maintenance`).
3. **Complete Work** → status becomes `Completed`.
4. List auto-refreshes every ~30 seconds.

**PM Due flow:**

1. Scan the machine or open PM Due.
2. Tap **Complete** on a due PM:
   - The PM's `Last Run` updates to now.
   - `Next Run` advances by the schedule frequency/interval (e.g. +30 days,
     or by interval_days). Without an interval it defaults to +30 days.
   - The task leaves the due list.

---

## 7. Equipment

**Module:** sidebar → Equipment | **URL:** `/equipment`

### 7.1 Equipment list

- Columns: **Code/Name, Category, Criticality, Plant, Department, Status**.
- Filters at the top: **Plant, Category, Criticality, Status, Department**.
- Table toolbar: **search box, column visibility, save view, export CSV, print QR labels**.
- **Row actions**: View (eye) → detail hub, Edit (pencil).

### 7.2 Add new equipment

1. **+ Add Equipment** button.
2. Fill: **Equipment Code** (unique), **Name**, **Category**, **Criticality**,
   **Plant**, **Department / Section / Area / Location**, **Cost Centre**,
   **Status** (e.g. Operational), **Manufacturer / Make / Model / Serial No**,
   **Commission Date**, **Description**.
3. Save. The system stores the **organisation** automatically.

### 7.3 Equipment detail hub (`/equipment/{id}`)

Tabs:

| Tab | Contents / actions |
|---|---|
| **Overview** | All master details, **QR code** (printable), status |
| **Status History** | Log of every status change (`equipment_status_history`) |
| **Components** | Add / edit / delete child components (name, type, serial no, criticality, spec, part-code ref) |
| **Work Orders** | Open work orders for this machine |
| **Breakdowns** | Breakdown history, severity, downtime |
| **Inspections** | Inspection history with results |
| **Calibrations** | Calibration schedules for this machine |

Actions: **Edit**, **Print QR label**, **Print overview**.

> The "Area" row correctly shows the **Area** (previously it wrongly showed Section).

### 7.4 Change equipment status

From the equipment hub you can change status (Operational / Under
Maintenance / Breakdown / Decommissioned / etc.). Every change is written to
the status history with reason — useful for audits.

### 7.5 QR labels

- Every equipment record has a QR code (either auto-generated or a custom
  `qr_code` payload).
- Use **print QR labels** on the list or the hub to print stickers, and paste
  them on the machines — the kiosk scanner then jumps straight to the right
  machine.

---

## 8. Assets

**Module:** sidebar → Assets | **URL:** `/assets`

Asset reliability view of the equipment collection — used to track asset
master records and their health. Same data source as Equipment but aimed at
the reliability/asset register. Create an asset like equipment (§7.2) with
its code, category and criticality; use its hub for history.

---

## 9. Maintenance (Preventive / PM Schedules)

**Module:** sidebar → Maintenance | **URL:** `/maintenance`

### 9.1 What is a PM schedule?

A `maintenance_schedule` defines recurring maintenance for a (or no /
"General") equipment:

- **Frequency type**: Daily / Weekly / Monthly / Quarterly / Yearly
- **Interval days**: number of days between runs
- **Next Run** date and **Last Run** date
- Task type: `Preventive`, `Calibration`, `Inspection` (used by those screens)
- Assigned person, instructions/notes, active/inactive

### 9.2 Create a schedule

1. **+ Add Schedule** (`/maintenance/new`).
2. Choose **Equipment** (or leave empty for general), **Task Type**,
   **Frequency**, **First/Next run date**, **Assignee**, **Notes**.
3. Save. Next run date drives "due".

### 9.3 How the due-cycle works

- A task is **due** when `is_active = true` and `next_run_at <= now`.
- Completing the PM:
  - `last_run_at = now`
  - `next_run_at = now + interval_days`  (or +30 days if none set)
  - So it automatically **re-arms** for the next cycle — it never gets stuck.
- Overdue tasks stay visible until completed.

### 9.4 Where to run PM

- **Kiosk → PM Due** (scoped to your plant, up to next 7 days) — tap
  Complete.
- **Maintenance schedule detail** (`/maintenance/{id}`) — has `* , equipment
  name` shown and run/update actions.

### 9.5 Calibration & Inspection variants

- **Calibration** (`/calibration`) shows only schedules with
  `task_type = calibration`, sorted by nearest `next_run_at`.
- **Inspections** (`/inspections`) handles inspection schedules/checklists
  separately (see §12).

---

## 10. Work Orders

**Module:** sidebar → Work Orders | **URL:** `/work-orders`

### 10.1 Purpose

Work Orders capture **all maintenance work** — corrective, breakdown follow-up,
preventive execution, shutdown work — assign it, track execution, and consume
spare parts.

### 10.2 Work order lifecycle (statuses)

```
Draft → Submitted → Approved → Planned → Assigned → In Progress → Completed → Verified → Closed
                          ↘ Rejected        ↘ On Hold → (resume → In Progress)
                                              ↘ Cancelled
```

| Status | Meaning |
|---|---|
| Draft | Being written, not yet released |
| Submitted | Awaiting approval (workflow gate) |
| Approved | Approved; ready to plan/assign |
| Planned | Schedule/timing fixed |
| Assigned | Slotted to a person/team |
| In Progress | Work started (kiosk "Start Work") |
| On Hold | Paused |
| Completed | Work finished (kiosk "Complete Work") |
| Verified | Supervisor/quality verified the work |
| Closed | Done and archived |
| Cancelled / Rejected | No longer executed |

### 10.3 Create a work order (`/work-orders/new`)

Fields: **Title**, **Type** (Corrective / Preventive / Breakdown / Shutdown /
Inspection...), **Priority**, **Equipment** (optional = general), **Plant**,
**Assigned To** (person), **Description**, **Planned start/end**, **Spare
parts** (add part + quantity + notes), **Submit for approval** toggle.

- Saving sets the current status (Draft or Submitted if gated).
- Status changes are logged in the **status history** with actor + remarks.

### 10.4 Work order list

- Filters: **status, priority, plant, type** + free-text search.
- Views: **Table / Kanban**. Bulk actions and CSV export available.
- Open list excludes `Verified` and soft-deleted orders.

### 10.5 Work order detail (`/work-orders/{id}`)

- Shows all details, assigned person, equipment, spare parts consumed.
- **Status page** (`/work-orders/{id}/status`) for transition actions
  (submit / plan / assign / start / complete / verify / close) with remarks.
- The kiosk "My Work" performs Start/Complete on those same orders.

### 10.6 Spare parts on a work order

- Attach parts with quantity when creating/editing.
- On the detail screen parts are listed with `part_code`, `part_name`, unit —
  consumed from inventory on issue.

---

## 11. Breakdowns

**Module:** sidebar → Breakdowns | **URL:** `/breakdowns`

### 11.1 Report a breakdown

1. **+ Report Breakdown**.
2. **Equipment** (machine that failed), **Category / Severity**
   (Breakdown / Mechanical / Electrical / ...), **Problem description**
   (titled), **Report no / downtime minutes**, **Plant**.
3. Save → status `Open`.

### 11.2 Lifecycle

`Open → In Progress → Resolved → Closed` (with `Breakdown` category variants).
The detail page lets you record **root cause**, **action taken**,
**resolution notes**, **actual downtime**.

### 11.3 Downtime & Pareto

Every breakdown records `downtime_minutes`. Reports (§17) use these for
**Breakdown Pareto**, MTBF/MTTR and downtime analysis (equipment mapped via its
code/name).

---

## 12. Inspections

**Module:** sidebar → Inspections | **URL:** `/inspections`

### 12.1 Create an inspection

1. **+ Add Inspection**.
2. Pick **Equipment**, **Plant**, **Scheduled date**, assignee.
3. Save → status `Scheduled`.

### 12.2 Perform / record results

- On the detail page record **Performed at**, **Overall result**
  (Pass / Conditional / Fail), **Remarks**.
- Status becomes `Performed`/`Completed` depending on outcome.
- Checks appear in the inspection history on the **equipment hub**.

---

## 13. Calibration

**Module:** sidebar → Calibration | **URL:** `/calibration`

- Lists only schedules with `task_type = Calibration`, sorted by nearest next
  run (earliest due first).
- Use **+ Add Schedule** (links to `/maintenance/new`) to create one.
- Shows Equipment, frequency, last/next run, assignee, active flag.

---

## 14. Shutdown

**Module:** sidebar → Shutdown | **URL:** `/shutdowns`

- Tracks planned shutdowns (work orders of type shutdown with planned
  start/end), shown per plant.
- Create via a work order of type Shutdown with planned dates.

---

## 15. Inventory & Spare Parts

**Module:** sidebar → Inventory | **URL:** `/inventory`

### 15.1 Spare parts master (`/spare-parts`)

Each part: **Part code** (unique), **Name**, **Category** (Electrical /
Mechanical / Instrumentation / Pneumatic / Lubricants / Consumables /
Hydraulics / Bearings), **Unit** (pcs/box/set/roll/mtr/ltr/kg), **Reorder
level**, opening **stock**, **plant**.

### 15.2 Stock movements

Every increase/decrease is a **stock movement** row:

| Movement | Effect |
|---|---|
| In (purchase/GRN, opening stock) | `current_stock += qty` |
| Out (issued to work/breakdown, consumption) | `current_stock -= qty` |
| Adjust (stock-take/return) | +/- as entered |

History is shown with part name + code + movement type + user.

### 15.3 Low stock

When `current_stock <= reorder_level` (and a reorder level is set) the item is
flagged **Low Stock** — visible on the dashboard and in the inventory list.

### 15.4 Material requests & Purchase orders

- **Inventory → Requests** (`/inventory/requests`): Draft → Submitted →
  Approved → Ordered, priority based.
- **Inventory → Orders** (`/inventory/orders`): purchase orders Draft →
  Submitted → Approved → Ordered → Received, with vendor.
- **GRN** (`/inventory/grn`): goods-receipt posts the receipt and increases
  stock for the received quantity.

---

## 16. Vendors & Procurement

**Module:** sidebar → Vendors | **URL:** `/vendors`

- Add **Vendors** (name, contact, GST, address, plant/organisation).
- Vendor detail shows past **purchase orders**.
- Procurement flow (end-to-end):
  1. **Material request** for a part (priority).
  2. Approve the request (approvals).
  3. Create a **purchase order** for the vendor.
  4. Approve PO.
  5. On delivery, do **GRN** → stock increases automatically.
- Vendor evaluation screen exists for rating vendors by delivery/quality.

---

## 17. Reports & Analytics

**Module:** sidebar → Reports | **URL:** `/reports`

All reports are organisation/plant scoped. Filters: date range, plant,
category, criticality.

| Report | What it answers |
|---|---|
| **Maintenance KPIs** | Schedule counts / completion, overdue PMs |
| **Breakdown Pareto** | Which machines cause the most failures / downtime |
| **MTBF / MTTR** | Mean time between failures / to repair |
| **Downtime by equipment** | Minutes lost per machine/plant |
| **Work order completion** | Cycle time, outstanding vs done |
| **Inventory position** | Stock value, low-stock items |
| **Vendor / procurement** | PO value, lead times |
| **SLA rules** | Response-time window vs actuals (breakdown module) |

Reports are rendered as summary cards + charts; CSV export available.

---

## 18. Approvals & Approval Workflow

**Module:** sidebar → Approvals | **URL:** `/approvals`

- The system runs a **workflow engine**: workflow definitions → steps → SLA
  rules → approval instances.
- When a gated entity (e.g. work order, material request, purchase order)
  is **submitted**, an approval instance is created.
- Approvers (with the `approval` permission) see pending items and can
  **Approve / Reject** with remarks.
- Approving advances the entity status; rejecting records the reason.
- Everything is logged in **Settings → Audit Logs** and `activity_log`.

---

## 19. Global Search & Notifications

### 19.1 Global search

Use the search bar in the top bar. It searches across:
- Work Orders, Equipment, Breakdowns, Inspections, Maintenance Schedules,
  Vendors, Spare Parts.

Each result is organisation/plant scoped, soft-deleted work orders are
excluded, and results link to their page.

### 19.2 Notifications

- Notifications page lists events (approvals pending/completed, items owing
  you, etc.).
- Approval actions also write audit entries (§18).

---

## 20. Settings & Master Data

**Module:** sidebar → Settings | `/settings`

| Section | Purpose |
|---|---|
| **Users** | Create/edit users, set organisation + plant, activate/deactivate |
| **Roles** | Define roles and their capabilities |
| **Permissions** | Module × action permission matrix |
| **Plants** | Company locations (e.g. Hinganghat, Pune) |
| **Departments** | Departments (plant-scoped) |
| **Section / Area / Location** | Location hierarchy hierarchy for equipment |
| **Asset Categories** | Equipment categories |
| **Criticality Profiles** | Criticality levels (used by PM/reports) |
| **Workflows** | Approval definitions, steps, conditions |
| **SLA** | Response/repair time rules per module |
| **Audit Logs** | Every creation/update/approval with actor |
| **Import** | Bulk data import (CSV) helper |

> Right-click/refresh note: after admin changes master data, ask users to
> refresh the page.

---

## 21. Recommended End-to-End Flows

### Flow A — New machine goes live

1. `Settings → Asset Categories` — add category if missing.
2. `Equipment → + Add Equipment` → fill details, save.
3. `Equipment list → Print QR labels` → paste label on machine.
4. Open the **Equipment Hub** (scan the label in kiosk) → it shows status,
   components, history.
5. `Maintenance → + Add Schedule` → create PM for the machine.

### Flow B — Preventive maintenance done from the floor

1. Open **Kiosk app** on tablet → **PM Due**.
2. See due tasks (plant-scoped) → pick the machine → **Complete**.
3. Next run advanced automatically; task leaves the list.
4. Office users see `last_run_at` updated on the schedule.

### Flow C — Breakdown → fix

1. `Breakdowns → + Report Breakdown` (machine, severity, problem, downtime).
2. Create/find the related **Work Order** (or the breakdown auto-links).
3. Approver: **Approvals → Approve**.
4. Supervisor: **Assign** to a technician.
5. Technician on the floor: **Kiosk → My Work → Start** → fix → **Complete**.
6. Supervisor: mark **Verified → Closed** on WO status page.
7. Record downtime; the **Reports** page now reflects it.

### Flow D — Stock a spare part

1. `Spare Parts → + Add` (code, name, unit, reorder level, qty).
2. When stock is low: create **Material Request** → approve.
3. Convert to **Purchase Order** → vendor → approve.
4. On delivery: **GRN** → stock increases automatically; movement logged.

---

## 22. Troubleshooting & FAQ

**Q: "Kiosk app cannot be installed"**
A: Ensure you're on the latest deployment (hard refresh once:
`Ctrl+Shift+R` / tablet: clear site data once). Then Chrome menu →
**Install app / Add to Home screen**. The manifest + service worker are live.
If using the in-browser "Install" button, it appears after the first page
load registers the service worker.

**Q: Login redirected me back to /login**
A: Bad email/password, or the account is inactive. Ask admin to check
`Settings → Users`.

**Q: I don't see data / lists are empty**
A: Check your **plant** — a plant-specific user only sees their plant's
records. Admin can set/clear plant on the user profile.

**Q: Scanner doesn't open or shows black screen**
A: Allow **camera permission**, use a tablet with a rear camera, keep the QR
in bright light. The app falls back to a library reader if the native
BarcodeDetector is unavailable.

**Q: My Work is empty**
A: No open WOs assigned in your plant, or you have `verified/closed` statuses
which belong to office. Start a WO from the office screen if needed.

**Q: PM never leaves the due list after Complete**
A: Old builds had a bug (no interval → stuck). Current build defaults next run
to **+30 days**. Refresh the kiosk after completing if it still shows.

**Q: Data looks different after I changed settings**
A: Press **F5** to refresh; master data and permissions apply on next load.

**Q: Where is the history of actions?**
A: `Settings → Audit Logs` plus equipment status history and work-order status
history.

---

*End of manual.* Questions/feedback — ask the ERP administrator.