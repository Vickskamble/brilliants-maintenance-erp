import type {
  MaterialRequestWithItems,
  PurchaseOrderWithItems,
} from "@/services/procurement";

export interface PdfMeta {
  organizationName?: string | null;
  plantName?: string | null;
}

const MARGIN = 40;
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const CONTENT_W = PAGE_W - MARGIN * 2;

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
  return Number(value ?? 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

type Doc = import("jspdf").jsPDF;

function header(doc: Doc, title: string, docNo: string, meta: PdfMeta): number {
  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, PAGE_W, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(meta.organizationName || "Brilliants Industrial Services", MARGIN, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Plant: ${meta.plantName || "All plants"}`,
    MARGIN,
    52
  );
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
    doc.text(value, x, y + 14);
    x += colW;
  }
  return y + 34;
}

function tableHeader(doc: Doc, y: number, columns: { label: string; x: number; align?: "left" | "right" }[]): number {
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

function signatureBlock(doc: Doc, y: number, labels: string[]): void {
  y = ensureSpace(doc, y, 70);
  y += 30;
  doc.setDrawColor(209, 213, 219);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const colW = CONTENT_W / labels.length;
  labels.forEach((label, i) => {
    const x = MARGIN + colW * i;
    doc.line(x, y, x + colW - 30, y);
    doc.text(label, x, y + 12);
  });
}

export async function downloadMaterialRequestPdf(
  mr: MaterialRequestWithItems,
  meta: PdfMeta = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = header(doc, "Material Request", mr.request_no, meta);
  y = metaRow(doc, y, [
    ["Title", mr.title || "—"],
    ["Status", pretty(mr.status)],
    ["Priority", pretty(mr.priority)],
  ]);
  y = metaRow(doc, y, [
    ["Requested On", fmtDate(mr.created_at)],
    ["Items", String(mr.material_request_items.length)],
    ["Plant", meta.plantName || "—"],
  ]);

  const cols = [
    { label: "#", x: MARGIN },
    { label: "Part Code", x: MARGIN + 30 },
    { label: "Part Name", x: MARGIN + 150 },
    { label: "Qty Req.", x: PAGE_W - MARGIN - 90, align: "right" as const },
    { label: "Qty Appr.", x: PAGE_W - MARGIN, align: "right" as const },
  ];
  y = tableHeader(doc, y, cols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  mr.material_request_items.forEach((item, i) => {
    y = ensureSpace(doc, y, 20);
    doc.setTextColor(17, 24, 39);
    doc.text(String(i + 1), cols[0].x, y);
    doc.text(item.spare_parts?.part_code ?? "—", cols[1].x, y);
    doc.text(
      (item.spare_parts?.part_name ?? "—").slice(0, 42),
      cols[2].x,
      y
    );
    doc.text(
      `${num(item.quantity_requested)} ${item.spare_parts?.unit ?? ""}`.trim(),
      cols[3].x,
      y,
      { align: "right" }
    );
    doc.text(
      item.quantity_approved != null ? num(item.quantity_approved) : "—",
      cols[4].x,
      y,
      { align: "right" }
    );
    y += 18;
  });

  if (mr.remarks) {
    y = ensureSpace(doc, y, 50);
    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Remarks", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const lines = doc.splitTextToSize(mr.remarks, CONTENT_W);
    doc.text(lines, MARGIN, y + 14);
    y += 14 + lines.length * 12;
  }

  signatureBlock(doc, y, ["Requested By", "Approved By (Manager)"]);
  doc.save(`${mr.request_no}.pdf`);
}

export async function downloadPurchaseOrderPdf(
  po: PurchaseOrderWithItems,
  meta: PdfMeta = {}
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  let y = header(doc, "Purchase Order", po.po_no, meta);
  y = metaRow(doc, y, [
    ["Title", po.title || "—"],
    ["Status", pretty(po.status)],
    ["Vendor", po.vendors?.name ?? "—"],
  ]);
  y = metaRow(doc, y, [
    ["Expected Delivery", fmtDate(po.expected_delivery)],
    ["Material Request", po.material_requests?.request_no ?? "Direct PO"],
    ["Created On", fmtDate(po.created_at)],
  ]);

  const cols = [
    { label: "#", x: MARGIN },
    { label: "Part Code", x: MARGIN + 30 },
    { label: "Part Name", x: MARGIN + 140 },
    { label: "Qty", x: PAGE_W - MARGIN - 150, align: "right" as const },
    { label: "Rate", x: PAGE_W - MARGIN - 80, align: "right" as const },
    { label: "Amount", x: PAGE_W - MARGIN, align: "right" as const },
  ];
  y = tableHeader(doc, y, cols);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  po.purchase_order_items.forEach((item, i) => {
    y = ensureSpace(doc, y, 20);
    const amount = Number(item.quantity_ordered) * Number(item.unit_price);
    doc.setTextColor(17, 24, 39);
    doc.text(String(i + 1), cols[0].x, y);
    doc.text(item.spare_parts?.part_code ?? "—", cols[1].x, y);
    doc.text(
      (item.spare_parts?.part_name ?? "—").slice(0, 38),
      cols[2].x,
      y
    );
    doc.text(num(item.quantity_ordered), cols[3].x, y, { align: "right" });
    doc.text(num(item.unit_price), cols[4].x, y, { align: "right" });
    doc.text(num(amount), cols[5].x, y, { align: "right" });
    y += 18;
  });

  y = ensureSpace(doc, y, 30);
  doc.setDrawColor(209, 213, 219);
  doc.line(MARGIN + CONTENT_W / 2, y + 4, PAGE_W - MARGIN, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text(`Total: ${po.currency} ${num(po.total_amount)}`, PAGE_W - MARGIN, y + 20, {
    align: "right",
  });
  y += 30;

  if (po.remarks) {
    y = ensureSpace(doc, y, 40);
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Remarks", MARGIN, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(po.remarks, CONTENT_W);
    doc.text(lines, MARGIN, y + 14);
    y += 14 + lines.length * 12;
  }

  signatureBlock(doc, y, ["Prepared By", "Approved By (Manager)", "Vendor"]);
  doc.save(`${po.po_no}.pdf`);
}
