# Brilliants Industrial Maintenance ERP — HOW TO START

## 1. Objective

Build the Brilliants Industrial Maintenance ERP as a web-first, multi-user industrial maintenance management system.

Recommended stack:

- Frontend: Next.js + TypeScript
- UI: Tailwind CSS + reusable component system
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Server-side business logic: Supabase RPC / Edge Functions
- Hosting: Vercel
- Source control: Git + GitHub

V1 must work completely without IoT, sensors, AI or automation.

The architecture must remain ready for future:
- IoT
- predictive maintenance
- AI recommendations
- PowerEMS integration
- mobile applications
- notification automation

---

# 2. Required Software

Install:

1. Node.js LTS
2. Git
3. VS Code
4. Supabase account
5. GitHub account
6. Vercel account

Verify:

```bash
node -v
npm -v
git --version
```

---

# 3. Create the Project

Recommended:

```bash
npx create-next-app@latest brilliants-maintenance-erp
```

Select:

- TypeScript: Yes
- ESLint: Yes
- Tailwind CSS: Yes
- App Router: Yes
- src directory: Yes
- Import alias: Yes
- Turbopack: Yes

Then:

```bash
cd brilliants-maintenance-erp
npm run dev
```

Open:

```text
http://localhost:3000
```

---

# 4. Install Core Packages

Install Supabase:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Recommended utility packages:

```bash
npm install zod react-hook-form @hookform/resolvers date-fns
```

For icons:

```bash
npm install lucide-react
```

For tables:

```bash
npm install @tanstack/react-table
```

Do not install large libraries without a specific requirement.

---

# 5. Recommended Folder Structure

Create:

```text
src/
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── equipment/
│   ├── maintenance/
│   ├── work-orders/
│   ├── breakdowns/
│   ├── inspections/
│   ├── calibration/
│   ├── inventory/
│   ├── vendors/
│   ├── shutdowns/
│   ├── reports/
│   └── settings/
│
├── components/
│   ├── layout/
│   ├── ui/
│   ├── forms/
│   ├── tables/
│   ├── dashboard/
│   └── common/
│
├── lib/
│   ├── supabase/
│   ├── auth/
│   ├── permissions/
│   ├── validation/
│   ├── utils/
│   └── constants/
│
├── services/
│   ├── organization/
│   ├── equipment/
│   ├── maintenance/
│   ├── work-orders/
│   ├── breakdowns/
│   ├── inspections/
│   ├── calibration/
│   ├── inventory/
│   ├── vendors/
│   ├── shutdowns/
│   └── reports/
│
├── types/
│   ├── database.ts
│   ├── auth.ts
│   └── common.ts
│
└── hooks/
    ├── use-user.ts
    ├── use-permissions.ts
    └── use-organization.ts
```

Keep business logic out of UI components.

---

# 6. Create Supabase Project

Create a dedicated development Supabase project.

Do NOT start by connecting the production project.

Recommended environments:

```text
Development
     ↓
Staging
     ↓
Production
```

For the first development stage, Development is sufficient.

---

# 7. Run Database Migrations

Run the existing migrations in order:

```text
001_initial_schema.sql
002_rls_policies.sql
```

Order is mandatory.

Do not run `002_rls_policies.sql` before `001_initial_schema.sql`.

After migration, verify:

- tables exist
- enums exist
- indexes exist
- triggers exist
- RLS is enabled
- policies exist
- permission functions exist

---

# 8. Supabase Environment Variables

Create:

```text
.env.local
```

Use:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Never put the Supabase service-role key in frontend code.

Never commit `.env.local`.

Verify `.gitignore` contains:

```text
.env*
```

---

# 9. Generate Database Types

Use Supabase-generated TypeScript types.

Recommended workflow:

```bash
npx supabase login
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

If using a local Supabase CLI workflow, generate types from the local database instead.

Regenerate types whenever the database schema changes.

---

# 10. Authentication First

Implement:

- Login
- Logout
- Session persistence
- Password reset
- Protected routes
- Current user
- Current organization
- Current plant scope
- Roles
- Permissions

First successful flow:

```text
Login
  ↓
Supabase Auth
  ↓
Load Profile
  ↓
Load Organization
  ↓
Load Roles
  ↓
Load Permissions
  ↓
