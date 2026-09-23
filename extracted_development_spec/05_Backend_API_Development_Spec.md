# Backend & API Development Specification

## Stack

- Frontend: Flutter or React/Next.js
- Backend: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth
- Storage: Supabase Storage
- Server logic: Supabase Edge Functions / PostgreSQL RPC
- Notifications: in-app first; email/WhatsApp later
- Reporting: server-generated PDF/Excel

## Architecture

Frontend
-> Auth
-> API/service layer
-> Supabase RPC / direct RLS-protected queries
-> PostgreSQL
-> Storage

Never put business-critical authorization logic only in the frontend.

## Service boundaries

### AuthService
- login
- logout
- password reset
- current user
- current organization
- current plant scope

### OrganizationService
- plants
- departments
- sections
- areas
- locations
- cost centers

### AssetService
- equipment CRUD
- components
- criticality
- status
- asset history
- equipment documents

### MaintenanceService
- PM plans
- PM tasks
- schedules
- due/overdue calculation
- PM work-order generation

### WorkOrderService
- work requests
- work orders
- assignments
- tasks
- labor
- parts
- costs
- status transitions
- verification
- closure

### BreakdownService
- breakdown reporting
- diagnosis
- restoration
- failure mode/cause
- corrective action
- RCA

### InspectionService
- templates
- check points
- inspections
- results
- observations

### CalibrationService
- instruments
- calibration records
- due dates
- certificates

### InventoryService
- spare master
- stock
- issue
- return
- transfer
- adjustment
- reorder alerts

### VendorContractService
- vendors
- contracts
- service visits
- AMC
- warranty

### ShutdownService
- shutdown events
- shutdown jobs
- dependencies
- progress
- completion

### ReportingService
- KPI queries
- dashboards
- PDFs
- Excel exports

## Business rules

### Work order
- Every WO has a unique number.
- WO must belong to one organization and plant.
- Closed WO cannot be edited except through authorized correction workflow.
- Actual cost is calculated from labor + parts + external/service costs.
- Completion requires completion notes.
- Verification is separate from completion.

### PM
- PM schedule generates a due instance.
- Due/overdue status must be calculated from schedule dates.
- PM completion should create maintenance history.
- Missed PM requires a reason.

### Breakdown
- Breakdown start/end determines downtime.
- Restoration marks equipment as operational.
- Failure mode/cause should be captured whenever known.
- Repeated failures should feed reporting.

### Inventory
- Stock transaction is the source of truth.
- Do not directly edit stock balance from the UI.
- Every issue/return/transfer/adjustment creates a ledger entry.
- Negative stock should be blocked unless explicitly configured.

### Calibration
- Instrument cannot be considered compliant if calibration is overdue.
- Calibration certificate should be attachable.
- Next due date is derived from calibration frequency/rule.

## Number generation

Use server-side number generation, never frontend counters.

Examples:
- EQ-2026-000001
- PM-2026-000001
- WO-2026-000001
- BRK-2026-000001
- CAL-2026-000001
- INS-2026-000001
- STO-2026-000001
- SD-2026-000001

Numbers should remain stable after creation.

## RPC candidates

Use PostgreSQL functions/RPC for operations that need multiple writes atomically:

- create_work_order()
- approve_work_order()
- assign_work_order()
- complete_work_order()
- verify_work_order()
- close_work_order()
- report_breakdown()
- restore_breakdown()
- issue_spare_to_work_order()
- return_spare_from_work_order()
- transfer_stock()
- complete_calibration()
- complete_inspection()
- generate_due_pm_work_orders()

## Audit

Audit:
- create
- update
- delete/archive
- status change
- approval
- verification
- closure
- stock transaction
- permission/role changes

Record:
- user
- timestamp
- table/module
- record ID
- action
- old data where appropriate
- new data where appropriate
- IP/device metadata if legally and technically appropriate

## Error format

Every service should return predictable errors:

- validation_error
- unauthorized
- forbidden
- not_found
- conflict
- invalid_transition
- insufficient_stock
- duplicate_record
- server_error

Do not expose raw database errors to normal users.

## Testing

Minimum:
- unit tests for business rules
- RLS tenant isolation
- plant-scope tests
- permission tests
- status transition tests
- stock ledger tests
- PM due-date tests
- PDF/report tests
- attachment access tests
