import type {
  ItemIssueLine,
  MaterialIssueRow,
  ItemIssueSummary,
} from "@/services/material-issues";

export interface IssuePdfMeta {
  organizationName?: string | null;
  plantName?: string | null;
  issuedByName?: string | null;
  receivedByName?: string | null;
  departmentName?: string | null;
  equipmentName?: string | null;
  workOrderNo?: string | null;
  registerFrom?: string | null;
  registerTo?: string | null;
}

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

type Doc = import("jspdf").jsPDF;

const MOVEMENT_LABELS: Record<string, string> = {
  material_issue: "Material Issue",
  mr_issue: "MR Issue",
  workorder_issue: "Work Order Issue",
  breakdown_use: "Breakdown Use",
  purchase_in: "Purchase In",
  return_in: "Return In",
  adjustment: "Adjustment",
  scrap_out: "Scrap Out",
  transfer: "Transfer",
};

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pretty(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function header(doc: Doc, title: string, docNo: string, meta: IssuePdfMeta): number {
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, PAGE_W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(meta.organizationName || "Brilliants Industrial Services", MARGIN, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Plant: ${meta.plantName || "All plants"}`, MARGIN, 52);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, PAGE_W - MARGIN, 40, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(docNo, PAGE_W - MARGIN, 58, { align: "right" });

  doc.setTextColor(17, 24, 39);
  return 100;
}

function metaRow(doc: Doc, y: number, pairs: [string, string][]): number {
  doc.setFontSize(10);
  let x = MARGIN;
  const colW = CONTENT_W / pairs.length;
  for (const [label, value] of pairs) {
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text(label.toUpperCase(), x, y);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(value, colW - 10), x, y + 14);
    x += colW;
  }
  return y + 34;
}

function tableHeader(
  doc: Doc,
  y: number,
  columns: { label: string; x: number; align?: "left" | "right" }[]
): number {
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 12, CONTENT_W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  for (const c of columns) {
    doc.text(c.label, c.x, y + 3, { align: c.align ?? "left" });
  }
  return y + 24;
}

function ensureSpace(doc: Doc, y: number, needed: number): number {
  if (y + needed > PAGE_H - 80) {
    doc.addPage();
    return 80;
  }
  return y;
}

function signatureBlock(
  doc: Doc,
  y: number,
  slots: { label: string; name?: string | null; date?: string | null }[]
): void {
  y = ensureSpace(doc, y, 90);
  y += 30;
  doc.setDrawColor(209, 213, 219);
  const colW = CONTENT_W / slots.length;
  slots.forEach((slot, i) => {
    const x = MARGIN + colW * i;
    if (slot.name || slot.date) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(slot.name || "—", x, y - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(slot.date || "", x, y - 1);
    }
    doc.line(x, y, x + colW - 30, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(slot.label, x, y + 12);
  });
  doc.setTextColor(17, 24, 39);
}

function recipientText(issue: MaterialIssueRow, meta: IssuePdfMeta): string {
  if (issue.issued_to_type === "department") return meta.departmentName || "Department";
  if (issue.issued_to_type === "equipment") return meta.equipmentName || "Equipment";
  if (issue.issued_to_type === "work_order") {
    return meta.workOrderNo ? `Work Order ${meta.workOrderNo}` : "Work Order";
  }
  return issue.issued_to_name || pretty(issue.issued_to_type);
}

export async function downloadMaterialIssuePdf(
  issue: MaterialIssueRow,
  meta: IssuePdfMeta = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = header(doc, "Material Issue Slip", issue.issue_no, meta);
  y = metaRow(doc, y, [
    ["Issue Date", fmtDate(issue.issue_date)],
    ["Issued To", recipientText(issue, meta)],
    ["Status", pretty(issue.status)],
  ]);
  y = metaRow(doc, y, [
    ["Issued By", meta.issuedByName || issue.created_by_name || "—"],
    ["Total Quantity", num(issue.total_quantity ?? 0)],
    ["Items", String(issue.material_issue_items.length)],
  ]);

  if (issue.purpose) {
    y = ensureSpace(doc, y, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("PURPOSE", MARGIN, y);
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(issue.purpose, CONTENT_W);
    doc.text(lines, MARGIN, y + 13);
    y += 18 + lines.length * 11;
  }

  const cols = [
    { label: "#", x: MARGIN },
    { label: "Part Code", x: MARGIN + 22 },
    { label: "Part Name", x: MARGIN + 118 },
    { label: "Qty", x: PAGE_W - MARGIN - 155, align: "right" as const },
    { label: "Unit", x: PAGE_W - MARGIN - 148 },
    { label: "Remarks", x: PAGE_W - MARGIN - 105 },
  ];
  y = tableHeader(doc, y, cols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  issue.material_issue_items.forEach((item, i) => {
    y = ensureSpace(doc, y, 20);
    doc.setTextColor(17, 24, 39);
    const part = item.spare_parts;
    const partCode = Array.isArray(part) ? part[0]?.part_code : part?.part_code;
    const partName = Array.isArray(part) ? part[0]?.part_name : part?.part_name;
    doc.text(String(i + 1), cols[0].x, y);
    doc.text(partCode ?? "—", cols[1].x, y);
    doc.text((partName ?? "—").slice(0, 38), cols[2].x, y);
    doc.text(num(item.quantity), cols[3].x, y, { align: "right" });
    doc.text(item.unit ?? "—", cols[4].x, y);
    doc.text((item.remarks ?? "").slice(0, 18), cols[5].x, y);
    y += 18;
  });

  y = ensureSpace(doc, y, 26);
  doc.setDrawColor(209, 213, 219);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(
    `Total: ${num(issue.total_quantity ?? 0)} unit(s) across ${issue.material_issue_items.length} line(s)`,
    PAGE_W - MARGIN,
    y,
    { align: "right" }
  );
  y += 10;

  if (issue.remarks) {
    y = ensureSpace(doc, y, 40);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    doc.text("Remarks", MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(issue.remarks, CONTENT_W);
    doc.text(lines, MARGIN, y + 14);
    y += 14 + lines.length * 12;
  }

  if (issue.status === "cancelled" && issue.cancel_reason) {
    y = ensureSpace(doc, y, 40);
    y += 12;
    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`CANCELLED — ${issue.cancel_reason}`, MARGIN, y);
    doc.setTextColor(17, 24, 39);
  }

  signatureBlock(doc, y, [
    { label: "Issued By (Store)", name: meta.issuedByName || issue.created_by_name, date: fmtDate(issue.issue_date) },
    { label: "Received By", name: meta.receivedByName ?? null, date: fmtDate(issue.issue_date) },
    { label: "Store In-charge", name: null, date: null },
  ]);

  doc.save(`${issue.issue_no}.pdf`);
}

export async function downloadMaterialIssueRegisterPdf(
  summary: ItemIssueSummary[],
  lines: ItemIssueLine[],
  meta: IssuePdfMeta = {},
  filters: { partLabel?: string | null } = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const period =
    meta.registerFrom || meta.registerTo
      ? `${meta.registerFrom ? fmtDate(meta.registerFrom) : "Start"} to ${
          meta.registerTo ? fmtDate(meta.registerTo) : "Today"
        }`
      : "All time (till date)";

  let y = header(doc, "Material Issue Register", period, meta);
  y = metaRow(doc, y, [
    ["Period", period],
    ["Item Filter", filters.partLabel || "All items"],
    ["Total Issued", num(summary.reduce((sum, row) => sum + row.total_quantity, 0))],
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Item-wise Summary", MARGIN, y);
  y += 10;

  const summaryCols = [
    { label: "#", x: MARGIN },
    { label: "Part Code", x: MARGIN + 22 },
    { label: "Item", x: MARGIN + 115 },
    { label: "Unit", x: MARGIN + 300 },
    { label: "Total Issued", x: PAGE_W - MARGIN - 110, align: "right" as const },
    { label: "Issues", x: PAGE_W - MARGIN - 60, align: "right" as const },
    { label: "Last Issue", x: PAGE_W - MARGIN, align: "right" as const },
  ];
  y = tableHeader(doc, y, summaryCols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (summary.length === 0) {
    doc.setTextColor(107, 114, 128);
    doc.text("No material issues found for this period.", MARGIN, y);
    y += 18;
  }
  summary.forEach((row, i) => {
    y = ensureSpace(doc, y, 20);
    doc.setTextColor(17, 24, 39);
    doc.text(String(i + 1), summaryCols[0].x, y);
    doc.text(row.part_code, summaryCols[1].x, y);
    doc.text(row.part_name.slice(0, 32), summaryCols[2].x, y);
    doc.text(row.unit || "—", summaryCols[3].x, y);
    doc.text(num(row.total_quantity), summaryCols[4].x, y, { align: "right" });
    doc.text(String(row.issue_count), summaryCols[5].x, y, { align: "right" });
    doc.text(fmtDate(row.last_issue_at), summaryCols[6].x, y, { align: "right" });
    y += 18;
  });

  y = ensureSpace(doc, y, 70);
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Issue Details", MARGIN, y);
  y += 10;

  const detailCols = [
    { label: "Date", x: MARGIN },
    { label: "Reference", x: MARGIN + 72 },
    { label: "Item", x: MARGIN + 155 },
    { label: "Source", x: MARGIN + 315 },
    { label: "Qty", x: PAGE_W - MARGIN, align: "right" as const },
  ];
  y = tableHeader(doc, y, detailCols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  lines.forEach((line) => {
    y = ensureSpace(doc, y, 18);
    doc.setTextColor(17, 24, 39);
    doc.text(fmtDate(line.created_at), detailCols[0].x, y);
    doc.text(line.reference_no ?? "—", detailCols[1].x, y);
    doc.text(`${line.part_code} ${line.part_name}`.slice(0, 40), detailCols[2].x, y);
    doc.text(MOVEMENT_LABELS[line.movement_type] ?? line.movement_type, detailCols[3].x, y);
    doc.text(`${num(line.quantity)} ${line.unit}`.trim(), detailCols[4].x, y, { align: "right" });
    y += 16;
  });

  y = ensureSpace(doc, y, 30);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Grand total issued: ${num(lines.reduce((sum, line) => sum + line.quantity, 0))}`, PAGE_W - MARGIN, y, {
    align: "right",
  });

  doc.save(`Material-Issue-Register-${new Date().toISOString().slice(0, 10)}.pdf`);
}
