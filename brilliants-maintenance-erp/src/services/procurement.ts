import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";

export interface MaterialRequestRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  request_no: string;
  title: string;
  requested_by: string | null;
  priority: string;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaterialRequestWithItems extends MaterialRequestRow {
  material_request_items: {
    id: string;
    spare_part_id: string;
    quantity_requested: number;
    quantity_approved: number | null;
    spare_parts: { part_code: string; part_name: string; unit: string } | null;
  }[];
}

export interface PurchaseOrderRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  po_no: string;
  vendor_id: string | null;
  material_request_id: string | null;
  title: string;
  status: string;
  expected_delivery: string | null;
  currency: string;
  total_amount: number;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithItems extends PurchaseOrderRow {
  vendors: { id: string; name: string } | null;
  material_requests: { request_no: string } | null;
  purchase_order_items: {
    id: string;
    spare_part_id: string;
    quantity_ordered: number;
    unit_price: number;
    quantity_received: number;
    spare_parts: { part_code: string; part_name: string; unit: string } | null;
  }[];
}

export interface GrnRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  grn_no: string;
  purchase_order_id: string;
  received_at: string;
  received_by: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
}

export interface VendorRatingInput {
  vendor_id: string;
  rating: number;
  delivery_score?: number | null;
  quality_score?: number | null;
  price_score?: number | null;
  responsiveness_score?: number | null;
  comments?: string | null;
  review_date?: string | null;
}

function castRows<T>(data: unknown): T[] {
  return (data ?? []) as unknown as T[];
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}

export function nextDocNo(prefix: "MR" | "PO" | "GRN", existing: string[]): string {
  const year = new Date().getFullYear();
  const prefixYear = `${prefix}-${year}-`;
  const maxSeq = existing
    .filter((no) => no.startsWith(prefixYear))
    .reduce((max, no) => {
      const seq = Number(no.slice(prefixYear.length));
      return Number.isFinite(seq) ? Math.max(max, seq) : max;
    }, 0);
  return `${prefixYear}${pad(maxSeq + 1)}`;
}

export async function listMaterialRequests(
  scope: QueryScope
): Promise<{ data: MaterialRequestWithItems[]; error: string | null }> {
  const supabase = createClient();
  const select =
    "*, material_request_items(*, spare_parts(part_code, part_name, unit))";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from("material_requests").select(select as any).order("request_no");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;
  return { data: castRows<MaterialRequestWithItems>(data), error: error?.message ?? null };
}

export async function createMaterialRequest(
  scope: QueryScope,
  input: {
    title: string;
    priority?: string;
    remarks?: string;
    items: { spare_part_id: string; quantity_requested: number }[];
  },
  requestedBy: string
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: existingNos } = await supabase
    .from("material_requests")
    .select("request_no")
    .order("request_no");
  const requestNo = nextDocNo(
    "MR",
    castRows<{ request_no: string }>(existingNos).map((r) => r.request_no)
  );

  const { data: header, error: hdrError } = await supabase
    .from("material_requests")
    .insert({
      organization_id: scope.organizationId ?? undefined,
      plant_id: scope.plantId ?? null,
      request_no: requestNo,
      title: input.title,
      priority: input.priority ?? "normal",
      requested_by: requestedBy,
      status: "draft",
      remarks: input.remarks ?? null,
    })
    .select("id")
    .single();

  if (hdrError || !header) return { error: hdrError?.message ?? "Failed to create request" };

  const items = input.items.map((item) => ({
    material_request_id: header.id,
    spare_part_id: item.spare_part_id,
    quantity_requested: item.quantity_requested,
  }));
  const { error: itemsError } = await supabase
    .from("material_request_items")
    .insert(items);
  if (itemsError) {
    await supabase.from("material_requests").delete().eq("id", header.id);
    return { error: itemsError.message };
  }
  return { error: null };
}

export async function setMaterialRequestStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("material_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deleteMaterialRequest(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("material_requests").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function listPurchaseOrders(
  scope: QueryScope
): Promise<{ data: PurchaseOrderWithItems[]; error: string | null }> {
  const supabase = createClient();
  const select =
    "*, vendors(id, name), material_requests(request_no), purchase_order_items(*, spare_parts(part_code, part_name, unit))";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from("purchase_orders").select(select as any).order("po_no");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;
  return { data: castRows<PurchaseOrderWithItems>(data), error: error?.message ?? null };
}

