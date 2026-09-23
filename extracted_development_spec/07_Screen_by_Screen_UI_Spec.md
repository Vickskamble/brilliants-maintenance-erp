# Screen-by-Screen UI Specification

## Global layout

Desktop:
- left sidebar
- top organization/plant selector
- notification bell
- user menu
- breadcrumb
- page title
- primary action
- filters
- data table
- pagination

Mobile:
- bottom navigation for key modules
- drawer for full module list
- card-based work execution

## 01 Login
Fields:
- email
- password
Actions:
- login
- forgot password

## 02 Dashboard
Cards:
- Total Equipment
- Critical Equipment
- PM Due
- PM Overdue
- Open Work Orders
- Breakdown
- Downtime
- PM Compliance
- MTBF
- MTTR
- Calibration Due
- Low Stock

## 03 Equipment List
Filters:
- plant
- department
- category
- criticality
- status
- manufacturer

Columns:
- Asset Code
- Equipment
- Category
- Location
- Criticality
- Status
- Next PM
- Actions

## 04 Equipment Detail
Tabs:
- Overview
- Components
- PM
- Work Orders
- Breakdowns
- Inspections
- Calibration
- Spares
- Documents
- Cost
- History

## 05 PM Plans
- plan list
- create/edit plan
- frequency
- tasks/checklist
- equipment
- responsible team
- next due

## 06 PM Calendar
Views:
- month
- week
- list

Indicators:
- due
- overdue
- completed
- missed

## 07 Work Orders
Filters:
- status
- priority
- type
- technician
- plant
- date

## 08 Work Order Detail
Sections:
- header/status
- equipment
- problem
- tasks
- assignment
- labor
- spare parts
- downtime
- costs
- attachments
- completion
- verification
- audit history

## 09 Breakdown
Fast-entry form:
- equipment
- reported time
- symptom
- priority
- description
- photo/attachment

Detail:
- diagnosis
- repair
- failure mode
- failure cause
- downtime
- corrective action
- RCA

## 10 Inspection
- select template
- select equipment
- checklist
- numeric readings
- pass/fail/observation
- comments
- attachment
- complete

## 11 Calibration
- instrument list
- due status
- calibration entry
- result
- certificate
- next due

## 12 Inventory
Tabs:
- Spare Parts
- Stock
- Transactions
- Low Stock
- Critical Spares

## 13 Shutdown
- shutdown list
- event detail
- jobs
- progress
- dependencies
- cost
- completion report

## 14 Vendors / AMC / Warranty
- vendor list
- contract list
- expiry alerts
- service visit history

## 15 Reports
Every report should have:
- date filter
- plant filter
- export PDF
- export Excel
- print

## 16 Administration
- users
- roles
- permissions
- plant access
- approval rules
- numbering
- audit logs
- notification settings

## UI states

Every screen must implement:
- loading
- empty
- error
- permission denied
- success
- validation error

No hardcoded production data.
