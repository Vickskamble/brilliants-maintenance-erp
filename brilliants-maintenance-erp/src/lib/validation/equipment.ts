import { z } from "zod";

export const equipmentSchema = z.object({
  equipment_code: z.string().min(1, "Equipment code is required"),
  equipment_name: z.string().min(1, "Equipment name is required"),
  plant_id: z.string().min(1, "Plant is required"),
  category_id: z.string().nullable(),
  parent_equipment_id: z.string().nullable(),
  department_id: z.string().nullable(),
  section_id: z.string().nullable(),
  area_id: z.string().nullable(),
  location_id: z.string().nullable(),
  cost_center_id: z.string().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  serial_number: z.string().nullable(),
  capacity: z.coerce.number().nullable().optional(),
  capacity_unit: z.string().nullable(),
  manufacturer: z.string().nullable(),
  supplier_vendor_id: z.string().nullable(),
  installation_date: z.string().nullable(),
  commissioning_date: z.string().nullable(),
  purchase_date: z.string().nullable(),
  purchase_cost: z.coerce.number().nullable().optional(),
  warranty_start: z.string().nullable(),
  warranty_end: z.string().nullable(),
  amc_start: z.string().nullable(),
  amc_end: z.string().nullable(),
  criticality_id: z.string().nullable(),
  status: z.enum([
    "active",
    "under_maintenance",
    "standby",
    "breakdown",
    "decommissioned",
  ]),
  description: z.string().nullable(),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;

export const criticalitySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  level: z.enum(["critical", "major", "normal"]),
  safety_score: z.coerce.number().nullable().optional(),
  production_score: z.coerce.number().nullable().optional(),
  quality_score: z.coerce.number().nullable().optional(),
  environmental_score: z.coerce.number().nullable().optional(),
  failure_frequency_score: z.coerce.number().nullable().optional(),
  repair_time_score: z.coerce.number().nullable().optional(),
  spare_availability_score: z.coerce.number().nullable().optional(),
  backup_availability_score: z.coerce.number().nullable().optional(),
  description: z.string().nullable(),
});

export type CriticalityFormValues = z.infer<typeof criticalitySchema>;

export const assetCategorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().nullable(),
  description: z.string().nullable(),
});

export type AssetCategoryFormValues = z.infer<typeof assetCategorySchema>;

export const equipmentComponentSchema = z.object({
  component_code: z.string().min(1, "Component code is required"),
  component_name: z.string().min(1, "Component name is required"),
  component_type: z.string().nullable(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  serial_number: z.string().nullable(),
  criticality: z.enum(["critical", "major", "normal"]),
  status: z.enum(["active", "inactive", "archived"]),
  remarks: z.string().nullable(),
});

export type EquipmentComponentFormValues = z.infer<
  typeof equipmentComponentSchema
>;