# Development Roadmap

## Phase 0 — Foundation
- Supabase project
- migrations
- RLS
- auth
- storage
- environment configuration
- seed data
- CI/basic testing

## Phase 1 — Asset Register
- organization
- plant hierarchy
- equipment
- criticality
- components
- documents
- asset history

## Phase 2 — Maintenance Core
- PM plans
- schedules
- PM calendar
- work requests
- work orders
- assignments
- completion/verification/closure

## Phase 3 — Breakdown & Analytics
- breakdown
- downtime
- failure modes
- corrective actions
- RCA
- MTBF
- MTTR
- PM compliance

## Phase 4 — Inspection & Calibration
- templates
- inspections
- instruments
- calibration
- certificates
- due alerts

## Phase 5 — Inventory & Commercial
- spare parts
- stock
- issue/return/transfer
- vendors
- contracts
- AMC
- warranty
- cost tracking

## Phase 6 — Shutdown & Enterprise Controls
- shutdown/turnaround
- approvals
- audit
- advanced reports
- role/plant access
- notification center

## Phase 7 — Future Intelligence
Do not block V1 on this.

- manual condition readings
- IoT connectors
- sensor data
- anomaly detection
- predictive maintenance
- AI recommendations
- PowerEMS integration
- mobile offline mode

## Definition of Done

A module is complete only when:
- DB migration exists
- RLS exists
- API/service exists
- UI exists
- validation exists
- loading/empty/error states exist
- audit is covered
- permissions are tested
- unit/integration tests exist
- no hardcoded production data
- responsive behavior is verified
