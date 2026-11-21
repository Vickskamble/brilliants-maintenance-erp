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

function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function pretty(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function num(value: number | null | undefined): string {
  return Number(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

interface PdfTableColumn {
  label: string;
  x: number;
  width: number;
  align?: "left" | "right";
}

/** Trim to the available width with an ellipsis so labels never overrun a cell. */
function fitText(doc: Doc, value: string, width: number): string {
  const text = String(value ?? "—");
  if (doc.getTextWidth(text) <= width) return text;
  let out = text;
  while (out.length > 0 && doc.getTextWidth(`${out}…`) > width) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

/** Wrap a cell into at most maxLines lines, ellipsising an overflowing last line. */
function wrapCell(doc: Doc, value: string, width: number, maxLines: number): string[] {
  const lines = doc.splitTextToSize(String(value ?? "—"), width) as string[];
  if (lines.length <= maxLines) return lines.length ? lines : ["—"];
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = fitText(doc, `${kept[maxLines - 1]}…`, width);
  return kept;
}

function cellX(column: PdfTableColumn): number {
  return column.align === "right" ? column.x + column.width - 4 : column.x + 2;
}

/** Draw one data row and return the next y position. */
function drawRow(
  doc: Doc,
  y: number,
  columns: PdfTableColumn[],
  values: string[],
  options: { fontSize?: number; maxLines?: number } = {}
): number {
  const fontSize = options.fontSize ?? 9;
  const maxLines = options.maxLines ?? 2;
  const lineHeight = fontSize + 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(17, 24, 39);

  const cells = columns.map((column, i) =>
    wrapCell(doc, values[i] ?? "—", column.width - 6, maxLines)
  );
  const rowLines = Math.max(1, ...cells.map((cell) => cell.length));
  cells.forEach((cell, i) => {
    const column = columns[i];
    cell.forEach((line, lineIndex) => {
      doc.text(line, cellX(column), y + lineHeight - 2 + lineIndex * lineHeight, {
        align: column.align ?? "left",
      });
    });
  });
  return y + rowLines * lineHeight + 6;
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

function tableHeader(doc: Doc, y: number, columns: PdfTableColumn[]): number {
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 12, CONTENT_W, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  for (const column of columns) {
    doc.text(fitText(doc, column.label, column.width - 6), cellX(column), y + 3, {
      align: column.align ?? "left",
    });
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

  const cols: PdfTableColumn[] = [
    { label: "#", x: MARGIN, width: 16 },
    { label: "Part Code", x: 56, width: 66 },
    { label: "Part Name", x: 124, width: 176 },
    { label: "Qty", x: 302, width: 56, align: "right" },
    { label: "Unit", x: 360, width: 34 },
    { label: "Remarks", x: 396, width: 159 },
  ];
  y = tableHeader(doc, y, cols);

  issue.material_issue_items.forEach((item, i) => {
    y = ensureSpace(doc, y, 44);
    const part = item.spare_parts;
    const partCode = Array.isArray(part) ? part[0]?.part_code : part?.part_code;
    const partName = Array.isArray(part) ? part[0]?.part_name : part?.part_name;
    y = drawRow(
      doc,
      y,
      cols,
      [
        String(i + 1),
        partCode ?? "—",
        partName ?? "—",
        num(item.quantity),
        item.unit ?? "—",
        item.remarks || "—",
      ],
      { fontSize: 9, maxLines: 2 }
    );
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

  const summaryCols: PdfTableColumn[] = [
    { label: "#", x: MARGIN, width: 18 },
    { label: "Part Code", x: 58, width: 66 },
    { label: "Item", x: 128, width: 148 },
    { label: "Unit", x: 280, width: 36 },
    { label: "Total Issued", x: 320, width: 68, align: "right" },
    { label: "Issues", x: 392, width: 42, align: "right" },
    { label: "Last Issue", x: 438, width: 117, align: "right" },
  ];
  y = tableHeader(doc, y, summaryCols);

  if (summary.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("No material issues found for this period.", MARGIN, y + 8);
    y += 22;
  }
  summary.forEach((row, i) => {
    y = ensureSpace(doc, y, 52);
    y = drawRow(
      doc,
      y,
      summaryCols,
      [
        String(i + 1),
        row.part_code,
        row.part_name,
        row.unit || "—",
        num(row.total_quantity),
        String(row.issue_count),
        fmtDateTime(row.last_issue_at),
      ],
      { fontSize: 8.5, maxLines: 2 }
    );
  });

  y = ensureSpace(doc, y, 70);
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Issue Details", MARGIN, y);
  y += 10;

  const detailCols: PdfTableColumn[] = [
    { label: "Date", x: MARGIN, width: 90 },
    { label: "Reference", x: 132, width: 74 },
    { label: "Item", x: 208, width: 148 },
    { label: "Source", x: 358, width: 76 },
    { label: "Qty", x: 436, width: 44, align: "right" },
    { label: "Note", x: 482, width: 73 },
  ];
  y = tableHeader(doc, y, detailCols);

  lines.forEach((line) => {
    y = ensureSpace(doc, y, 52);
    y = drawRow(
      doc,
      y,
      detailCols,
      [
        fmtDateTime(line.created_at),
        line.reference_no ?? "—",
        `${line.part_code} ${line.part_name}`,
        MOVEMENT_LABELS[line.movement_type] ?? line.movement_type,
        `${num(line.quantity)} ${line.unit}`.trim(),
        line.note ?? "—",
      ],
      { fontSize: 8, maxLines: 2 }
    );
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
