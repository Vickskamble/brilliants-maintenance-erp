import { z } from "zod";

export const workOrderSchema = z
  .object({
    work_order_no: z.string().min(1, "Work order no is required"),
    plant_id: z.string().min(1, "Plant is required"),
    work_request_id: z.string().nullable(),
    equipment_id: z.string().nullable(),
    maintenance_plan_id: z.string().nullable(),
    assigned_to: z.string().nullable(),
    type: z.enum([
      "preventive",
      "breakdown",
      "corrective",
      "calibration",
      "inspection",
      "shutdown",
      "improvement",
    ]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    status: z.enum([
      "draft",
      "submitted",
      "approved",
      "planned",
      "assigned",
      "in_progress",
      "on_hold",
      "completed",
      "verified",
      "closed",
      "cancelled",
    ]),
    title: z.string().min(1, "Title is required"),
    description: z.string().nullable(),
    planned_start: z.string().nullable(),
    planned_end: z.string().nullable(),
    actual_start: z.string().nullable(),
    actual_end: z.string().nullable(),
    closure_remarks: z.string().nullable(),
  })
  .refine(
    (v) =>
      !v.planned_start ||
      !v.planned_end ||
      new Date(v.planned_end) >= new Date(v.planned_start),
    { path: ["planned_end"], message: "Planned end must be after start" }
  );

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

export const workOrderStatusSchema = z.object({
  status: z.enum([
    "draft",
    "submitted",
    "approved",
    "planned",
    "assigned",
    "in_progress",
    "on_hold",
    "completed",
    "verified",
    "closed",
    "cancelled",
  ]),
  remarks: z.string().nullable(),
});

export type WorkOrderStatusFormValues = z.infer<typeof workOrderStatusSchema>;