export async function createPurchaseOrder(
  scope: QueryScope,
  input: {
    vendor_id: string | null;
    material_request_id: string | null;
    title: string;
    expected_delivery?: string | null;
    remarks?: string | null;
    items: {
      spare_part_id: string;
      quantity_ordered: number;
      unit_price: number;
    }[];
  }
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: existingNos } = await supabase
    .from("purchase_orders")
    .select("po_no")
    .order("po_no");
  const poNo = nextDocNo(
    "PO",
    castRows<{ po_no: string }>(existingNos).map((r) => r.po_no)
  );
  const totalAmount = input.items.reduce(
    (sum, item) => sum + item.quantity_ordered * item.unit_price,
    0
  );

  const { data: header, error: hdrError } = await supabase
    .from("purchase_orders")
    .insert({
      organization_id: scope.organizationId ?? undefined,
      plant_id: scope.plantId ?? null,
      po_no: poNo,
      vendor_id: input.vendor_id ?? null,
      material_request_id: input.material_request_id ?? null,
      title: input.title,
      status: "draft",
      expected_delivery: input.expected_delivery ?? null,
      total_amount: totalAmount,
      remarks: input.remarks ?? null,
    })
    .select("id")
    .single();

  if (hdrError || !header) return { error: hdrError?.message ?? "Failed to create order" };

  const items = input.items.map((item) => ({
    purchase_order_id: header.id,
    spare_part_id: item.spare_part_id,
    quantity_ordered: item.quantity_ordered,
    unit_price: item.unit_price,
  }));
  const { error: itemsError } = await supabase
    .from("purchase_order_items")
    .insert(items);
  if (itemsError) {
    await supabase.from("purchase_orders").delete().eq("id", header.id);
    return { error: itemsError.message };
  }
  return { error: null };
}

