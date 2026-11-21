import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import { rel } from "@/lib/postgrest-rel";
import { nextDocNo } from "@/services/procurement";
import { applyStockMovement } from "@/services/stock-movements";
import { logAuditAction } from "@/services/platform";

export interface IssuePartInfo {
  id: string;
  part_code: string;
  part_name: string;
  unit: string;
}

export interface MaterialIssueItemRow {
  id: string;
  material_issue_id: string;
  spare_part_id: string;
  quantity: number;
  unit: string | null;
  remarks: string | null;
  stock_movement_id: string | null;
  spare_parts: IssuePartInfo | IssuePartInfo[] | null;
}

export interface MaterialIssueRow {
  id: string;
  organization_id: string;
  plant_id: string | null;
  issue_no: string;
  issue_date: string;
  issued_to_type: string;
  department_id: string | null;
  equipment_id: string | null;
  work_order_id: string | null;
  issued_to_name: string | null;
  purpose: string | null;
  remarks: string | null;
  status: string;
  created_by: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  departments?: { name: string } | { name: string }[] | null;
  plants?: { name: string } | { name: string }[] | null;
  equipment?: { equipment_name: string } | { equipment_name: string }[] | null;
  work_orders?:
    | { work_order_no: string; title: string }
    | { work_order_no: string; title: string }[]
    | null;
  material_issue_items: MaterialIssueItemRow[];
  created_by_name?: string | null;
  cancelled_by_name?: string | null;
  total_quantity?: number;
}

export interface MaterialIssueInput {
  issue_date: string;
  plant_id: string;
  issued_to_type: string;
  department_id?: string | null;
  equipment_id?: string | null;
  work_order_id?: string | null;
  issued_to_name?: string | null;
  purpose?: string | null;
  remarks?: string | null;
  items: {
    spare_part_id: string;
    quantity: number;
    remarks?: string | null;
  }[];
}

export interface ItemIssueSummary {
  part_id: string;
  part_code: string;
  part_name: string;
  unit: string;
  total_quantity: number;
  issue_count: number;
  last_issue_at: string | null;
}

export interface ItemIssueLine {
  id: string;
  part_id: string;
  part_code: string;
  part_name: string;
  unit: string;
  quantity: number;
  movement_type: string;
  reference_no: string | null;
  note: string | null;
  created_at: string;
}

export interface ItemIssueRegister {
  summary: ItemIssueSummary[];
  lines: ItemIssueLine[];
  total_quantity: number;
}

/** Movement types that represent material leaving the store. */
export const ISSUE_MOVEMENT_TYPES = [
  "material_issue",
  "mr_issue",
  "workorder_issue",
  "breakdown_use",
] as const;

function castRows<T>(data: unknown): T[] {
  return (data ?? []) as unknown as T[];
}

async function loadPartMap(ids: string[]): Promise<Map<string, IssuePartInfo>> {
  const supabase = createClient();
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, IssuePartInfo>();
  if (unique.length === 0) return map;
  const { data } = await supabase
    .from("spare_parts")
    .select("id, part_code, part_name, unit")
    .in("id", unique);
  for (const p of castRows<IssuePartInfo>(data)) map.set(p.id, p);
  return map;
}

async function loadProfileMap(ids: string[]): Promise<Map<string, string>> {
  const supabase = createClient();
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data } = await supabase.from("profiles").select("id, name").in("id", unique);
  for (const p of castRows<{ id: string; name: string | null }>(data)) {
    if (p.name) map.set(p.id, p.name);
  }
  return map;
}

function decorate(rows: MaterialIssueRow[]): MaterialIssueRow[] {
  return rows.map((row) => ({
    ...row,
    total_quantity: (row.material_issue_items ?? []).reduce(
      (sum, item) => sum + Number(item.quantity ?? 0),
      0
    ),
  }));
}

async function attachRelations(rows: MaterialIssueRow[]): Promise<MaterialIssueRow[]> {
  const partIds = rows.flatMap((row) =>
    (row.material_issue_items ?? []).map((item) => item.spare_part_id)
  );
  const actorIds = rows.flatMap((row) =>
    [row.created_by, row.cancelled_by].filter((id): id is string => Boolean(id))
  );
  const [partMap, profileMap] = await Promise.all([loadPartMap(partIds), loadProfileMap(actorIds)]);

  for (const row of rows) {
    row.material_issue_items = (row.material_issue_items ?? []).map((item) => ({
      ...item,
      spare_parts: partMap.get(item.spare_part_id) ?? rel(item.spare_parts),
    }));
    row.created_by_name = row.created_by ? (profileMap.get(row.created_by) ?? null) : null;
    row.cancelled_by_name = row.cancelled_by ? (profileMap.get(row.cancelled_by) ?? null) : null;
  }
  return decorate(rows);
}

