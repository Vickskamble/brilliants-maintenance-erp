# ERD Relationships

## Organization

`organizations 1 ── N plants`

`plants 1 ── N departments`

`departments 1 ── N sections`

`sections 1 ── N areas`

`areas 1 ── N locations`

## Equipment

`asset_categories 1 ── N equipment`

`equipment 1 ── N equipment_components`

`equipment 1 ── N equipment_status_history`

`equipment 1 ── N maintenance_plans`

`equipment 1 ── N breakdowns`

`equipment 1 ── N inspections`

`equipment 1 ── N calibration_records` (where equipment is also
represented as an instrument if needed)

## Maintenance

`maintenance_plans 1 ── N maintenance_plan_tasks`

`maintenance_plans 1 ── N maintenance_schedules`

`maintenance_schedules 0..1 ── 1 work_orders`

`work_requests 0..1 ── N work_orders`

`work_orders 1 ── N work_order_tasks`

`work_orders 1 ── N work_order_assignments`

`work_orders 1 ── N work_order_parts`

`work_orders 1 ── N work_order_labor`

`work_orders 1 ── N work_order_costs`

## Inventory

`spare_parts N ── N equipment` through `spare_equipment_map`

`spare_parts 1 ── N spare_stocks`

`spare_parts 1 ── N stock_transactions`

## Calibration

`instruments 1 ── N calibration_records`

## Inspection

`inspection_templates 1 ── N inspection_template_items`

`inspection_templates 1 ── N inspections`

`inspections 1 ── N inspection_results`

## Documents

`documents 1 ── N document_links`

The polymorphic document_links table should be protected by
application-level validation of entity_type/entity_id.

## Security

`profiles N ── 1 organizations`

`profiles N ── N roles` through `user_roles`

`roles N ── N permissions` through `role_permissions`
