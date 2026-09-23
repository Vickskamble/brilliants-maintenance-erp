export type ExportCell = string | number | boolean | null | undefined;

function csvEscape(value: ExportCell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportRowsToCsv(
  fileName: string,
  headerRow: string[],
  rows: ExportCell[][]
): void {
  if (typeof window === "undefined") return;
  const lines = [
    headerRow.map(csvEscape).join(","),
    ...rows.map((row) => row.map(csvEscape).join(",")),
  ];
  const csv = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}