# Brilliants Maintenance ERP — Services Layer

All service functions return `{ data, error }` (lists may add `count`). They wrap Supabase
calls on the module's table(s). Two styles coexist: **flat files** (`src/services/<module>.ts`)
and **directory modules** (`src/services/<module>/index.ts`) — the directory modules are newer
and feature-complete; the flat files are kept alongside.

## src/services/equipment.ts (flat — used by equipment detail page)

| Function | Tables / operation | Notes |
|---|---|---|
| `getEquipmentList()` | `equipment` select + joins `plants(name)`, `asset_categories(name)` | order by `equipment_code` |
| `getEquipment(id)` | `equipment` select `*` single | |
| `addEquipmentComponent(equipmentId, payload)` | `equipment_components` insert | payload: `component_name`, `component_type?`, `specification?`, `part_code_ref?` |
| `getEquipmentComponents(equipmentId)` | `equipment_components` select | order by `component_name` |
| `updateEquipmentComponent(id, payload)` | `equipment_components` update | |
| `deleteEquipmentComponent(id)` | `equipment_components` delete | |
| `getEquipmentStatusHistory(equipmentId)` | `equipment_status_history` select | order by `created_at` desc |

## src/services/equipment/ (directory module)

| Function | Signature | Tables / operation |
|---|---|---|
| `getEquipments` | `(params?: GetEquipmentsParams)` → `{data,count,error}` | `equipment` select + joins (`asset_categories`, `criticality_profiles`, `plants`, `locations`); filters (plant/department/category/criticality/status/manufacturer/search); range pagination; exact count |
| `getEquipment` | `(id: string)` → `{data,error}` | `equipment` select `*` + full hierarchy joins + `vendors` as `suppliers`; single |
| `createEquipment` | `(values: Record<string, unknown>)` | `equipment` insert, single |
| `updateEquipment` | `(id, values)` | `equipment` update, single |
| `archiveEquipment` | `(id)` | `equipment` update `{ status: 'decommissioned' }` |
| `changeEquipmentStatus` | `(id, newStatus, reason?)` | `equipment` select status → update `{status}` → **`equipment_status_history` insert** (`{ organization_id, equipment_id, old_status, new_status, reason }`) |
| `getEquipmentComponents` | `(equipmentId)` | `equipment_components` select, order `component_code` |
| `getEquipmentStatusHistory` | `(equipmentId)` | `equipment_status_history` select, order `changed_at` desc |
| `addEquipmentComponent` | `(values)` | `equipment_components` insert, single |
| `updateEquipmentComponent` | `(id, values)` | `equipment_components` update, single |
| `deleteEquipmentComponent` | `(id)` | `equipment_components` delete |

`GetEquipmentsParams`: `{ plantId?, departmentId?, categoryId?, criticalityId?, status?,
manufacturer?, search?, page?, pageSize? }`.

## src/services/work-orders.ts (flat)

| Function | Tables / operation |
|---|---|
| `getWorkOrderList()` | `work_orders` select, order `created_at` desc |
| `getWorkOrder(id)` | `work_orders` select `*` single |
| `createWorkOrder(payload)` | `work_orders` insert |
| `updateWorkOrder(id, payload)` | `work_orders` update |
| `deleteWorkOrder(id)` | `work_orders` delete |
| `updateWorkOrderStatus(id, status)` | `work_orders` update `{ status }` |

## src/services/work-orders/ (directory module)

| Function | Signature | Tables / operation |
|---|---|---|
| `getWorkOrders` | `(params?: GetWorkOrdersParams)` → `{data,count,error}` | `work_orders` select + joins (`plants`, `equipment`); filters (plant/equipment/type/priority/status/search); pagination; exact count |
| `getWorkOrder` | `(id)` | `work_orders` select `*` + `plants(name)`, `equipment(equipment_code, equipment_name)`, `maintenance_plans(plan_code, name)`, `work_requests(work_request_no)`; single |
| `createWorkOrder` | `(values)` | `work_orders` insert, single |
| `updateWorkOrder` | `(id, values)` | `work_orders` update, single |
| `changeWorkOrderStatus` | `(id, newStatus, remarks?)` | `work_orders` select status → update `{ status }` → **`work_order_statuses` insert** `{ work_order_no, old_status, new_status, remarks }` |
| `cancelWorkOrder` | `(id)` | delegates to `changeWorkOrderStatus(id, 'cancelled')` |
| `archiveWorkOrder` | `(id)` | delegates to `changeWorkOrderStatus(id, 'closed')` |
| `getWorkOrderStatusHistory` | `(id)` | **`work_order_status_history`** select (different table than the one `changeWorkOrderStatus` writes) |
| `getWorkOrderActivities` | `(workOrderId)` | `work_order_activities` select, order `started_at` desc |
| `addWorkOrderActivity` | `(values)` | `work_order_activities` insert, single |
| `deleteWorkOrderActivity` | `(id)` | `work_order_activities` delete |

`GetWorkOrdersParams`: `{ plantId?, equipmentId?, type?, priority?, status?, search?, page?,
pageSize? }`.

## src/services/maintenance.ts

| Function | Tables / operation |
|---|---|
| `getMaintenanceScheduleList()` | `maintenance_schedules` select, order `next_run_at` asc |
| `getMaintenanceSchedule(id)` | `maintenance_schedules` select single |
| `createMaintenanceSchedule(payload)` | `maintenance_schedules` insert |
| `updateMaintenanceSchedule(id, payload)` | `maintenance_schedules` update |
| `deleteMaintenanceSchedule(id)` | `maintenance_schedules` delete |