Dashboard
```

A user without a valid organization membership should not enter the ERP.

---

# 11. Base Layout

Create the ERP shell:

```text
┌──────────────────────────────────────────────────────┐
│ Logo   Organization / Plant       Notification User │
├───────────────┬──────────────────────────────────────┤
│ Dashboard     │                                      │
│ Equipment     │                                      │
│ Maintenance   │              Main Content            │
│ Work Orders   │                                      │
│ Breakdowns    │                                      │
│ Inspection    │                                      │
│ Calibration   │                                      │
│ Inventory     │                                      │
│ Vendors       │                                      │
│ Shutdown      │                                      │
│ Reports       │                                      │
│ Settings      │                                      │
└───────────────┴──────────────────────────────────────┘
```

Sidebar items must be permission-aware.

Example:

A user without `inventory.view` must not see Inventory.

But hiding the menu is NOT security.

RLS remains the actual security layer.

---

# 12. Sprint 1 Scope

Do NOT build the entire ERP at once.

Sprint 1 should contain only:

### Authentication
- Login
- Logout
- Session

### Organization
- Organization profile
- Plant list
- Plant selector

### Users
- User list
- User profile
- Active/inactive status

### Roles
- Role list
- Permission mapping
- Plant assignment

### Base UI
- Sidebar
- Header
- Breadcrumb
- Notifications placeholder
- User menu

### Dashboard shell
- KPI cards with real database queries where available
- Empty states where data does not yet exist

---

# 13. First Test Data

Create only development seed data.

Example:

Organization:

```text
Brilliants Demo Organization
```

Plants:

```text
Plant A
Plant B
```

Users:

```text
Super Admin
Maintenance Manager
Maintenance Engineer
Technician
Store Manager
Viewer
```

Do not hardcode these users into frontend code.

Create them through Supabase Auth and database seed/admin workflow.

---

# 14. Permission Test

Before starting Equipment development, verify:

### Organization isolation

User from Organization A:

- can read Organization A
- cannot read Organization B

### Plant isolation

Plant A restricted user:

- can read Plant A
- cannot read Plant B

### Viewer

- can view authorized records
- cannot create
- cannot edit
- cannot delete

### Technician

- can access authorized maintenance execution
- cannot manage organization users unless permission is granted

### Admin

- can manage authorized organization data

If these tests fail, STOP and fix RLS before continuing.

---

# 15. First UI Coding Order

Build in this exact order:

```text
1. Root layout
2. Supabase client/server utilities
3. Auth middleware/protection
4. Login
5. ERP shell
6. Sidebar
7. Header
8. User menu
9. Organization/plant selector
10. Permission hook
11. Dashboard
12. Users
13. Roles
14. Plants
```

Then Sprint 1 testing.

---

# 16. Sprint 2 — Equipment

After Sprint 1 passes:

Build:

- Equipment list
- Equipment creation
- Equipment edit
- Equipment detail
- Criticality
- Status
- Components
- Equipment documents
- Equipment history

Equipment detail should become the central asset page.

Recommended tabs:

```text
Overview
Components
PM
Work Orders
Breakdowns
Inspections
Calibration
Spares
Documents
Cost
History
```

---

# 17. Sprint 3 — Preventive Maintenance

Build:

- PM plans
- PM tasks
- frequencies
- schedules
- PM calendar
- due list
- overdue list
- completion
- missed PM reason
- PM work-order generation

---

# 18. Sprint 4 — Work Orders

Build status flow:

```text
Draft
 ↓
Submitted
 ↓
Approved
 ↓
Planned
 ↓
Assigned
 ↓
In Progress
 ↓
Completed
 ↓
Verified
 ↓
