import { z } from "zod";

export const materialIssueLineSchema = z.object({
  spare_part_id: z.string().min(1, "Select a spare part"),
  quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be greater than zero"),
  unit: z.string().optional(),
  remarks: z.string().nullable().optional(),
});

export const materialIssueSchema = z
  .object({
    issue_date: z.string().min(1, "Issue date is required"),
    plant_id: z.string().min(1, "Plant is required"),
    issued_to_type: z.enum(["department", "equipment", "work_order", "employee", "other"]),
    department_id: z.string().nullable().optional(),
    equipment_id: z.string().nullable().optional(),
    work_order_id: z.string().nullable().optional(),
    issued_to_name: z.string().nullable().optional(),
    purpose: z.string().nullable().optional(),
    remarks: z.string().nullable().optional(),
    items: z.array(materialIssueLineSchema).min(1, "Add at least one item"),
  })
  .superRefine((value, ctx) => {
    if (value.issued_to_type === "department" && !value.department_id) {
      ctx.addIssue({
        code: "custom",
        path: ["department_id"],
        message: "Department is required",
      });
    }
    if (value.issued_to_type === "equipment" && !value.equipment_id) {
      ctx.addIssue({
        code: "custom",
        path: ["equipment_id"],
        message: "Equipment is required",
      });
    }
    if (value.issued_to_type === "work_order" && !value.work_order_id) {
      ctx.addIssue({
        code: "custom",
        path: ["work_order_id"],
        message: "Work order is required",
      });
    }
    if (
      (value.issued_to_type === "employee" || value.issued_to_type === "other") &&
      !value.issued_to_name?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["issued_to_name"],
        message: "Name is required",
      });
    }
  });

export type MaterialIssueFormValues = z.infer<typeof materialIssueSchema>;
export type MaterialIssueLineFormValues = z.infer<typeof materialIssueLineSchema>;