## src/services/breakdowns.ts

| Function | Tables / operation |
|---|---|
| `getBreakdownList()` | `breakdowns` select, order `reported_at` desc |
| `getBreakdown(id)` | `breakdowns` select single |
| `createBreakdown(payload)` | `breakdowns` insert |
| `updateBreakdown(id, payload)` | `breakdowns` update |
| `deleteBreakdown(id)` | `breakdowns` delete |
| `resolveBreakdown(id, { resolution, status, resolved_at, downtime_minutes })` | `breakdowns` update |

## src/services/spare-parts.ts (flat — legacy)

| Function | Tables / operation |
|---|---|
| `getSparePart(id)` | `spare_parts` select single |
| `addSparePartComponent(sparePartId, payload)` | `spare_part_components` insert (`{ spare_part_id, part_code, part_name, quantity }`) |
| `getSparePartComponents(sparePartId)` | `spare_part_components` select, order `part_name` |
| `updateSparePartComponent(id, payload)` | `spare_part_components` update |
| `deleteSparePartComponent(id)` | `spare_part_components` delete |
| `getSparePartStockHistory(sparePartId)` | `spare_part_stock_movements` select, order `created_at` desc |

## src/services/spare-parts/ (directory module)

| Function | Signature | Tables / operation |
|---|---|---|
| `getSpareParts` | `(params?: GetSparePartsParams)` → `{data,count,error}` | `spare_parts` select + `spare_part_plants!inner(quantity, plant_id)`; filters `spare_part_plants.plant_id`, `category`, search, `lowStockOnly` (`lt current_stock reorder_level`), `outOfStockOnly` (`eq current_stock 0`); order `part_code`. ⚠ off-by-one in range end (`pageSize - 1 - 1`). |
| `getSparePart` | `(id)` | `spare_parts` select single |
| `createSparePart` | `(values)` | `spare_parts` insert, single |
| `updateSparePart` | `(id, values)` | `spare_parts` update, single |
| `deleteSparePart` | `(id)` | `spare_parts` delete |
| `getStockMovements` | `(params?: GetStockMovementsParams)` → `{data,count,error}` | `stock_movements` select; filters `part_id`, `plant_id`, `movement_type`; order `created_at` desc; exact count |
| `createStockMovement` | `(values)` | `stock_movements` insert, single |
| `getTrackingRecords` | `(workOrderId)` | `stock_movements` select + `work_orders!inner(id, work_order_no)` where `work_order_id` |
| `getPlants` | `()` | `plants` select `id, name`, order `name` |

Types (`src/services/spare-parts/types.ts`):

- `SparePartPlant` `{ id, part_id, plant_id, quantity, location, created_at }`
- `StockMovement` `{ id, part_id, plant_id, movement_type (purchase_in | return_in |
  workorder_issue | breakdown_use | adjustment | scrap_out | transfer_out | transfer_in),
  quantity, from_plant_id, to_plant_id, work_order_id, reference_no, note, created_by,
  created_at }` — note the movement type includes `transfer_out/in` that the DB `CHECK` does not.
- `GetSparePartsParams` `{ plantId?, category?, search?, lowStockOnly?, outOfStockOnly?, page?,
  pageSize? }`
- `GetStockMovementsParams` `{ partId?, plantId?, movementType?, page?, pageSize? }`

## Validation schemas (`src/lib/validation/`)

| File | Exports | Constraint highlights |
|---|---|---|
| `equipment.ts` | `equipmentSchema`, `criticalitySchema`, `assetCategorySchema`, `equipmentComponentSchema` | required `equipment_code/name/plant_id`; statuses as enums; numeric score fields coerced nullable |
| `work-orders.ts` | `workOrderSchema`, `workOrderStatusSchema` | required `work_order_no`, `plant_id`, `title`; `.refine` `planned_end >= planned_start`; type/priority/status enums |
| `spare-parts.ts` | `sparePartSchema`, `sparePartPlantSchema`, `stockMovementSchema` | `part_code` 2–30; `.refine` `reorder_level >= min_stock`; movement `quantity > 0`; movement types enum (incl. `transfer`, excl. `transfer_in/out`) |
| `breakdowns.tsx` | `breakdownSchema` + default export **`BreakdownForm`** (shared react-hook-form component) | required `report_no/title/plant_id/equipment_id/category/reported_at`; diagnosis/repair fields optional |

## Page ↔ service usage map (which services the pages call)

- `/equipment/[id]` → flat `equipment.ts` (getEquipment, components, history).
- `/work-orders*` → flat `work-orders.ts` (list/detail pages).
- `/breakdowns*` → flat `breakdowns.ts` + shared `BreakdownForm`.
- `/spare-parts*` and `/inventory` → flat `spare-parts.ts` (detail/components/history) and the
  directory module service for list/detail/stock; `stock` page writes `stock_movements` directly.
- `/maintenance*` → flat `maintenance.ts`.
- `/vendors*`, `/inspections*`, `/reports`, `/dashboard` → inline Supabase queries in the page
  (no service module for these).
- `/settings/*` → inline Supabase queries.

> Note: the directory modules (`equipment/`, `work-orders/`, `spare-parts/`) contain richer
> functions (pagination, status history, activities) that most pages do not use yet — a
> consolidation opportunity. See [KNOWN-GAPS](KNOWN-GAPS.md).