const ISSUE_SELECT =
  "*, material_issue_items(*), departments(name), equipment(equipment_name), work_orders(work_order_no, title)";

export async function listMaterialIssues(
  scope: QueryScope,
  options: { status?: string; from?: string; to?: string; limit?: number } = {}
): Promise<{ data: MaterialIssueRow[]; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase
    .from("material_issues")
    .select(ISSUE_SELECT as any)
    .order("issue_date", { ascending: false })
    .order("issue_no", { ascending: false })
    .limit(options.limit ?? 500);

  if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
  if (scope.plantId) query = query.eq("plant_id", scope.plantId);
  if (options.status) query = query.eq("status", options.status);
  if (options.from) query = query.gte("issue_date", options.from);
  if (options.to) query = query.lte("issue_date", options.to);

  const { data, error } = await query;
  if (error) return { data: [], error: error.message ?? null };
  return { data: await attachRelations(castRows<MaterialIssueRow>(data)), error: null };
}

export async function getMaterialIssueById(
  id: string
): Promise<{ data: MaterialIssueRow | null; error: string | null }> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("material_issues")
    .select(ISSUE_SELECT as any)
    .eq("id", id)
    .single();
  if (error || !data) return { data: null, error: error?.message ?? "Material issue not found" };
  const [row] = await attachRelations([data as unknown as MaterialIssueRow]);
  return { data: row ?? null, error: null };
}

function issuedToSummary(input: MaterialIssueInput): string {
  if (input.issued_to_type === "department") return "Department";
  if (input.issued_to_type === "equipment") return "Equipment";
  if (input.issued_to_type === "work_order") return "Work order";
  return input.issued_to_name?.trim() || "Employee";
}

/**
 * Creates a material issue and writes one OUT movement per line. Stock is
 * validated before anything is written; on a partial failure the applied
 * movements are compensated with return_in rows and the header is deleted.
 */
export async function createMaterialIssue(
  scope: QueryScope,
  input: MaterialIssueInput,
  actor: { id: string; name?: string | null }
): Promise<{ data: { id: string; issueNo: string } | null; error: string | null }> {
  const supabase = createClient();
  if (!scope.organizationId) return { data: null, error: "No organization in context" };
  if (!input.plant_id) return { data: null, error: "Plant is required" };
  if (input.items.length === 0) return { data: null, error: "Add at least one item" };

  const partIds = [...new Set(input.items.map((i) => i.spare_part_id).filter(Boolean))];
  if (partIds.length === 0) return { data: null, error: "Add at least one item" };

  const { data: partsData, error: partsError } = await supabase
    .from("spare_parts")
    .select("id, part_code, part_name, unit, current_stock")
    .in("id", partIds);
  if (partsError) return { data: null, error: partsError.message };

  const parts = castRows<{
    id: string;
    part_code: string;
    part_name: string;
    unit: string;
    current_stock: number | null;
  }>(partsData);
  const partMap = new Map(parts.map((p) => [p.id, p]));

  // Validate requested quantity against available stock (sum duplicates first).
  const requested = new Map<string, number>();
  for (const item of input.items) {
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      return { data: null, error: "Every quantity must be greater than zero" };
    }
    requested.set(item.spare_part_id, (requested.get(item.spare_part_id) ?? 0) + qty);
  }
  for (const [partId, qty] of requested) {
    const part = partMap.get(partId);
    if (!part) return { data: null, error: "One of the selected items no longer exists" };
    const available = Number(part.current_stock ?? 0);
    if (qty > available) {
      return {
        data: null,
        error: `Insufficient stock for ${part.part_code} — ${part.part_name}: requested ${qty}, available ${available} ${part.unit}.`,
      };
    }
  }

  // Sequential issue number, per organization. Ordering descending keeps the
  // latest slip even when the table exceeds PostgREST's 1000-row cap.
  const { data: latestNo } = await supabase
    .from("material_issues")
    .select("issue_no")
    .eq("organization_id", scope.organizationId)
    .order("issue_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  const issueNo = nextDocNo(
    "MI",
    latestNo ? [(latestNo as { issue_no: string }).issue_no] : []
  );

  const { data: header, error: headerError } = await supabase
    .from("material_issues")
    .insert({
      organization_id: scope.organizationId,
      plant_id: input.plant_id,
      issue_no: issueNo,
      issue_date: input.issue_date,
      issued_to_type: input.issued_to_type,
      department_id: input.department_id || null,
      equipment_id: input.equipment_id || null,
      work_order_id: input.work_order_id || null,
      issued_to_name: input.issued_to_name?.trim() || null,
      purpose: input.purpose?.trim() || null,
      remarks: input.remarks?.trim() || null,
      status: "issued",
      created_by: actor.id,
    })
    .select("id, issue_no")
    .single();
  if (headerError || !header) {
    return { data: null, error: headerError?.message ?? "Failed to create material issue" };
  }

  const applied: { partId: string; quantity: number }[] = [];
  const itemRows: Record<string, unknown>[] = [];

  for (const item of input.items) {
    const part = partMap.get(item.spare_part_id);
    if (!part) continue;
    const qty = Number(item.quantity);
    const note = input.purpose?.trim()
      ? `Issued to ${issuedToSummary(input)} — ${input.purpose.trim()}`
      : `Issued to ${issuedToSummary(input)}`;

    const { error: movementError, movementId } = await applyStockMovement({
      sparePartId: item.spare_part_id,
      organizationId: scope.organizationId,
      plantId: input.plant_id,
      movementType: "material_issue",
      signedQuantity: -qty,
      referenceNo: issueNo,
      note,
      createdBy: actor.id,
      workOrderId: input.work_order_id || null,
    });

    if (movementError) {
      await reverseMovements(applied, scope, input.plant_id, actor.id, issueNo);
      await supabase.from("material_issues").delete().eq("id", header.id);
      return { data: null, error: movementError.message };
    }

    applied.push({ partId: item.spare_part_id, quantity: qty });
    itemRows.push({
      material_issue_id: header.id,
      organization_id: scope.organizationId,
      plant_id: input.plant_id,
      spare_part_id: item.spare_part_id,
      quantity: qty,
      unit: part.unit,
      remarks: item.remarks?.trim() || null,
      stock_movement_id: movementId ?? null,
    });
  }

  const { error: itemsError } = await supabase.from("material_issue_items").insert(itemRows);
  if (itemsError) {
    await reverseMovements(applied, scope, input.plant_id, actor.id, issueNo);
    await supabase.from("material_issues").delete().eq("id", header.id);
    return { data: null, error: itemsError.message };
  }

  await logAuditAction(
    scope,
    {
      action: "issue",
      entityType: "material_issue",
      entityId: header.id,
      entityTitle: issueNo,
      summary: `Material issued to ${issuedToSummary(input)} (${input.items.length} item${
        input.items.length === 1 ? "" : "s"
      })`,
      metadata: {
        issue_date: input.issue_date,
        issued_to_type: input.issued_to_type,
        total_quantity: applied.reduce((sum, row) => sum + row.quantity, 0),
      },
    },
    { id: actor.id, name: actor.name ?? undefined }
  );

  return { data: { id: header.id, issueNo }, error: null };
}

