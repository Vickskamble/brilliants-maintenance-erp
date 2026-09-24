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
import { useQueryScope } from "@/lib/auth/query-scope";
import { PURCHASE_ORDER_STATUSES } from "@/lib/constants";
import {
  listPurchaseOrders,
  createPurchaseOrder,
  setPurchaseOrderStatus,
  deletePurchaseOrder,
  getVendors,
  getSparePartOptions,
  getApprovedMaterialRequests,
  setMaterialRequestStatus,
  type PurchaseOrderWithItems,
} from "@/services/procurement";
import { Plus, Search, FileText, Send, CheckCheck, Truck, X, Trash2, Package, ShoppingCart, ClipboardList, ArrowRight } from "lucide-react";

interface LineItem {
  spare_part_id: string;
  quantity_ordered: string;
  unit_price: string;
  key: number;
}

export default function PurchaseOrdersPage() {
  const scope = useQueryScope();

  const [items, setItems] = useState<PurchaseOrderWithItems[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [approvalMRS, setApprovalMRs] = useState<{ id: string; request_no: string; title: string }[]>([]);
  const [parts, setParts] = useState<{ id: string; part_code: string; part_name: string; unit: string }[]>([]);
  const [form, setForm] = useState({
    title: "",
    vendor_id: "",
    material_request_id: "",
    expected_delivery: "",
    remarks: "",
  });
  const [lines, setLines] = useState<LineItem[]>([
    { spare_part_id: "", quantity_ordered: "1", unit_price: "0", key: 1 },
  ]);
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
        const [vendorRes, partsRes, mrRes] = await Promise.all([
          getVendors(),
          getSparePartOptions(),
          getApprovedMaterialRequests(scope),
        ]);
        setVendors(vendorRes.data);
        setParts(partsRes.data);
        setApprovalMRs(mrRes.data);
      })();
    }
  }, [modalOpen]);

  async function load() {
    setIsLoading(true);
    const res = await listPurchaseOrders(scope);
    const filtered = res.data.filter((row) => {
      const matchesSearch =
        !debouncedSearch ||
        row.po_no.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
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

  async function applyMr(mrId: string) {
    const mr = approvalMRS.find((m) => m.id === mrId);
    if (!mr) return;
    const supabase = (
      await import("@/lib/supabase/client")
    ).createClient();
    const { data } = await supabase
      .from("material_requests")
      .select("id, title, material_request_items(spare_part_id, quantity_approved, quantity_requested)")
      .eq("id", mrId)
      .single();
    if (!data) return;
    const items = (data.material_request_items as unknown as {
      spare_part_id: string;
      quantity_approved: number | null;
      quantity_requested: number;
    }[]) ?? [];
    setForm((f) => ({
      ...f,
      material_request_id: mrId,
      title: data.title,
    }));
    setLines(
      items.map((item, index) => ({
        spare_part_id: item.spare_part_id,
        quantity_ordered: String(item.quantity_approved ?? item.quantity_requested),
        unit_price: "0",
        key: index + 1,
      }))
    );
  }

  async function doSubmit() {
    const validLines = lines.filter(
      (line) => line.spare_part_id && Number(line.quantity_ordered) > 0
    );
    if (!form.title.trim() || validLines.length === 0) {
      window.alert("Title and at least one line item (qty > 0) are required.");
      return;
    }
    setIsSaving(true);
    const res = await createPurchaseOrder(scope, {
      vendor_id: form.vendor_id || null,
      material_request_id: form.material_request_id || null,
      title: form.title.trim(),
      expected_delivery: form.expected_delivery || null,
      remarks: form.remarks || null,
      items: validLines.map((line) => ({
        spare_part_id: line.spare_part_id,
        quantity_ordered: Number(line.quantity_ordered),
        unit_price: Number(line.unit_price) || 0,
      })),
    });
    if (!res.error && form.material_request_id) {
      await setMaterialRequestStatus(form.material_request_id, "ordered");
    }
    setIsSaving(false);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setModalOpen(false);
    setForm({ title: "", vendor_id: "", material_request_id: "", expected_delivery: "", remarks: "" });
    setLines([{ spare_part_id: "", quantity_ordered: "1", unit_price: "0", key: nextLineKey() }]);
    void load();
  }

  async function doAction(id: string, status: string) {
    const res = await setPurchaseOrderStatus(id, status);
    if (res.error) window.alert(res.error);
    void load();
  }

  async function doDelete(id: string) {
    if (!window.confirm("Delete this purchase order?")) return;
    const res = await deletePurchaseOrder(id);
    if (res.error) window.alert(res.error);
    void load();
  }

  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <div className="space-y-6">
          <PageHeader
            title="Purchase Orders"
            description="Convert approved material requests into vendor purchase orders."
            backHref="/inventory"
            action={
              <div className="flex items-center gap-2">
                <Link href="/inventory">
                  <Button variant="outline">
                    <Package className="mr-2 h-4 w-4" />
                    Inventory
                  </Button>
                </Link>
                <Link href="/inventory/requests">
                  <Button variant="outline">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Requests
                  </Button>
                </Link>
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New PO
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
                    placeholder="Search PO no or title..."
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
                  options={PURCHASE_ORDER_STATUSES.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </div>

              {isLoading ? (
                <LoadingPage />
              ) : items.length === 0 ? (
                <EmptyState
                  icon={<FileText />}
                  title="No purchase orders"
                  description="Create a purchase order to procure spare parts from vendors."
                />
              ) : (
                <>
                  <DataTable
                    idKey={(row) => row.id}
                    data={items}
                    columns={[
                      {
                        key: "po_no",
                        header: "PO",
                        render: (row) => (
                          <span className="font-mono text-sm font-medium text-blue-600">
                            {row.po_no}
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
                              {row.vendors?.name ?? "No vendor"} ·{" "}
                              {row.material_requests?.request_no ?? "direct PO"}
                            </p>
                          </div>
                        ),
                      },
                      {
                        key: "items",
                        header: "Items",
                        render: (row) => (
                          <div className="space-y-0.5">
                            {row.purchase_order_items.slice(0, 2).map((item) => (
                              <p key={item.id} className="text-xs text-gray-600">
                                {item.spare_parts?.part_code ?? "-"} ×{" "}
                                {item.quantity_ordered}
                              </p>
                            ))}
                            {row.purchase_order_items.length > 2 && (
                              <p className="text-xs text-gray-400">
                                +{row.purchase_order_items.length - 2} more
                              </p>
                            )}
                          </div>
                        ),
                      },
                      {
                        key: "total_amount",
                        header: "Total",
                        render: (row) => (
                          <span className="text-sm font-semibold tabular-nums text-gray-800">
                            {row.currency} {Number(row.total_amount).toLocaleString("en-IN")}
                          </span>
                        ),
                      },
                      {
                        key: "expected_delivery",
                        header: "Due",
                        render: (row) => (
                          <span className="text-sm text-gray-500">
                            {row.expected_delivery
                              ? new Date(row.expected_delivery).toLocaleDateString("en-IN")
                              : "-"}
                          </span>
                        ),
                      },
                      {
                        key: "status",
                        header: "Status",
                        render: (row) => {
                          const info = PURCHASE_ORDER_STATUSES.find(
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
                                  onClick={() => doAction(row.id, "cancelled")}
                                >
                                  <X className="mr-1 h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                              </>
                            )}
                            {row.status === "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                                onClick={() => doAction(row.id, "ordered")}
                              >
                                <Truck className="mr-1 h-3.5 w-3.5" />
                                Mark Ordered
                              </Button>
                            )}
                            {["ordered", "partially_received"].includes(
                              row.status
                            ) && (
                              <Link href={`/inventory/grn?po=${row.id}`}>
                                <Button size="sm">
                                  <ArrowRight className="mr-1 h-3.5 w-3.5" />
                                  Receive
                                </Button>
                              </Link>
                            )}
                            {["draft", "cancelled"].includes(row.status) && (
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
          title="New Purchase Order"
          description="Raise a purchase order against a vendor."
          size="lg"
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void doSubmit()} disabled={isSaving}>
                {isSaving ? "Creating..." : "Create PO"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="po-title">Title</Label>
                <Input
                  id="po-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="e.g. Bearing procurement"
                />
              </div>
              <div>
                <Label htmlFor="po-mr">Link to Material Request</Label>
                <Select
                  id="po-mr"
                  value={form.material_request_id}
                  onChange={(e) => void applyMr(e.target.value)}
                  placeholder="None (direct PO)"
                  options={approvalMRS.map((m) => ({
                    value: m.id,
                    label: `${m.request_no} — ${m.title}`,
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="po-vendor">Vendor</Label>
                <Select
                  id="po-vendor"
                  value={form.vendor_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor_id: e.target.value }))
                  }
                  placeholder="Select vendor"
                  options={vendors.map((v) => ({
                    value: v.id,
                    label: `${v.name}${v.code ? ` (${v.code})` : ""}`,
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="po-eta">Expected Delivery</Label>
                <Input
                  id="po-eta"
                  type="date"
                  value={form.expected_delivery}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expected_delivery: e.target.value }))
                  }
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
                      { spare_part_id: "", quantity_ordered: "1", unit_price: "0", key: nextLineKey() },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add line
                </Button>
              </div>
              <div className="space-y-2">
                {lines.map((line) => {
                  return (
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
                          label: `${p.part_code} — ${p.part_name}`,
                        }))}
                      />
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity_ordered}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key
                                ? { ...l, quantity_ordered: e.target.value }
                                : l
                            )
                          )
                        }
                        className="w-20"
                        title="Qty"
                      />
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key
                                ? { ...l, unit_price: e.target.value }
                                : l
                            )
                          )
                        }
                        className="w-28"
                        title="Unit price"
                      />
                      <span className="w-28 shrink-0 text-xs text-gray-500">
                        ={" "}
                        {(Number(line.quantity_ordered) || 0) *
                          (Number(line.unit_price) || 0)}
                      </span>
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
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="po-remarks">Remarks</Label>
              <Textarea
                id="po-remarks"
                rows={2}
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <ShoppingCart className="h-3.5 w-3.5" />
              Total is recomputed from line items on create.
            </p>
          </div>
        </ERPModal>
      </PermissionGate>
    </ERPLayout>
  );
}