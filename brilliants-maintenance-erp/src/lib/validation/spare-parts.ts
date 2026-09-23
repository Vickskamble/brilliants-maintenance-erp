import { z } from "zod";

export const sparePartSchema = z
  .object({
    part_code: z
      .string()
      .min(2, "Part code is required")
      .max(30, "Part code must be 30 characters or less"),
    part_name: z.string().min(2, "Part name is required"),
    category: z.enum([
      "electrical",
      "mechanical",
      "instrumentation",
      "pneumatic",
      "lubricants",
      "consumables",
      "hydraulics",
      "bearings",
    ]),
    unit: z.enum([
      "pcs",
      "box",
      "pack",
      "set",
      "roll",
      "mtr",
      "ltr",
      "kg",
      "pair",
      "dozen",
    ]),
    min_stock: z.coerce.number().min(0, "Min stock cannot be negative").default(0),
    reorder_level: z.coerce.number().min(0, "Reorder level cannot be negative").default(0),
    location: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  })
  .refine((data) => data.reorder_level >= data.min_stock, {
    message: "Reorder level must be at least the minimum stock level",
    path: ["reorder_level"],
  });

export const sparePartPlantSchema = z.object({
  plant_id: z.string().min(1, "Plant is required"),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative"),
  location: z.string().nullable().optional(),
});

export const stockMovementSchema = z.object({
  part_id: z.string().min(1, "Part is required"),
  movement_type: z.enum([
    "purchase_in",
    "return_in",
    "workorder_issue",
    "breakdown_use",
    "adjustment",
    "scrap_out",
    "transfer",
  ]),
  quantity: z.coerce.number().refine((n) => n > 0, {
    message: "Quantity must be greater than zero",
  }),
  unit: z.enum(["pcs", "box", "pack", "set", "roll", "mtr", "ltr", "kg", "pair", "dozen"]),
  from_plant_id: z.string().nullable().optional(),
  to_plant_id: z.string().nullable().optional(),
  work_order_id: z.string().nullable().optional(),
  reference_no: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

export type SparePartFormValues = z.infer<typeof sparePartSchema>;
export type SparePartPlantFormValues = z.infer<typeof sparePartPlantSchema>;
export type StockMovementFormValues = z.infer<typeof stockMovementSchema>;
