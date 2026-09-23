export type RecordStatus = "active" | "inactive" | "archived";

export type EquipmentStatus =
  | "active"
  | "under_maintenance"
  | "standby"
  | "breakdown"
  | "decommissioned";

export type CriticalityLevel = "critical" | "major" | "normal";

export type WorkOrderType =
  | "preventive"
  | "breakdown"
  | "corrective"
  | "calibration"
  | "inspection"
  | "shutdown"
  | "improvement";

export type WorkOrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "planned"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "verified"
  | "closed"
  | "cancelled";

export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export type BreakdownStatus =
  | "reported"
  | "diagnosing"
  | "repairing"
  | "restored"
  | "closed"
  | "cancelled";

export type CalibrationResult =
  | "pass"
  | "fail"
  | "conditional"
  | "not_applicable";

export type InspectionResult =
  | "pass"
  | "fail"
  | "observation"
  | "not_applicable";

export interface Organization {
  id: string;
  legal_name: string;
  display_name: string;
  code: string;
  industry: string | null;
  timezone: string;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Plant {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  address: string | null;
  timezone: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  organization_id: string;
  plant_id: string;
  code: string;
  name: string;
  department_type: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  employee_code: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  plant_id: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  organization_id: string | null;
  code: string;
  name: string;
  description: string | null;
  system_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

export interface UserRole {
  user_id: string;
  role_id: string;
  plant_id: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_id: string;
}

export interface Equipment {
  id: string;
  organization_id: string;
  plant_id: string;
  equipment_code: string;
  equipment_name: string;
  category_id: string | null;
  parent_equipment_id: string | null;
  department_id: string | null;
  section_id: string | null;
  area_id: string | null;
  location_id: string | null;
  cost_center_id: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  manufacturer: string | null;
  supplier_vendor_id: string | null;
  installation_date: string | null;
  commissioning_date: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_start: string | null;
  warranty_end: string | null;
  amc_start: string | null;
  amc_end: string | null;
  criticality_id: string | null;
  status: EquipmentStatus;
  description: string | null;
  qr_code: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  organization_id: string;
  vendor_code: string;
  name: string;
  vendor_type: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_identifier: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export interface AssetCategory {
  id: string;
  organization_id: string;
  parent_id: string | null;
  code: string;
  name: string;
  description: string | null;
  status: RecordStatus;
}

export interface CriticalityProfile {
  id: string;
  organization_id: string;
  code: string;
  name: string;
  level: CriticalityLevel;
  safety_score: number | null;
  production_score: number | null;
  quality_score: number | null;
  environmental_score: number | null;
  failure_frequency_score: number | null;
  repair_time_score: number | null;
  spare_availability_score: number | null;
  backup_availability_score: number | null;
  total_score: number | null;
  description: string | null;
}

export interface EquipmentComponent {
  id: string;
  organization_id: string;
  equipment_id: string;
  component_code: string;
  component_name: string;
  component_type: string | null;
  make: string | null;
  model: string | null;
  serial_number: string | null;
  criticality: CriticalityLevel;
  status: RecordStatus;
  remarks: string | null;
}

export interface EquipmentStatusHistory {
  id: string;
  organization_id: string;
  equipment_id: string;
  old_status: EquipmentStatus | null;
  new_status: EquipmentStatus;
  reason: string | null;
  changed_at: string;
  changed_by: string | null;
}

export interface Location {
  id: string;
  organization_id: string;
  plant_id: string;
  area_id: string | null;
  code: string;
  name: string;
  description: string | null;
}

export interface Area {
  id: string;
  organization_id: string;
  plant_id: string;
  section_id: string | null;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface Section {
  id: string;
  organization_id: string;
  plant_id: string;
  department_id: string | null;
  code: string;
  name: string;
  status: RecordStatus;
}

export interface CostCenter {
  id: string;
  organization_id: string;
  plant_id: string;
  code: string;
  name: string;
  description: string | null;
  status: RecordStatus;
}

export interface EquipmentWithRelations extends Equipment {
  asset_categories?: Pick<AssetCategory, "name"> | null;
  criticality_profiles?: Pick<CriticalityProfile, "name" | "level"> | null;
  plants?: Pick<Plant, "name"> | null;
  locations?: Pick<Location, "name"> | null;
  departments?: Pick<Department, "name"> | null;
  sections?: Pick<Section, "name"> | null;
}

export interface WorkOrder {
  id: string;
  organization_id: string;
  plant_id: string;
  work_order_no: string;
  work_request_id: string | null;
  equipment_id: string | null;
  maintenance_plan_id: string | null;
  type: WorkOrderType;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  title: string;
  description: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  verified_by: string | null;
  verified_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  closure_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface Breakdown {
  id: string;
  organization_id: string;
  plant_id: string;
  breakdown_no: string;
  equipment_id: string;
  reported_by: string | null;
  reported_at: string;
  breakdown_start: string | null;
  restored_at: string | null;
  problem_description: string;
  failure_mode_id: string | null;
  failure_cause_id: string | null;
  root_cause: string | null;
  action_taken: string | null;
  downtime_minutes: number | null;
  production_impact: string | null;
  status: BreakdownStatus;
  linked_work_order_id: string | null;
}

export interface MaintenancePlan {
  id: string;
  organization_id: string;
  plant_id: string;
  equipment_id: string;
  plan_code: string;
  name: string;
  maintenance_type: string;
  frequency_type: string;
  frequency_value: number;
  start_date: string;
  estimated_duration_minutes: number | null;
  responsible_role_id: string | null;
  responsible_user_id: string | null;
  priority: PriorityLevel;
  safety_instructions: string | null;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceSchedule {
  id: string;
  organization_id: string;
  plant_id: string;
  maintenance_plan_id: string;
  equipment_id: string;
  scheduled_date: string;
  due_date: string;
  status: string;
  generated_work_order_id: string | null;
  completed_at: string | null;
}

export interface Inspection {
  id: string;
  organization_id: string;
  plant_id: string;
  inspection_no: string;
  template_id: string;
  equipment_id: string;
  inspector_id: string | null;
  scheduled_date: string | null;
  performed_at: string | null;
  status: string;
  overall_result: InspectionResult | null;
  remarks: string | null;
}

export interface SparePart {
  id: string;
  organization_id: string;
  part_code: string;
  part_name: string;
  category_id: string | null;
  part_number: string | null;
  make: string | null;
  unit: string | null;
  minimum_stock: number | null;
  maximum_stock: number | null;
  reorder_level: number | null;
  critical_spare: boolean;
  description: string | null;
}

export interface SpareEquipmentMap {
  id: string;
  organization_id: string;
  spare_part_id: string;
  equipment_id: string;
  recommended_quantity: number | null;
}

export interface Document {
  id: string;
  organization_id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  document_type: string | null;
  checksum: string | null;
  status: RecordStatus;
}

export interface DocumentLink {
  id: string;
  organization_id: string;
  document_id: string;
  entity_type: string;
  entity_id: string;
}

export interface ServiceVisit {
  id: string;
  organization_id: string;
  contract_id: string | null;
  equipment_id: string | null;
  visit_date: string;
  engineer_name: string | null;
  observations: string | null;
  action_taken: string | null;
  next_visit_date: string | null;
}

export interface Notification {
  id: string;
  organization_id: string | null;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}