Closed
```

Special states:

```text
On Hold
Cancelled
```

Status changes must be server-validated.

---

# 19. Sprint 5 — Breakdown

Build:

- Breakdown report
- Equipment
- Symptom
- Diagnosis
- Repair
- Failure mode
- Failure cause
- Downtime
- Restoration
- Corrective action
- RCA

This module should be optimized for quick reporting during an actual breakdown.

---

# 20. Sprint 6 — Inspection & Calibration

Inspection:

- templates
- check points
- readings
- pass/fail
- observations
- attachments

Calibration:

- instruments
- due dates
- calibration records
- result
- certificate
- next due

---

# 21. Sprint 7 — Inventory

Build:

- spare master
- critical spares
- stock locations
- stock balance
- issue
- return
- transfer
- adjustment
- ledger
- reorder alerts

Important:

Stock balance must be derived from controlled stock transactions.

Do not allow arbitrary frontend editing of stock quantity.

---

# 22. Sprint 8 — Vendors / AMC / Warranty

Build:

- vendors
- contracts
- service visits
- AMC
- warranty
- expiry reminders
- vendor history
- contract documents

---

# 23. Sprint 9 — Shutdown

Build:

- shutdown event
- shutdown jobs
- dependencies
- responsible teams
- contractor
- progress
- cost
- completion report

---

# 24. Sprint 10 — Reports

Mandatory reports:

- Asset Register
- Critical Equipment
- PM Due
- PM Overdue
- PM Compliance
- Work Orders
- Breakdown
- Downtime
- MTBF
- MTTR
- Maintenance Cost
- Spare Consumption
- Stock
- Calibration Due
- Inspection Compliance
- AMC/Warranty Expiry
- Technician Workload

Every report:

- filters
- pagination where needed
- PDF
- Excel
- print

---

# 25. Development Rules

Always:

- use TypeScript
- use reusable components
- use server-side validation
- use RLS
- use transactions for multi-step operations
- use proper error handling
- use audit logs
- use loading states
- use empty states
- use permission checks
- use real database data
- keep code modular

Never:

- hardcode production data
- hardcode user permissions
- trust organization_id from the browser
- expose service-role keys
- bypass RLS
- directly edit stock balances
- silently swallow errors
- create unrelated UI changes
- redesign the database without documenting why

---

# 26. Git Workflow

Create repository:

```bash
git init
git add .
git commit -m "Initial ERP project foundation"
```

Recommended branches:

```text
main
develop
feature/*
fix/*
```

Development:

```text
feature/auth
feature/equipment
feature/preventive-maintenance
feature/work-orders
```

Merge into `develop`.

Only tested releases go to `main`.

---

# 27. First Milestone

The first milestone is NOT "ERP complete".

Milestone 1 is:

```text
User can login
       ↓
Organization identified
       ↓
Plant identified
       ↓
Role identified
       ↓
Permissions loaded
       ↓
ERP dashboard opens
       ↓
Unauthorized data is blocked by RLS
```

Only after this works should Equipment development begin.

---

# 28. Master Coding Prompt

Use this prompt with the coding AI/developer:

> Build the Brilliants Industrial Maintenance ERP using Next.js, TypeScript, Tailwind CSS and Supabase.
>
> The existing database migrations are `001_initial_schema.sql` and `002_rls_policies.sql`. Do not redesign them unless a real incompatibility is found.
>
> Start with Sprint 1 only:
> - Supabase integration
> - authentication
> - protected routes
> - user profile
> - organization
> - plants
> - roles
> - permissions
> - plant selector
> - ERP layout
> - sidebar
> - header
> - dashboard shell
>
> Use TypeScript and reusable components.
>
> Do not hardcode production data.
>
> Do not put authorization logic only in the frontend.
>
> Respect PostgreSQL RLS.
>
> Use the existing permission functions and database structure.
>
> Implement loading, empty, error and permission-denied states.
>
> Before changing code, inspect the existing project structure.
>
> For every change, provide:
> 1. files to create/change
> 2. reason
> 3. implementation
> 4. test steps
>
> Do not make unrelated changes.
>
> Do not proceed to Equipment until Sprint 1 authentication, organization, plant and permission tests pass.

---

# 29. Definition of Done — Sprint 1

Sprint 1 is complete only when:

- [ ] Next.js project runs
- [ ] Supabase connected
- [ ] Auth works
- [ ] Protected routes work
- [ ] User profile loads
- [ ] Organization loads
- [ ] Plant selector works
- [ ] Roles load
- [ ] Permissions load
- [ ] Sidebar is permission-aware
- [ ] Dashboard shell works
- [ ] RLS tenant isolation tested
- [ ] Plant isolation tested
- [ ] Viewer permissions tested
- [ ] Admin permissions tested
- [ ] No production secrets committed
- [ ] Git repository created
- [ ] Code committed

Then proceed to Sprint 2: Equipment / Asset Register.