export async function setPurchaseOrderStatus(
  id: string,
  status: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("purchase_orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return { error: error?.message ?? null };
}

export async function deletePurchaseOrder(id: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("purchase_orders").delete().eq("id", id);
  return { error: error?.message ?? null };
}

export async function listGrns(
  scope: QueryScope
): Promise<{ data: (GrnRow & { purchase_orders: { po_no: string; title: string } | null })[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from("grn_receipts")
    .select("*, purchase_orders(po_no, title)" as any)
    .order("grn_no");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;
  return {
    data: castRows<GrnRow & { purchase_orders: { po_no: string; title: string } | null }>(data),
    error: error?.message ?? null,
  };
}

export async function postGrn(
  scope: QueryScope,
  input: {
    purchase_order_id: string;
    remarks?: string | null;
    receivedBy: string;
    items: { order_item_id: string; spare_part_id: string; quantity_received: number }[];
  }
): Promise<{ error: string | null }> {
  const supabase = createClient();

  const { data: poData, error: poError } = await supabase
    .from("purchase_orders")
    .select("po_no")
    .eq("id", input.purchase_order_id)
    .single();
  if (poError || !poData) return { error: poError?.message ?? "Purchase order not found" };

  const { data: existingNos } = await supabase
    .from("grn_receipts")
    .select("grn_no")
    .order("grn_no");
  const grnNo = nextDocNo(
    "GRN",
    castRows<{ grn_no: string }>(existingNos).map((r) => r.grn_no)
  );

  const { data: grn, error: grnError } = await supabase
    .from("grn_receipts")
    .insert({
      organization_id: scope.organizationId ?? undefined,
      plant_id: scope.plantId ?? null,
      grn_no: grnNo,
      purchase_order_id: input.purchase_order_id,
      received_by: input.receivedBy,
      status: "posted",
      remarks: input.remarks ?? null,
    })
    .select("id")
    .single();
  if (grnError || !grn) return { error: grnError?.message ?? "Failed to create GRN" };

  let allReceived = true;

  for (const item of input.items) {
    // resolve received qty against ordered qty (no server RPC in pilot)
    const { data: orderItem } = await supabase
      .from("purchase_order_items")
      .select("quantity_received, quantity_ordered")
      .eq("id", item.order_item_id)
      .single();
    if (!orderItem) continue;
    const currentReceived = orderItem.quantity_received ?? 0;
    const newReceived = currentReceived + item.quantity_received;
    if (newReceived > orderItem.quantity_ordered) {
      await supabase.from("grn_receipts").delete().eq("id", grn.id);
      return { error: `Cannot receive more than ordered (${orderItem.quantity_ordered})` };
    }
    await supabase
      .from("purchase_order_items")
      .update({ quantity_received: newReceived })
      .eq("id", item.order_item_id);
    await supabase.from("stock_movements").insert({
      part_id: item.spare_part_id,
      plant_id: scope.plantId ?? null,
      movement_type: "purchase_in",
      quantity: item.quantity_received,
      reference_no: grnNo,
      note: `GRN ${grnNo} / PO ${poData.po_no}`,
      created_by: input.receivedBy,
    });
    const { data: part } = await supabase
      .from("spare_parts")
      .select("current_stock")
      .eq("id", item.spare_part_id)
      .single();
    await supabase
      .from("spare_parts")
      .update({ current_stock: (part?.current_stock ?? 0) + item.quantity_received })
      .eq("id", item.spare_part_id);
    if (newReceived < orderItem.quantity_ordered) allReceived = false;
  }

  await supabase
    .from("purchase_orders")
    .update({
      status: allReceived ? "received" : "partially_received",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.purchase_order_id);

  return { error: null };
}

export async function listVendorEvaluations(
  scope: QueryScope
): Promise<{
  data: {
    vendor_id: string;
    vendor_name: string;
    vendor_code: string | null;
    reviews: number;
    avg_rating: number;
    level: string;
  }[];
  error: string | null;
}> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from("vendor_ratings")
    .select("rating, vendors(id, name, code)" as any);
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;

  const rows = castRows<{ rating: number; vendors: { id: string; name: string; code: string | null } | null }>(data);
  const byVendor = new Map<string, { name: string; code: string | null; total: number; count: number }>();
  for (const row of rows) {
    if (!row.vendors) continue;
    const entry = byVendor.get(row.vendors.id) ?? {
      name: row.vendors.name,
      code: row.vendors.code,
      total: 0,
      count: 0,
    };
    entry.total += row.rating;
    entry.count += 1;
    byVendor.set(row.vendors.id, entry);
  }

  const evaluations = [...byVendor.entries()].map(([vendorId, entry]) => {
    const avg = entry.count === 0 ? 0 : Math.round((entry.total / entry.count) * 10) / 10;
    return {
      vendor_id: vendorId,
      vendor_name: entry.name,
      vendor_code: entry.code,
      reviews: entry.count,
      avg_rating: avg,
      level: avg >= 4.3 ? "Excellent" : avg >= 3.5 ? "Good" : avg >= 2.5 ? "Average" : "Poor",
    };
  });

  return { data: evaluations, error: error?.message ?? null };
}

export async function createVendorRating(
  scope: QueryScope,
  input: VendorRatingInput,
  ratedBy: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { error } = await supabase.from("vendor_ratings").insert({
    organization_id: scope.organizationId ?? undefined,
    vendor_id: input.vendor_id,
    rated_by: ratedBy,
    rating: input.rating,
    delivery_score: input.delivery_score ?? input.rating,
    quality_score: input.quality_score ?? input.rating,
    price_score: input.price_score ?? input.rating,
    responsiveness_score: input.responsiveness_score ?? input.rating,
    comments: input.comments ?? null,
    review_date: input.review_date ?? new Date().toISOString().slice(0, 10),
  });
  return { error: error?.message ?? null };
}

export async function getVendors(): Promise<{ data: { id: string; name: string; code: string | null }[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase.from("vendors").select("id, name, code" as any).order("name");
  return { data: castRows<{ id: string; name: string; code: string | null }>(data), error: error?.message ?? null };
}

export async function getSparePartOptions(): Promise<{ data: { id: string; part_code: string; part_name: string; unit: string }[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("spare_parts")
    .select("id, part_code, part_name, unit" as any)
    .order("part_code");
  return {
    data: castRows<{ id: string; part_code: string; part_name: string; unit: string }>(data),
    error: error?.message ?? null,
  };
}

export async function getApprovedMaterialRequests(
  scope: QueryScope
): Promise<{ data: { id: string; request_no: string; title: string }[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from("material_requests")
    .select("id, request_no, title" as any)
    .eq("status", "approved")
    .order("request_no");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;
  return {
    data: castRows<{ id: string; request_no: string; title: string }>(data),
    error: error?.message ?? null,
  };
}

export async function getReceiveablePurchaseOrders(
  scope: QueryScope
): Promise<{ data: PurchaseOrderWithItems[]; error: string | null }> {
  const supabase = createClient();
  const select =
    "*, vendors(id, name), material_requests(request_no), purchase_order_items(*, spare_parts(part_code, part_name, unit))";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from("purchase_orders")
    .select(select as any)
    .in("status", ["ordered", "partially_received"])
    .order("po_no");
  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  const { data, error } = await query;
  return { data: castRows<PurchaseOrderWithItems>(data), error: error?.message ?? null };
}