"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import { rel } from "@/lib/postgrest-rel";
import { MATERIAL_ISSUE_STATUSES, MATERIAL_ISSUE_TO_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  listMaterialIssues,
  type MaterialIssueRow,
} from "@/services/material-issues";
import { downloadMaterialIssuePdf } from "@/lib/pdf/inventory";
import {
  PackageMinus,
  Plus,
  Search,
  FileDown,
  Eye,
  BarChart3,
  Package,
} from "lucide-react";

function issuedToLabel(row: MaterialIssueRow): string {
  if (row.issued_to_type === "department") {
    return rel(row.departments)?.name ?? "Department";
  }
  if (row.issued_to_type === "equipment") {
    return rel(row.equipment)?.equipment_name ?? "Equipment";
  }
  if (row.issued_to_type === "work_order") {
    const wo = rel(row.work_orders);
    return wo ? `${wo.work_order_no} · ${wo.title}` : "Work Order";
  }
  return row.issued_to_name || "—";
}

export default function MaterialIssuesPage() {
  const { organization, plant } = useAuth();
  const scope = useQueryScope();

  const [items, setItems] = useState<MaterialIssueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.organizationId, scope.plantId, statusFilter, from, to]);

  async function load() {
    setIsLoading(true);
    setError("");
    const res = await listMaterialIssues(scope, {
      status: statusFilter || undefined,
      from: from || undefined,
      to: to || undefined,
    });
    setItems(res.data);
    setError(res.error ?? "");
    setIsLoading(false);
  }

  const filtered = items.filter((row) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      row.issue_no.toLowerCase().includes(term) ||
      issuedToLabel(row).toLowerCase().includes(term) ||
      (row.purpose ?? "").toLowerCase().includes(term) ||
      row.material_issue_items.some((item) => {
        const part = rel(item.spare_parts);
        return (
          part?.part_code?.toLowerCase().includes(term) ||
          part?.part_name?.toLowerCase().includes(term)
        );
      })
    );
  });

  const totalQty = filtered.reduce((sum, row) => sum + (row.total_quantity ?? 0), 0);

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Material Issues"
            description="Issue spare parts and consumables from the store to departments, equipment, work orders or people."
            backHref="/inventory"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/inventory">
                  <Button variant="outline">
                    <Package className="mr-2 h-4 w-4" />
                    Inventory
                  </Button>
                </Link>
                <Link href="/inventory/issues/register">
                  <Button variant="outline">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Item-wise Register
                  </Button>
                </Link>
                <Link href="/inventory/issues/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Issue
                  </Button>
                </Link>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Issue Slips</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{filtered.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Total Quantity Issued</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{totalQty}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">Scope</p>
                <p className="mt-1 text-sm font-medium text-gray-900">
                  {plant?.name ?? "All plants"} · {organization?.display_name ?? "Organization"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search issue no, item, department or purpose..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="All statuses"
                  className="md:w-44"
                  options={MATERIAL_ISSUE_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    aria-label="From date"
                    className="md:w-40"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <Input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    aria-label="To date"
                    className="md:w-40"
                  />
                </div>
              </div>

              {isLoading ? (
                <LoadingPage />
              ) : error ? (
                <div className="px-6 py-8 text-sm text-red-600">{error}</div>
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<PackageMinus />}
                  title="No material issues"
                  description="Start a new issue to hand over stock from the store."
                  action={
                    <Link href="/inventory/issues/new">
                      <Button>New Issue</Button>
                    </Link>
                  }
                />
              ) : (
                <DataTable
                  idKey={(row) => row.id}
                  data={filtered}
                  columns={[
                    {
                      key: "issue_no",
                      header: "Issue No",
                      render: (row) => (
                        <Link
                          href={`/inventory/issues/${row.id}`}
                          className="font-mono text-sm font-medium text-blue-600 hover:underline"
                        >
                          {row.issue_no}
                        </Link>
                      ),
                    },
                    {
                      key: "issue_date",
                      header: "Date",
                      render: (row) => (
                        <span className="text-sm text-gray-700">{formatDate(row.issue_date)}</span>
                      ),
                    },
                    {
                      key: "issued_to",
                      header: "Issued To",
                      render: (row) => (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{issuedToLabel(row)}</p>
                          <p className="text-xs capitalize text-gray-400">
                            {MATERIAL_ISSUE_TO_TYPES.find((t) => t.value === row.issued_to_type)
                              ?.label ?? row.issued_to_type}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "items",
                      header: "Items",
                      render: (row) => (
                        <div className="space-y-0.5">
                          {row.material_issue_items.slice(0, 2).map((item) => {
                            const part = rel(item.spare_parts);
                            return (
                              <p key={item.id} className="text-xs text-gray-600">
                                {part?.part_code ?? "—"} × {item.quantity} {item.unit ?? ""}
                              </p>
                            );
                          })}
                          {row.material_issue_items.length > 2 && (
                            <p className="text-xs text-gray-400">
                              +{row.material_issue_items.length - 2} more
                            </p>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "total_quantity",
                      header: "Qty",
                      render: (row) => (
                        <span className="text-sm font-semibold text-gray-900">
                          {row.total_quantity ?? 0}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (row) => {
                        const info = MATERIAL_ISSUE_STATUSES.find((s) => s.value === row.status);
                        return <Badge className={info?.color}>{info?.label ?? row.status}</Badge>;
                      },
                    },
                    {
                      key: "created_by",
                      header: "Issued By",
                      render: (row) => (
                        <span className="text-sm text-gray-600">{row.created_by_name ?? "—"}</span>
                      ),
                    },
                    {
                      key: "actions",
                      header: "",
                      render: (row) => (
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/inventory/issues/${row.id}`}>
                            <Button size="sm" variant="ghost" title="View / Print">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Download PDF"
                            onClick={() =>
                              void downloadMaterialIssuePdf(row, {
                                organizationName: organization?.display_name,
                                plantName: plant?.name,
                                issuedByName: row.created_by_name,
                                departmentName: rel(row.departments)?.name ?? null,
                                equipmentName: rel(row.equipment)?.equipment_name ?? null,
                                workOrderNo: rel(row.work_orders)?.work_order_no ?? null,
                              })
                            }
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              )}
            </CardContent>
          </Card>

          {!isLoading && filtered.length > 0 && (
            <p className="text-xs text-gray-500">
              Tip: open the <Link href="/inventory/issues/register" className="text-blue-600 hover:underline">Item-wise Register</Link>{" "}
              to see how much of a single item (for example petrol) has been issued till date.
            </p>
          )}
        </div>
      </PermissionGate>
    </ERPLayout>
  );
}
