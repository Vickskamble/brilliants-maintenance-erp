# Functional Specification

## 1. Organization

-   Create company.
-   Create multiple plants.
-   Configure departments, areas, locations and cost centers.
-   Configure plant-specific settings.

## 2. Equipment Master

Each asset should support: - Asset/equipment ID - Name - Category/type -
Department - Area/location - Parent equipment - Make - Model - Serial
number - Capacity/specification - Manufacturer - Supplier/OEM -
Installation date - Commissioning date - Warranty - AMC - Criticality -
Status - Photos - Documents - Remarks

Equipment statuses: - Active - Under Maintenance - Standby - Breakdown -
Decommissioned

## 3. Criticality

Criticality levels: - Critical - Major - Normal

Assessment factors: - Safety impact - Production impact - Quality
impact - Environmental impact - Failure frequency - Repair time - Spare
availability - Backup availability

## 4. Preventive Maintenance

Functions: - Create PM plan. - Select equipment. - Define frequency. -
Define tasks/checklist. - Assign responsible role/person. - Set planned
date. - Record execution. - Record readings/remarks. - Attach
evidence. - Close PM. - Preserve history.

Frequencies: - Daily - Weekly - Monthly - Quarterly - Half-yearly -
Yearly - Running-hours based (manual entry initially)

## 5. Breakdown

Workflow: Reported → Work Request → Work Order → Diagnosis → Repair →
Testing → Restoration → Closure.

Capture: - Date/time - Equipment - Problem - Failure mode - Cause -
Action taken - Technician - Spare - Labour hours - Downtime - Cost -
Root cause - Verification

## 6. Corrective Maintenance

Create corrective work from: - Inspection finding - Breakdown analysis -
Engineer observation - Manual request

## 7. Calibration

Capture: - Instrument ID - Parameter - Range - Accuracy/tolerance -
Calibration frequency - Last calibration - Next due date - Agency -
Certificate number - As-found value - As-left value - Result -
Certificate attachment

## 8. Inspection

-   Create inspection template.
-   Define checklist items.
-   Schedule inspection.
-   Record result.
-   Record observation.
-   Generate corrective action.

## 9. Work Orders

Types: - Preventive - Breakdown - Corrective - Calibration -
Inspection - Shutdown - Improvement

Statuses: Draft → Submitted → Approved → Planned → Assigned → In
Progress → On Hold → Completed → Verified → Closed.

## 10. Spare Inventory

-   Spare master
-   Stock balance
-   Receipt
-   Issue
-   Return
-   Transfer
-   Adjustment
-   Minimum stock
-   Critical spare flag
-   Equipment compatibility

## 11. Vendor / AMC / Warranty

Maintain vendor master, contracts, validity, service visits and
documents.

## 12. Shutdown

-   Shutdown event
-   Job list
-   Equipment list
-   Planned hours
-   Actual hours
-   Manpower
-   Spares
-   Contractors
-   Completion status

## 13. Cost

Track spare, labour, contractor, service and miscellaneous costs against
work orders/equipment.

## 14. Reports

All operational data must be exportable to PDF/Excel where appropriate.
