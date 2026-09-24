"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingPage } from "@/components/common/loading";
import { PermissionGate } from "@/components/auth/permission-gate";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  listGrns,
  getReceiveablePurchaseOrders,
  postGrn,
  type PurchaseOrderWithItems,
} from "@/services/procurement";
import {
  PackageCheck,
  Inbox,
  ClipboardList,
  ArrowRight,
  Save,
} from "lucide-react";

function GrnPageContent() {
  const scope = useQueryScope();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [pos, setPos] = useState<PurchaseOrderWithItems[]>([]);
  const [grns, setGrns] = useState<Awaited<ReturnType<typeof listGrns>>["data"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingGrns, setLoadingGrns] = useState(true);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderWithItems | null>(null);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  async function loadPos(preselectedId?: string | null) {
    const res = await getReceiveablePurchaseOrders(scope);
    setPos(res.data);
    setIsLoading(false);
    if (preselectedId) {
      const match = res.data.find((po) => po.id === preselectedId);
      if (match) {
        setSelectedPo(match);
        const initial: Record<string, string> = {};
        match.purchase_order_items.forEach((item) => {
          initial[item.id] = String(item.quantity_ordered - item.quantity_received);
        });
        setQuantities(initial);
      }
    }
  }

  async function loadGrns() {
    const res = await listGrns(scope);
    setGrns(res.data);
    setLoadingGrns(false);
  }

  useEffect(() => {
    void loadPos(searchParams.get("po"));
    void loadGrns();
  }, []);

  function selectPo(po: PurchaseOrderWithItems | null) {
    setSelectedPo(po);
    if (!po) {
      setQuantities({});
      return;
    }
    const initial: Record<string, string> = {};
    po.purchase_order_items.forEach((item) => {
      initial[item.id] = String(item.quantity_ordered - item.quantity_received);
    });
    setQuantities(initial);
  }

  async function doPost() {
    if (!selectedPo || !user) return;
    const items = selectedPo.purchase_order_items
      .map((item) => ({
        order_item_id: item.id,
        spare_part_id: item.spare_part_id,
        quantity_received: Number(quantities[item.id] ?? 0),
      }))
      .filter((i) => i.quantity_received > 0);
    if (items.length === 0) {
      window.alert("Enter a received quantity for at least one line item.");
      return;
    }
    setIsPosting(true);
    const res = await postGrn(scope, {
      purchase_order_id: selectedPo.id,
      remarks: remarks || null,
      receivedBy: user.id,
      items,
    });
    setIsPosting(false);
    if (res.error) {
      window.alert(res.error);
      return;
    }
    setRemarks("");
    setSelectedPo(null);
    setQuantities({});
    void loadPos();
    void loadGrns();
  }

  const isFullyReceived =
    selectedPo &&
    selectedPo.purchase_order_items.every(
      (item) => item.quantity_received >= item.quantity_ordered
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goods Receipt Notes"
        description="Receive spare parts against purchase orders into inventory."
        backHref="/inventory"
        action={
          <Link href="/inventory/orders">
            <Button variant="outline">
              <ClipboardList className="mr-2 h-4 w-4" />
              Purchase Orders
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Inbox className="h-4 w-4 text-blue-600" />
            Select an open purchase order
          </h3>
          {isLoading ? (
            <LoadingPage />
          ) : pos.length === 0 ? (
            <EmptyState
              icon={<PackageCheck />}
              title="No open purchase orders"
              description="Orders with status Ordered or Partially Received appear here."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {pos.map((po) => {
                const openItems = po.purchase_order_items.filter(
                  (i) => i.quantity_received < i.quantity_ordered
                ).length;
                return (
                  <button
                    key={po.id}
                    type="button"
                    onClick={() => selectPo(po)}
                    className={`rounded-lg border p-3 text-left transition ${
                      selectedPo?.id === po.id
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-gray-200 bg-white hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {po.po_no}
                      </span>
                      <Badge variant="warning" className="ml-2">
                        {openItems} open
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {po.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {po.vendors?.name ?? "No vendor"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPo && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                  Receiving {selectedPo.po_no} — {selectedPo.title}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedPo.vendors?.name ?? "No vendor"} · {selectedPo.po_no}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => selectPo(null)}>
                Change PO
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-2">Part</th>
                    <th className="pb-2">Ordered</th>
                    <th className="pb-2">Received</th>
                    <th className="pb-2 text-right">Receive now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedPo.purchase_order_items.map((item) => {
                    const remaining =
                      item.quantity_ordered - item.quantity_received;
                    return (
                      <tr key={item.id}>
                        <td className="py-2 pr-3">
                          <p className="font-medium text-gray-900">
                            {item.spare_parts?.part_code ?? "-"} —{" "}
                            {item.spare_parts?.part_name ?? "Unknown part"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {item.spare_parts?.unit ?? ""} · ₹{item.unit_price}
                          </p>
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-gray-600">
                          {item.quantity_ordered}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-gray-600">
                          {item.quantity_received}
                        </td>
                        <td className="py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            value={quantities[item.id] ?? ""}
                            onChange={(e) =>
                              setQuantities((q) => ({
                                ...q,
                                [item.id]: e.target.value,
                              }))
                            }
                            className="ml-auto w-24 text-right"
                          />
                          <p className="mt-0.5 text-xs text-gray-400">
                            max {remaining}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="grn-remarks">Remarks (optional)</Label>
                <Textarea
                  id="grn-remarks"
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Received in good condition"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <p className="mr-auto text-xs text-gray-400">
                  Posting will add stock movement{" "}
                  <span className="font-mono">purchase_in</span> and update part
                  stock.
                </p>
                {isFullyReceived && (
                  <Badge variant="success">All items fully received</Badge>
                )}
                <Button onClick={() => void doPost()} disabled={isPosting}>
                  <Save className="mr-2 h-4 w-4" />
                  {isPosting ? "Posting..." : "Post GRN"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Recent GRNs
            </h3>
          </div>
          {loadingGrns ? (
            <LoadingPage />
          ) : grns.length === 0 ? (
            <EmptyState
              icon={<PackageCheck />}
              title="No goods receipts yet"
              description="Receipts posted from this screen will appear here."
            />
          ) : (
            <DataTable
              idKey={(row) => row.id}
              data={grns}
              columns={[
                {
                  key: "grn_no",
                  header: "GRN",
                  render: (row) => (
                    <span className="font-mono text-sm font-medium text-blue-600">
                      {row.grn_no}
                    </span>
                  ),
                },
                {
                  key: "po",
                  header: "Purchase Order",
                  render: (row) => (
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {row.purchase_orders?.title ?? "-"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.purchase_orders?.po_no ?? ""}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "received_at",
                  header: "Received",
                  render: (row) => (
                    <span className="text-sm text-gray-500">
                      {row.received_at
                        ? new Date(row.received_at).toLocaleString("en-IN")
                        : "-"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => (
                    <Badge>{row.status}</Badge>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function GrnPage() {
  return (
    <ERPLayout>
      <PermissionGate module="inventory" action="view">
        <Suspense fallback={<LoadingPage />}>
          <GrnPageContent />
        </Suspense>
      </PermissionGate>
    </ERPLayout>
  );
}