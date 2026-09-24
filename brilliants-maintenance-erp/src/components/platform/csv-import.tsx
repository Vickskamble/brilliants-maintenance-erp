"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IMPORT_SCHEMAS,
  ImportResult,
  ImportSchema,
  mapCsvToRows,
  runImport,
} from "@/services/imports";
import { useQueryScope } from "@/lib/auth/query-scope";
import { logAuditAction } from "@/services/platform";
import { useAuth } from "@/lib/auth/context";
import { AlertTriangle, CheckCircle2, Download, FileUp, Loader2, X } from "lucide-react";

export function CsvImportCard({
  schema,
}: {
  schema: ImportSchema;
}) {
  const scope = useQueryScope();
  const { user, profile } = useAuth();
  const [pendingRows, setPendingRows] = useState<Record<string, string>[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setResult(null);
    setParseError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = mapCsvToRows(schema, String(reader.result ?? ""));
      setPendingRows(res.rows);
      setParseError(res.error);
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const blob = new Blob([`\uFEFF${schema.template}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${schema.key}-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function doImport() {
    if (!pendingRows) return;
    setIsRunning(true);
    const res = await runImport(schema.key, pendingRows, scope);
    setResult(res);
    if (res.inserted > 0) {
      void logAuditAction(
        scope,
        {
          action: "csv.import",
          entityType: schema.key,
          summary: `Imported ${res.inserted} ${schema.label} row(s)${res.skipped ? ` (${res.skipped} skipped)` : ""}`,
          metadata: { inserted: res.inserted, skipped: res.skipped },
        },
        { id: user?.id, name: profile?.name }
      );
    }
    setIsRunning(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileUp className="h-4 w-4 text-gray-500" />
          Import {schema.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500">{schema.hint}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Template
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e)}
            />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <FileUp className="h-4 w-4" />
              Choose CSV
            </span>
          </label>
          {pendingRows && (
            <Button
              size="sm"
              onClick={() => void doImport()}
              disabled={isRunning || pendingRows.length === 0}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Import {pendingRows.length} row(s)
            </Button>
          )}
        </div>

        {parseError && (
          <p className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {parseError}
          </p>
        )}

        {pendingRows && pendingRows.length > 0 && !result && (
          <div className="max-h-48 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  {schema.columns.map((c) => (
                    <th key={c.key} className="px-3 py-2 font-medium text-gray-500">
                      {c.label.split(" (")[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    {schema.columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-gray-700">
                        {r[c.key] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">{result.inserted} inserted</Badge>
              <Badge variant="warning">{result.skipped} skipped</Badge>
            </div>
            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-auto rounded-lg border border-red-100 bg-red-50 p-3">
                <ul className="space-y-1 text-xs text-red-600">
                  {result.errors.slice(0, 20).map((err, i) => (
                    <li key={i}>• {err}</li>
                  ))}
                  {result.errors.length > 20 && (
                    <li>… and {result.errors.length - 20} more</li>
                  )}
                </ul>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ImportSchemaPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="block w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {IMPORT_SCHEMAS.map((s) => (
        <option key={s.key} value={s.key}>
          {s.label}
        </option>
      ))}
    </select>
  );
}