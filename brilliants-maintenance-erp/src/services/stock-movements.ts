import { createClient } from "@/lib/supabase/client";

/**
 * Movement types whose per-plant quantity in `spare_part_stock` is kept in
 * sync by the `sync_spare_part_plant` DB trigger on `stock_movements` inserts
 * (the trigger only fires for purchase_in / transfer / return_in).
 *
 * For every other type the application adjusts `spare_part_stock` itself —
 * doing so for the trigger-handled types would double count.
 */
export const PLANT_AUTO_SYNCED_TYPES = ["purchase_in", "return_in", "transfer"];

/** Movement types that increase stock. Everything else decreases it. */
export function movementDirection(movementType: string): 1 | -1 {
  return movementType === "purchase_in" || movementType === "return_in" ? 1 : -1;
}

export interface StockMovementInput {
  sparePartId: string;
  organizationId?: string | null;
  plantId?: string | null;
  movementType: string;
  /** Positive for stock-in, negative for stock-out. */
  signedQuantity: number;
  referenceNo?: string | null;
  note?: string | null;
  createdBy?: string | null;
  workOrderId?: string | null;
}

/**
 * Applies a stock movement consistently with the database triggers:
 *  - `stock_movements` is the canonical ledger. Its insert trigger keeps
 *    `spare_parts.current_stock` in sync from the signed quantity.
 *  - `spare_part_stock` (per-plant) is auto-synced by trigger only for
 *    `PLANT_AUTO_SYNCED_TYPES`; for other types we adjust it here.
 *  - `spare_part_stock_movements` is written here (no DB trigger).
 *
 * Returns the created movement id so callers (material issues) can link their
 * line items back to the ledger row.
 */
export async function applyStockMovement(
  input: StockMovementInput
): Promise<{ error: Error | null; movementId?: string | null }> {
  const supabase = createClient();
  const {
    sparePartId,
    organizationId,
    plantId,
    movementType,
    signedQuantity,
    referenceNo,
    note,
    createdBy,
    workOrderId,
  } = input;

  const toPlant =
    movementType === "purchase_in" ||
    movementType === "return_in" ||
    movementType === "adjustment" ||
    movementType === "transfer";
  const plantFields = toPlant ? { to_plant_id: plantId ?? null } : { from_plant_id: plantId ?? null };

  // 1) canonical ledger (trigger updates spare_parts.current_stock)
  const { data: movement, error } = await supabase
    .from("stock_movements")
    .insert({
      part_id: sparePartId,
      organization_id: organizationId ?? undefined,
      movement_type: movementType,
      quantity: signedQuantity,
      plant_id: plantId ?? null,
      ...plantFields,
      work_order_id: workOrderId ?? null,
      reference_no: referenceNo ?? null,
      note: note ?? null,
      created_by: createdBy ?? null,
    })
    .select("id")
    .single();
  if (error) return { error };

  // 2) per-plant stock for types the trigger does not handle
  if (plantId && !PLANT_AUTO_SYNCED_TYPES.includes(movementType)) {
    const nextQty = (current: number | null) =>
      Math.max(0, Number(current ?? 0) + signedQuantity);

    const { data: existing } = await supabase
      .from("spare_part_stock")
      .select("id, quantity")
      .eq("spare_part_id", sparePartId)
      .eq("plant_id", plantId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("spare_part_stock")
        .update({ quantity: nextQty(existing.quantity) })
        .eq("id", existing.id);
    } else {
      await supabase.from("spare_part_stock").insert({
        spare_part_id: sparePartId,
        plant_id: plantId,
        quantity: nextQty(0),
        organization_id: organizationId ?? undefined,
      });
    }

    const { data: existingLink } = await supabase
      .from("spare_part_plants")
      .select("id, quantity")
      .eq("part_id", sparePartId)
      .eq("plant_id", plantId)
      .maybeSingle();
    if (existingLink) {
      await supabase
        .from("spare_part_plants")
        .update({ quantity: nextQty(existingLink.quantity) })
        .eq("id", existingLink.id);
    } else {
      await supabase.from("spare_part_plants").insert({
        part_id: sparePartId,
        plant_id: plantId,
        quantity: nextQty(0),
        organization_id: organizationId ?? undefined,
      });
    }
  }

  // 3) spare-part movement ledger (history panel; no DB trigger)
  await supabase.from("spare_part_stock_movements").insert({
    spare_part_id: sparePartId,
    organization_id: organizationId ?? undefined,
    plant_id: plantId ?? null,
    movement_type: movementType,
    quantity: signedQuantity,
    reference_no: referenceNo ?? null,
    note: note ?? null,
    created_by: createdBy ?? null,
  });

  return { error: null, movementId: (movement as { id?: string } | null)?.id ?? null };
}
