"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import { createClient } from "@/lib/supabase/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  listItemIssueRegister,
  type ItemIssueRegister,
} from "@/services/material-issues";
import { downloadMaterialIssueRegisterPdf } from "@/lib/pdf/inventory";
import { ChevronLeft, FileDown, Printer, BarChart3 } from "lucide-react";

const MOVEMENT_LABELS: Record<string, string> = {
  material_issue: "Material Issue",
  mr_issue: "MR Issue",
  workorder_issue: "Work Order Issue",
  breakdown_use: "Breakdown Use",
};

const EMPTY: ItemIssueRegister = { summary: [], lines: [], total_quantity: 0 };

export default function MaterialIssueRegisterPage() {
  const { organization, plant } = useAuth();
  const scope = useQueryScope();
  const supabase = createClient();

  const [parts, setParts] = useState<{ id: string; part_code: string; part_name: string; unit: string }[]>([]);
  const [partId, setPartId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [register, setRegister] = useState<ItemIssueRegister>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadParts() {
      const { data } = await supabase
        .from("spare_parts")
        .select("id, part_code, part_name, unit")
        .order("part_code");
      setParts((data ?? []) as { id: string; part_code: string; part_name: string; unit: string }[]);

      const preset = new URLSearchParams(window.location.search).get("part");
      if (preset) setPartId(preset);
    }
    void loadParts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.organizationId, scope.plantId, partId, from, to]);

  async function load() {
    setIsLoading(true);
    setError("");
    const res = await listItemIssueRegister(scope, {
      partId: partId || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setRegister(res.data);
    setError(res.error ?? "");
    setIsLoading(false);
  }

  const selectedPart = parts.find((p) => p.id === partId);

  function downloadPdf() {
    void downloadMaterialIssueRegisterPdf(
      register.summary,
      register.lines,
      {
        organizationName: organization?.display_name,
        plantName: plant?.name,
        registerFrom: from || null,
        registerTo: to || null,
      },
      {
        partLabel: selectedPart
          ? `${selectedPart.part_code} — ${selectedPart.part_name}`
          : "All items",
      }
    );
  }

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <div className="no-print">
            <PageHeader
              title="Item-wise Issue Register"
              description="How much of each item has been issued — all-time or for any date range. Includes material issues, MR issues, work-order issues and breakdown usage."
              backHref="/inventory/issues"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <Link href="/inventory/issues">
                    <Button variant="outline">
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={downloadPdf}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              }
            />
          </div>

          <Card className="no-print">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label htmlFor="part">Item</Label>
                  <Select
                    id="part"
                    value={partId}
                    onChange={(e) => setPartId(e.target.value)}
                    placeholder="All items"
                    options={[
                      { value: "", label: "All items" },
                      ...parts.map((p) => ({
                        value: p.id,
                        label: `${p.part_code} — ${p.part_name} (${p.unit})`,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="to">To</Label>
                  <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Leave dates empty to see the whole history till date. For example, select
                “Petrol” and click PDF to get its total issued quantity.
              </p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Total Issued</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {isLoading ? "…" : register.total_quantity}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Items</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {isLoading ? "…" : register.summary.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Issue Transactions</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {isLoading ? "…" : register.lines.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {isLoading ? (
            <LoadingPage />
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : register.summary.length === 0 ? (
            <EmptyState
              icon={<BarChart3 />}
              title="No issues in this period"
              description="Change the item or date filters, or issue material from the Material Issues page."
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Item-wise Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <Th>Part Code</Th>
                          <Th>Item</Th>
                          <Th>Unit</Th>
                          <Th right>Total Issued</Th>
                          <Th right>Issues</Th>
                          <Th right>Last Issue</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {register.summary.map((row) => (
                          <tr
                            key={row.part_id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => setPartId(row.part_id)}
                          >
                            <td className="px-6 py-3 text-sm font-mono text-gray-700">
                              {row.part_code}
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              {row.part_name}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-600">{row.unit || "—"}</td>
                            <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                              {row.total_quantity}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-gray-600">
                              {row.issue_count}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-gray-600">
                              {formatDate(row.last_issue_at ?? "")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    Issue Details{selectedPart ? ` — ${selectedPart.part_code}` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[560px] overflow-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr className="border-b border-gray-200">
                          <Th>Date</Th>
                          <Th>Reference</Th>
                          <Th>Item</Th>
                          <Th>Source</Th>
                          <Th right>Qty</Th>
                          <Th>Note</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {register.lines.map((line) => (
                          <tr key={line.id}>
                            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-600">
                              {formatDateTime(line.created_at)}
                            </td>
                            <td className="whitespace-nowrap px-6 py-3 text-sm font-mono text-gray-700">
                              {line.reference_no ?? "—"}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-900">
                              <span className="font-medium">{line.part_code}</span>
                              <span className="ml-2 text-gray-500">{line.part_name}</span>
                            </td>
                            <td className="whitespace-nowrap px-6 py-3 text-sm text-gray-600">
                              {MOVEMENT_LABELS[line.movement_type] ?? line.movement_type}
                            </td>
                            <td className="whitespace-nowrap px-6 py-3 text-right text-sm font-semibold text-gray-900">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-500">{line.note ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
