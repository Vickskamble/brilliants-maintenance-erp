# Indexes & Constraints

## High-Priority Unique Constraints

-   organizations.code
-   plants `(organization_id, code)`
-   departments `(organization_id, plant_id, code)`
-   equipment `(organization_id, equipment_code)`
-   work_orders `(organization_id, work_order_no)`
-   work_requests `(organization_id, request_no)`
-   breakdowns `(organization_id, breakdown_no)`
-   inspections `(organization_id, inspection_no)`
-   instruments `(organization_id, instrument_code)`
-   spare_parts `(organization_id, part_code)`
-   vendors `(organization_id, vendor_code)`
-   shutdown_events `(organization_id, shutdown_no)`

## High-Priority Indexes

-   equipment `(organization_id, plant_id, status)`
-   equipment `(organization_id, criticality_id)`
-   maintenance_schedules
    `(organization_id, plant_id, scheduled_date, status)`
-   work_orders `(organization_id, plant_id, status, priority)`
-   work_orders `(organization_id, equipment_id)`
-   breakdowns `(organization_id, equipment_id, breakdown_start)`
-   calibration_records
    `(organization_id, instrument_id, next_due_date)`
-   stock_transactions
    `(organization_id, spare_part_id, transaction_date)`
-   audit_logs `(organization_id, entity_type, entity_id, created_at)`
-   notifications `(user_id, read_at, created_at)`

## Foreign Keys

Use foreign keys for all core relationships. Define explicit ON DELETE
behavior.

For transactional parents, prefer `RESTRICT` rather than cascading
deletes.

## Data Validation

-   Dates must be logically ordered.
-   Quantity cannot be negative unless transaction type explicitly
    represents reversal.
-   Calibration next_due_date must be \>= calibration_date.
-   Work order actual completion cannot precede actual start.
-   Equipment cannot reference itself as parent.