async function reverseMovements(
  applied: { partId: string; quantity: number }[],
  scope: QueryScope,
  plantId: string,
  actorId: string,
  reference: string
): Promise<void> {
  for (const row of applied) {
    await applyStockMovement({
      sparePartId: row.partId,
      organizationId: scope.organizationId,
      plantId,
      movementType: "return_in",
      signedQuantity: row.quantity,
      referenceNo: reference,
      note: `Rollback of failed material issue ${reference}`,
      createdBy: actorId,
    });
  }
}

/** Cancels an issued slip and puts the stock back via return_in movements. */
export async function cancelMaterialIssue(
  id: string,
  actor: { id: string; name?: string | null },
  reason: string
): Promise<{ error: string | null }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("material_issues")
    .select("*, material_issue_items(*)")
    .eq("id", id)
    .single();
  if (error || !data) return { error: error?.message ?? "Material issue not found" };

  const issue = data as unknown as MaterialIssueRow;
  if (issue.status === "cancelled") return { error: "This issue is already cancelled" };

  const items = issue.material_issue_items ?? [];
  if (items.length === 0) return { error: "This issue has no items to reverse" };

  for (const item of items) {
    const { error: movementError } = await applyStockMovement({
      sparePartId: item.spare_part_id,
      organizationId: issue.organization_id,
      plantId: issue.plant_id,
      movementType: "return_in",
      signedQuantity: Number(item.quantity),
      referenceNo: issue.issue_no,
      note: `Cancellation of ${issue.issue_no}${reason ? ` — ${reason}` : ""}`,
      createdBy: actor.id,
    });
    if (movementError) return { error: movementError.message };
  }

  const { error: updateError } = await supabase
    .from("material_issues")
    .update({
      status: "cancelled",
      cancelled_by: actor.id,
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  await logAuditAction(
    { organizationId: issue.organization_id, plantId: issue.plant_id },
    {
      action: "cancel",
      entityType: "material_issue",
      entityId: issue.id,
      entityTitle: issue.issue_no,
      summary: `Material issue cancelled${reason ? `: ${reason}` : ""}`,
      metadata: { item_count: items.length },
    },
    { id: actor.id, name: actor.name ?? undefined }
  );

  return { error: null };
}

/**
 * Item-wise issue register. Reads the stock ledger (not only material_issues)
 * so MR issues, work-order issues and breakdown usage are included too.
 * No date filters = "till date"; this is the query behind "how much petrol
 * has been issued so far".
 */
export async function listItemIssueRegister(
  scope: QueryScope,
  options: { partId?: string; from?: string; to?: string; limit?: number } = {}
): Promise<{ data: ItemIssueRegister; error: string | null }> {
  const supabase = createClient();
  const empty: ItemIssueRegister = { summary: [], lines: [], total_quantity: 0 };

  type RawLine = {
    id: string;
    part_id: string;
    movement_type: string;
    quantity: number;
    reference_no: string | null;
    note: string | null;
    created_at: string;
    spare_parts:
      | { part_code: string; part_name: string; unit: string }
      | { part_code: string; part_name: string; unit: string }[]
      | null;
  };

  // PostgREST caps a single response at 1000 rows, so page through the ledger
  // to keep "till date" totals complete.
  const pageSize = 1000;
  const maxRows = options.limit ?? 20000;
  const rows: RawLine[] = [];

  for (let offset = 0; offset < maxRows; offset += pageSize) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = supabase
      .from("stock_movements")
      .select(
        "id, part_id, movement_type, quantity, reference_no, note, created_at, spare_parts(part_code, part_name, unit)" as any
      )
      .in("movement_type", ISSUE_MOVEMENT_TYPES as unknown as string[])
      .lt("quantity", 0)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (scope.organizationId) query = query.eq("organization_id", scope.organizationId);
    if (scope.plantId) query = query.eq("plant_id", scope.plantId);
    if (options.partId) query = query.eq("part_id", options.partId);
    if (options.from) query = query.gte("created_at", `${options.from}T00:00:00`);
    if (options.to) query = query.lte("created_at", `${options.to}T23:59:59.999`);

    const { data, error } = await query;
    if (error) return { data: empty, error: error.message ?? null };
    const page = castRows<RawLine>(data);
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  // A material_issue ledger row is only a real issue if a matching header
  // still exists. Cancelled issues and rows rolled back after a failed create
  // are excluded from the issued totals (their OUT movements stay for history).
  const issueRefs = [
    ...new Set(
      rows
        .filter((row) => row.movement_type === "material_issue" && row.reference_no)
        .map((row) => row.reference_no as string)
    ),
  ];
  const validIssueRefs = new Set<string>();
  if (issueRefs.length > 0) {
    let headerQuery = supabase
      .from("material_issues")
      .select("issue_no, status")
      .in("issue_no", issueRefs);
    if (scope.organizationId) {
      headerQuery = headerQuery.eq("organization_id", scope.organizationId);
    }
    const { data: headerData } = await headerQuery;
    for (const row of castRows<{ issue_no: string; status: string }>(headerData)) {
      if (row.status !== "cancelled") validIssueRefs.add(row.issue_no);
    }
  }

  const summaryMap = new Map<string, ItemIssueSummary>();
  const lines: ItemIssueLine[] = [];

  for (const row of rows) {
    if (
      row.movement_type === "material_issue" &&
      (!row.reference_no || !validIssueRefs.has(row.reference_no))
    ) {
      continue;
    }
    const part = rel(row.spare_parts);
    const info: IssuePartInfo = part
      ? { id: row.part_id, ...part }
      : { id: row.part_id, part_code: "—", part_name: "Unknown part", unit: "" };
    const qty = Math.abs(Number(row.quantity ?? 0));

    const current = summaryMap.get(row.part_id) ?? {
      part_id: row.part_id,
      part_code: info.part_code,
      part_name: info.part_name,
      unit: info.unit,
      total_quantity: 0,
      issue_count: 0,
      last_issue_at: null,
    };
    current.total_quantity += qty;
    current.issue_count += 1;
    if (!current.last_issue_at || row.created_at > current.last_issue_at) {
      current.last_issue_at = row.created_at;
    }
    summaryMap.set(row.part_id, current);

    lines.push({
      id: row.id,
      part_id: row.part_id,
      part_code: info.part_code,
      part_name: info.part_name,
      unit: info.unit,
      quantity: qty,
      movement_type: row.movement_type,
      reference_no: row.reference_no,
      note: row.note,
      created_at: row.created_at,
    });
  }

  const summary = [...summaryMap.values()].sort((a, b) =>
    a.part_code.localeCompare(b.part_code)
  );

  return {
    data: {
      summary,
      lines,
      total_quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    },
    error: null,
  };
}
