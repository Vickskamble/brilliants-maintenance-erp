"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { ERPModal } from "@/components/erp/erp-modal";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  REQUEST_PRIORITIES,
  MATERIAL_REQUEST_STATUSES,
} from "@/lib/constants";
import {
  listMaterialRequests,
  createMaterialRequest,
  setMaterialRequestStatus,
  deleteMaterialRequest,
  getSparePartOptions,
  type MaterialRequestWithItems,
} from "@/services/procurement";
import {
  Plus,
  Search,
  ClipboardList,
  Send,
  CheckCheck,
  X,
  Trash2,
  Package,
} from "lucide-react";

interface LineItem {
  spare_part_id: string;
  quantity_requested: string;
  key: number;
}

export default function MaterialRequestsPage() {
  const { user } = useAuth();
  const scope = useQueryScope();

  const [items, setItems] = useState<MaterialRequestWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [parts, setParts] = useState<{ id: string; part_code: string; part_name: string; unit: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    priority: "normal",
    remarks: "",
  });
  const [lines, setLines] = useState<LineItem[]>([{ spare_part_id: "", quantity_requested: "1", key: 1 }]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void load();
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => {
    if (modalOpen) {
      void (async () => {
        const res = await getSparePartOptions();
        setParts(res.data);
      })();
    }
  }, [modalOpen]);

  async function load() {
    setIsLoading(true);
    const res = await listMaterialRequests(scope);
    const filtered = res.data.filter((row) => {
      const matchesSearch =
        !debouncedSearch ||
        row.request_no.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        row.title.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = !statusFilter || row.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    setItems(filtered);
    setTotal(filtered.length);
    setIsLoading(false);
  }

  function nextLineKey() {
    return lines.reduce((max, l) => Math.max(max, l.key), 0) + 1;
  }

  async function doSubmit() {
    if (!user) return;
    const validLines = lines.filter(
      (line) => line.spare_part_id && Number(line.quantity_requested) > 0
    );
    if (!form.title.trim() || validLines.length === 0) {
      window.alert("Title and at least one line item (qty > 0) are required.");
      return;
    }
    setIsSaving(true);
    const res = await createMaterialRequest(
      scope,
      {
        title: form.title.trim(),
        priority: form.priority,
        remarks: form.remarks || undefined,
        items: validLines.map((line) => ({
          spare_part_id: line.spare_part_id,
          quantity_requested: Number(line.quantity_requested),
        })),
      },
      user.id
    );
    setIsSaving(false);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setModalOpen(false);
    setForm({ title: "", priority: "normal", remarks: "" });
    setLines([{ spare_part_id: "", quantity_requested: "1", key: nextLineKey() }]);
    void load();
  }

  async function doAction(id: string, status: string) {
    const res = await setMaterialRequestStatus(id, status);
    if (res.error) window.alert(res.error);
    void load();
  }

  async function doDelete(id: string) {
    if (!window.confirm("Delete this material request?")) return;
    const res = await deleteMaterialRequest(id);
    if (res.error) window.alert(res.error);
    void load();
  }

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Material Requests"
            description="Raise and approve requests for spare parts procurement."
            backHref="/inventory"
            action={
              <div className="flex items-center gap-2">
                <Link href="/inventory">
                  <Button variant="outline">
                    <Package className="mr-2 h-4 w-4" />
                    Inventory
                  </Button>
                </Link>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </div>
            }
          />

          <Card>
            <CardContent className="p-0">
              <div className="flex flex-col gap-3 border-b border-gray-200 p-4 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search request no or title..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  placeholder="All statuses"
                  className="md:w-56"
                  options={MATERIAL_REQUEST_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </div>

              {isLoading ? (
                <LoadingPage />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<ClipboardList />}
                  title="No material requests"
                  description="Raise a material request to start the procurement flow."
                />
              ) : (
                <>
                  <DataTable
                    idKey={(row) => row.id}
                    data={items}
                    columns={[
                      {
                        key: "request_no",
                        header: "Request",
                        render: (row) => (
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {row.request_no}
                          </span>
                        ),
                      },
                      {
                        key: "title",
                        header: "Title",
                        render: (row) => (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {row.title}
                            </p>
                            <p className="text-xs text-gray-400">
                              {row.material_request_items.length} item
                              {row.material_request_items.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: "items",
                        header: "Parts",
                        render: (row) => (
                          <div className="space-y-0.5">
                            {row.material_request_items.slice(0, 2).map((item) => (
                              <p key={item.id} className="text-xs text-gray-600">
                                {item.spare_parts?.part_code ?? "-"} ×{" "}
                                {item.quantity_requested}
                              </p>
                            ))}
                            {row.material_request_items.length > 2 && (
                              <p className="text-xs text-gray-400">
                                +{row.material_request_items.length - 2} more
                              </p>
                            )}
                          </div>
                        ),
                      },
                      {
                        key: "priority",
                        header: "Priority",
                        render: (row) => {
                          const info = REQUEST_PRIORITIES.find(
                            (p) => p.value === row.priority
                          );
                          return (
                            <Badge className={info?.color}>
                              {info?.label ?? row.priority}
                            </Badge>
                          );
                        },
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (row) => {
                          const info = MATERIAL_REQUEST_STATUSES.find(
                            (s) => s.value === row.status
                          );
                          return (
                            <Badge className={info?.color}>
                              {info?.label ?? row.status}
                            </Badge>
                          );
                        },
                      },
                      {
                        key: "created_at",
                        header: "Created",
                        render: (row) => (
                          <span className="text-sm text-gray-500">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleDateString("en-IN")
                              : "-"}
                          </span>
                        ),
                      },
                      {
                        key: "actions",
                        header: "",
                        render: (row) => (
                          <div className="flex items-center justify-end gap-1">
                            {row.status === "draft" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => doAction(row.id, "submitted")}
                              >
                                <Send className="mr-1 h-3.5 w-3.5" />
                                Submit
                              </Button>
                            )}
                            {row.status === "submitted" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-200 text-green-700 hover:bg-green-50"
                                  onClick={() => doAction(row.id, "approved")}
                                >
                                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => doAction(row.id, "rejected")}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {["draft", "submitted", "rejected"].includes(row.status) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600"
                                onClick={() => doDelete(row.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ),
                      },
                    ]}
                  />
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    totalItems={total}
                    onPageChange={setPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <ERPModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="New Material Request"
          description="Request spare parts from inventory."
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void doSubmit()} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create Request"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="mr-title">Title</Label>
                <Input
                  id="mr-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Bearings for pump overhauls"
                />
              </div>
              <div>
                <Label htmlFor="mr-priority">Priority</Label>
                <Select
                  id="mr-priority"
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  options={REQUEST_PRIORITIES.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setLines((prev) => [
                      ...prev,
                      { spare_part_id: "", quantity_requested: "1", key: nextLineKey() },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.key} className="flex items-center gap-2">
                    <Select
                      value={line.spare_part_id}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, spare_part_id: e.target.value }
                              : l
                          )
                        )
                      }
                      className="flex-1"
                      placeholder="Select spare part"
                      options={parts.map((p) => ({
                        value: p.id,
                        label: `${p.part_code} — ${p.part_name} (${p.unit})`,
                      }))}
                    />
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity_requested}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l) =>
                            l.key === line.key
                              ? { ...l, quantity_requested: e.target.value }
                              : l
                          )
                        )
                      }
                      className="w-24"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((l) => l.key !== line.key)
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="mr-remarks">Remarks</Label>
              <Textarea
                id="mr-remarks"
                rows={2}
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
        </ERPModal>
      </PermissionGate>
    </ERPLayout>
  );
}