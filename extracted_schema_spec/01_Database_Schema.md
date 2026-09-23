# Brilliants Industrial Maintenance ERP --- Database Schema

## Architecture

Recommended: PostgreSQL / Supabase.

Every tenant-owned business table must contain `organization_id`.
Plant-scoped tables should contain `plant_id`. Use UUID primary keys and
UTC timestamps.

## Common Columns

Most business tables: - id uuid PK - organization_id uuid NOT NULL -
created_at timestamptz NOT NULL - updated_at timestamptz NOT NULL -
created_by uuid - updated_by uuid - is_active boolean DEFAULT true

Transactional records should generally use status/archive instead of
hard delete.

## Core Tables

### organizations

-   id
-   legal_name
-   display_name
-   code
-   industry
-   timezone
-   country
-   state
-   city
-   address
-   contact_email
-   contact_phone
-   status

### plants

-   id
-   organization_id
-   code
-   name
-   address
-   timezone
-   status

### departments

-   id
-   organization_id
-   plant_id
-   code
-   name
-   department_type
-   status

### sections

-   id
-   organization_id
-   plant_id
-   department_id
-   code
-   name
-   status

### areas

-   id
-   organization_id
-   plant_id
-   section_id
-   code
-   name
-   status

### locations

-   id
-   organization_id
-   plant_id
-   area_id
-   code
-   name
-   description

### cost_centers

-   id
-   organization_id
-   plant_id
-   code
-   name
-   description
-   status

## Asset Tables

### asset_categories

-   id
-   organization_id
-   parent_id
-   code
-   name
-   description

### equipment

-   id
-   organization_id
-   plant_id
-   equipment_code
-   equipment_name
-   category_id
-   parent_equipment_id
-   department_id
-   section_id
-   area_id
-   location_id
-   cost_center_id
-   make
-   model
-   serial_number
-   capacity
-   capacity_unit
-   manufacturer
-   supplier_vendor_id
-   installation_date
-   commissioning_date
-   purchase_date
-   purchase_cost
-   warranty_start
-   warranty_end
-   amc_start
-   amc_end
-   criticality_id
-   status
-   description
-   qr_code
-   photo_url

Unique recommendation: `(organization_id, equipment_code)`.

### equipment_components

-   id
-   organization_id
-   equipment_id
-   component_code
-   component_name
-   component_type
-   make
-   model
-   serial_number
-   criticality
-   status
-   remarks

### criticality_profiles

-   id
-   organization_id
-   code
-   name
-   level
-   safety_score
-   production_score
-   quality_score
-   environmental_score
-   failure_frequency_score
-   repair_time_score
-   spare_availability_score
-   backup_availability_score
-   total_score
-   description

### equipment_status_history

-   id
-   organization_id
-   equipment_id
-   old_status
-   new_status
-   reason
-   changed_at
-   changed_by

## Maintenance Tables

### maintenance_plans

-   id
-   organization_id
-   plant_id
-   equipment_id
-   plan_code
-   name
-   maintenance_type
-   frequency_type
-   frequency_value
-   start_date
-   estimated_duration_minutes
-   responsible_role_id
-   responsible_user_id
-   priority
-   safety_instructions
-   status

### maintenance_plan_tasks

-   id
-   organization_id
-   maintenance_plan_id
-   sequence_no
-   task_name
-   task_description
-   task_type
-   standard_value
-   tolerance
-   unit
-   mandatory
-   safety_note

### maintenance_schedules

-   id
-   organization_id
-   plant_id
-   maintenance_plan_id
-   equipment_id
-   scheduled_date
-   due_date
-   status
-   generated_work_order_id
-   completed_at

### work_requests

-   id
-   organization_id
-   plant_id
-   request_no
-   requested_by
-   equipment_id
-   request_type
-   priority
-   requested_at
-   description
-   status
-   reviewed_by
-   reviewed_at

### work_orders

-   id
-   organization_id
-   plant_id
-   work_order_no
-   work_request_id
-   equipment_id
-   maintenance_plan_id
-   type
-   priority
-   status
-   title
-   description
-   planned_start
-   planned_end
-   actual_start
-   actual_end
-   verified_by
-   verified_at
-   closed_by
-   closed_at
-   closure_remarks

### work_order_tasks

-   id
-   organization_id
-   work_order_id
-   plan_task_id
-   sequence_no
-   task_name
-   result
-   numeric_value
-   unit
-   pass_fail
-   remarks
-   completed_by
-   completed_at

### work_order_assignments

-   id
-   organization_id
-   work_order_id
-   user_id
-   assignment_role
-   assigned_at
-   started_at
-   completed_at

### work_order_labor

-   id
-   organization_id
-   work_order_id
-   user_id
-   hours
-   hourly_rate
-   amount

### work_order_costs

-   id
-   organization_id
-   work_order_id
-   cost_type
-   description
-   amount
-   reference_no

## Breakdown / Corrective Tables

### breakdowns

-   id
-   organization_id
-   plant_id
-   breakdown_no
-   equipment_id
-   reported_by
-   reported_at
-   breakdown_start
-   restored_at
-   problem_description
-   failure_mode_id
-   failure_cause_id
-   root_cause
-   action_taken
-   downtime_minutes
-   production_impact
-   status
-   linked_work_order_id

### failure_modes

