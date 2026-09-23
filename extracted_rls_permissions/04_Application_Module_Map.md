# Brilliants Industrial Maintenance ERP — Application Module Map

## 1. Authentication
- Login
- Forgot password
- User profile
- Organization selection if multi-org is later enabled

## 2. Executive Dashboard
KPIs:
- Total equipment
- Critical equipment
- PM due today
- PM overdue
- Open work orders
- Breakdown count
- Downtime
- PM compliance %
- MTBF
- MTTR
- Maintenance cost
- Calibration due
- Inspection due
- Low-stock / reorder alerts
- AMC/Warranty expiring

Charts:
- Breakdown trend
- PM compliance trend
- Maintenance cost trend
- Downtime by equipment
- Work order status
- Top recurring failure modes
- Critical equipment health summary

## 3. Masters
Organization
- Plants
- Departments
- Sections
- Areas
- Locations
- Cost centers

Assets
- Asset categories
- Criticality profiles
- Equipment
- Equipment components
- Equipment status history

Maintenance
- Failure modes
- Failure causes
- Maintenance plans
- Inspection templates

Inventory
- Spare categories
- Spare parts
- Stock locations

Partners
- Vendors
- Contracts
- Service providers

## 4. Equipment / Asset Register
Equipment profile should show:
- Asset code
- Equipment name
- Category
- Manufacturer
- Model
- Serial number
- Plant / department / area / location
- Criticality
- Status
- Installation date
- Commissioning date
- Warranty
- AMC
- Parent equipment
- Components
- Documents
- PM plans
- Work order history
- Breakdown history
- Inspection history
- Calibration history where applicable
- Spare parts
- Cost history

Views:
- All equipment
- Critical equipment
- Active
- Under maintenance
- Breakdown
- Standby
- Decommissioned

## 5. Preventive Maintenance
- PM plan creation
- Frequency
- Calendar-based schedule
- Meter/manual-reading based schedule
- Checklist/task steps
- Assigned technician/team
- Planned duration
- Next due date
- Grace period
- Auto generation of work order when approved
- PM compliance
- Overdue PM
- Missed PM reason
- PM history

## 6. Work Management
- Work request
- Work order
- Priority
- Type
- Assignment
- Task checklist
- Labor
- Spare parts
- External vendor
- Estimated cost
- Actual cost
- Downtime
- Attachments
- Completion notes
- Verification
- Closure

## 7. Breakdown Management
- Breakdown reporting
- Equipment downtime
- Symptom
- Failure mode
- Failure cause
- Immediate action
- Restoration
- Corrective action
- RCA
- CAPA-style follow-up
- Breakdown analytics

## 8. Inspection
- Inspection templates
- Check points
- Numeric readings
- Pass/fail
- Observation
- Attachments
- Inspector
- Due dates
- Non-conformance follow-up

## 9. Calibration
- Instrument register
- Calibration frequency
- Calibration due date
- External/internal calibration
- Certificate number
- Standard used
- Before/after readings
- Result
- Next due
- Certificate attachment
- Calibration history

## 10. Inventory / Spares
- Spare part master
- Critical spare flag
- Min/max level
- Reorder level
- Stock by location
- Issue to work order
- Return
- Adjustment
- Transfer
- Stock ledger
- Spare consumption
- Spare cost
- Equipment-spare mapping

## 11. Shutdown / Turnaround
- Shutdown event
- Start/end
- Planned jobs
- Job dependencies
- Responsible team
- Contractor
- Completion status
- Cost
- Delay reason
- Shutdown report

## 12. Contracts / AMC / Warranty
- Contract master
- Vendor
- Start/end dates
- Scope
- Visit schedule
- SLA
- Cost
- Renewal reminder
- Service visit history
- Warranty expiry

## 13. Documents
- Manuals
- Drawings
- Datasheets
- SOPs
- Calibration certificates
- Warranty documents
- AMC contracts
- Photos
- Work-order attachments

## 14. Reports
Mandatory V1 reports:
- Asset register
- Critical equipment
- PM due
- PM overdue
- PM compliance
- Work order status
- Breakdown history
- Downtime
- MTBF
- MTTR
- Maintenance cost
- Equipment maintenance history
- Spare consumption
- Stock balance
- Low stock
- Calibration due
- Calibration history
- Inspection compliance
- AMC/Warranty expiry
- Technician workload
- Shutdown summary

## 15. Administration
- Users
- Roles
- Permissions
- Plant access
- Approval rules
- Numbering rules
- Audit log
- Notification preferences
- Document types

## 16. Future-ready modules
Not required for V1:
- IoT integration
- Sensor ingestion
- Condition monitoring
- Predictive maintenance
- AI anomaly detection
- Mobile offline sync
- WhatsApp/email automation
- Energy integration with PowerEMS
- API marketplace

These should be added without redesigning the core equipment, maintenance, work-order and history model.
