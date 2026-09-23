# Database Architecture

## 1. Recommended Stack

Initial architecture can use: - Frontend: Web application - Backend/API:
secure application API - Database: PostgreSQL / Supabase - File storage:
object storage - Authentication: role-based authentication - Reporting:
server-generated PDF/Excel

## 2. Core Tables

### Organization

-   organizations
-   plants
-   departments
-   sections
-   areas
-   locations
-   cost_centers

### Assets

-   asset_categories
-   equipment
-   equipment_components
-   equipment_criticality
-   equipment_documents
-   equipment_status_history

### Maintenance

-   maintenance_plans
-   maintenance_plan_tasks
-   maintenance_schedules
-   work_requests
-   work_orders
-   work_order_tasks
-   work_order_assignments
-   work_order_parts
-   work_order_labor
-   work_order_costs
-   maintenance_history

### Breakdown

-   breakdowns
-   failure_modes
-   failure_causes
-   corrective_actions
-   root_cause_analyses

### Inspection

-   inspection_templates
-   inspection_template_items
-   inspections
-   inspection_results
-   inspection_findings

### Calibration

-   instruments
-   calibration_plans
-   calibration_records
-   calibration_certificates

### Inventory

-   spare_categories
-   spare_parts
-   spare_stocks
-   stock_transactions
-   spare_equipment_map
-   stock_locations

### Vendors

-   vendors
-   vendor_contacts
-   contracts
-   contract_services
-   service_visits

### Shutdown

-   shutdown_events
-   shutdown_jobs

### Documents

-   documents
-   document_links

### Users & Security

-   profiles
-   roles
-   permissions
-   role_permissions
-   user_roles
-   approval_rules
-   approval_requests
-   audit_logs
-   notifications

## 3. Multi-Tenant Rule

Every business record must be scoped to an organization. Plant-level
records should additionally carry plant_id where applicable.

## 4. Important Relationships

Organization → Plants → Departments → Areas → Equipment.

Equipment → PM Plans → Schedules → Work Orders.

Equipment → Breakdowns → Work Orders.

Equipment → Calibration Records.

Equipment → Inspection Results.

Work Order → Parts + Labour + Costs + Documents.

## 5. Data Principles

-   Use UUID primary keys.
-   Use created_at, updated_at, created_by, updated_by.
-   Use soft delete for business records where audit retention is
    required.
-   Never hard-delete transactional history.
-   Maintain status history for critical entities.
-   Use database constraints for organization/plant isolation.