-   id
-   organization_id
-   code
-   name
-   description

### failure_causes

-   id
-   organization_id
-   code
-   name
-   description

### corrective_actions

-   id
-   organization_id
-   equipment_id
-   source_type
-   source_id
-   action
-   responsible_user_id
-   due_date
-   completed_date
-   status
-   verification_remarks

### root_cause_analyses

-   id
-   organization_id
-   equipment_id
-   breakdown_id
-   method
-   problem_statement
-   root_cause
-   corrective_action
-   preventive_action
-   approved_by
-   approved_at

## Inspection / Calibration

### inspection_templates

-   id
-   organization_id
-   plant_id
-   code
-   name
-   equipment_category_id
-   frequency_type
-   frequency_value
-   status

### inspection_template_items

-   id
-   organization_id
-   inspection_template_id
-   sequence_no
-   checkpoint
-   expected_condition
-   measurement_required
-   unit
-   min_value
-   max_value
-   mandatory

### inspections

-   id
-   organization_id
-   plant_id
-   inspection_no
-   template_id
-   equipment_id
-   inspector_id
-   scheduled_date
-   performed_at
-   status
-   overall_result
-   remarks

### inspection_results

-   id
-   organization_id
-   inspection_id
-   template_item_id
-   result
-   numeric_value
-   unit
-   observation
-   pass_fail
-   corrective_action_id

### instruments

-   id
-   organization_id
-   plant_id
-   instrument_code
-   instrument_name
-   instrument_type
-   department_id
-   location_id
-   make
-   model
-   serial_number
-   range_min
-   range_max
-   unit
-   accuracy
-   calibration_frequency_value
-   calibration_frequency_unit
-   status

### calibration_records

-   id
-   organization_id
-   plant_id
-   instrument_id
-   calibration_date
-   next_due_date
-   agency_vendor_id
-   certificate_number
-   method
-   result
-   as_found
-   as_left
-   remarks
-   performed_by
-   approved_by
-   status

## Inventory

### spare_categories

-   id
-   organization_id
-   code
-   name

### spare_parts

-   id
-   organization_id
-   part_code
-   part_name
-   category_id
-   part_number
-   make
-   unit
-   minimum_stock
-   maximum_stock
-   reorder_level
-   critical_spare
-   description

### spare_equipment_map

-   id
-   organization_id
-   spare_part_id
-   equipment_id
-   recommended_quantity

### stock_locations

-   id
-   organization_id
-   plant_id
-   code
-   name

### spare_stocks

-   id
-   organization_id
-   spare_part_id
-   stock_location_id
-   quantity
-   reserved_quantity

### stock_transactions

-   id
-   organization_id
-   plant_id
-   spare_part_id
-   stock_location_id
-   transaction_type
-   quantity
-   reference_type
-   reference_id
-   transaction_date
-   performed_by
-   remarks

### work_order_parts

-   id
-   organization_id
-   work_order_id
-   spare_part_id
-   quantity
-   unit_cost
-   amount
-   stock_transaction_id

## Vendors / Contracts

### vendors

-   id
-   organization_id
-   vendor_code
-   name
-   vendor_type
-   contact_person
-   phone
-   email
-   address
-   tax_identifier
-   status

### contracts

-   id
-   organization_id
-   plant_id
-   vendor_id
-   contract_no
-   contract_type
-   start_date
-   end_date
-   amount
-   scope
-   status
-   document_id

### service_visits

-   id
-   organization_id
-   contract_id
-   equipment_id
-   visit_date
-   engineer_name
-   observations
-   action_taken
-   next_visit_date
-   document_id

## Shutdown

### shutdown_events

-   id
-   organization_id
-   plant_id
-   shutdown_no
-   name
-   planned_start
-   planned_end
-   actual_start
-   actual_end
-   status
-   remarks

### shutdown_jobs

-   id
-   organization_id
-   shutdown_id
-   equipment_id
-   work_order_id
-   job_description
-   planned_hours
-   actual_hours
-   priority
-   status
-   remarks

## Documents

### documents

-   id
-   organization_id
-   file_name
-   storage_path
-   file_type
-   file_size
-   uploaded_by
-   uploaded_at
-   document_type
-   checksum
-   status

### document_links

-   id
-   organization_id
-   document_id
-   entity_type
-   entity_id

## Users / Security

### profiles

-   id
-   organization_id
-   employee_code
-   name
-   email
-   phone
-   department_id
-   plant_id
-   status

### roles

-   id
-   organization_id
-   code
-   name
-   description
-   system_role

### permissions

-   id
-   module
-   action
-   description

### role_permissions

-   role_id
-   permission_id

### user_roles

-   user_id
-   role_id
-   plant_id

### approval_rules

-   id
-   organization_id
-   module
-   threshold_type
-   threshold_value
-   approver_role_id
-   sequence_no
-   active

### approval_requests

-   id
-   organization_id
-   module
-   record_id
-   requested_by
-   status
-   current_step
-   submitted_at
-   completed_at

### audit_logs

-   id
-   organization_id
-   user_id
-   entity_type
-   entity_id
-   action
-   old_data jsonb
-   new_data jsonb
-   created_at

### notifications

-   id
-   organization_id
-   user_id
-   type
-   title
-   message
-   entity_type
-   entity_id
-   read_at
-   created_at
