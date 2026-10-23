"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  getMaterialRequestById,
  receiveMaterialRequest,
  type MaterialRequestWithItems,
} from "@/services/procurement";
import { ArrowLeft, PackageCheck } from "lucide-react";

interface ReceiveLine {
  item_id: string;
  spare_part_id: string;
  part_code: string;
  part_name: string;
  unit: string;
  quantity_approved: number;
  quantity_received_already: number;
  quantity: number;
  direction: "in" | "out";
  note: string;
}

export default function ReceiveMaterialPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const { user } = useAuth();
  const scope = useQueryScope();

  const [mr, setMr] = useState<MaterialRequestWithItems | null>(null);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    const res = await getMaterialRequestById(id);
    if (!res.data) {
      setError(res.error ?? "Material request not found");
      setIsLoading(false);
      return;
    }
    if (!["approved", "ordered", "partially_received"].includes(res.data.status)) {
      setError(
        `This request is in status "${res.data.status}" — only approved / ordered / partially received requests can be received.`
      );
      setMr(res.data);
      setIsLoading(false);
      return;
    }
    setMr(res.data);
    setLines(
      res.data.material_request_items.map((item) => {
        const approved = item.quantity_approved ?? item.quantity_requested;
        const already = item.quantity_received ?? 0;
        return {
          item_id: item.id,
          spare_part_id: item.spare_part_id,
          part_code: item.spare_parts?.part_code ?? "—",
          part_name: item.spare_parts?.part_name ?? "—",
          unit: item.spare_parts?.unit ?? "",
          quantity_approved: approved,
          quantity_received_already: already,
          quantity: Math.max(0, approved - already),
          direction: "in" as const,
          note: "",
        };
      })
    );
    setIsLoading(false);
  }

  useEffect(() => {
    if (id) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function doReceive() {
    if (!user) return;
    const payload = lines
      .filter((l) => l.quantity > 0)
      .map((l) => ({
        item_id: l.item_id,
        spare_part_id: l.spare_part_id,
        quantity_received: l.quantity,
        direction: l.direction,
        note: l.note || null,
      }));
    if (payload.length === 0) {
      window.alert("Enter a quantity for at least one line.");
      return;
    }
    const inQty = payload
      .filter((p) => p.direction === "in")
      .reduce((s, p) => s + p.quantity_received, 0);
    const outQty = payload
      .filter((p) => p.direction === "out")
      .reduce((s, p) => s + p.quantity_received, 0);
    const confirmMsg =
      outQty > 0
        ? `Receive: stock IN ${inQty} unit(s), stock OUT ${outQty} unit(s). Continue?`
        : `Receive: stock IN ${inQty} unit(s). Continue?`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    const { error: recvErr } = await receiveMaterialRequest(scope, {
      materialRequestId: id,
      receivedBy: user.id,
      items: payload,
    });
    setIsSaving(false);
    if (recvErr) {
      window.alert(recvErr);
      return;
    }
    router.push(`/inventory/requests/${id}`);
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (error) {
    return (
      <ERPLayout>
        <PageHeader
          title="Receive Material"
          backHref={`/inventory/requests/${id}`}
          description={mr?.request_no ?? ""}
          action={
            <Link href={`/inventory/requests/${id}`}>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          }
        />
        <EmptyState title="Cannot receive" description={error} />
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <PageHeader
        title={`Receive · ${mr?.request_no ?? ""}`}
        backHref={`/inventory/requests/${id}`}
        description={mr?.title ?? ""}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/inventory/requests/${id}`}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={() => void doReceive()} disabled={isSaving}>
              <PackageCheck className="mr-2 h-4 w-4" />
              {isSaving ? "Receiving..." : "Confirm Receive"}
            </Button>
          </div>
        }
      />

      <div className="text-sm text-gray-500">
        {mr && (
          <>
            Status <span className="font-medium text-gray-700">{mr.status}</span> · Created{" "}
            {formatDateTime(mr.created_at)} · Choose direction per line:
            <span className="ml-2 font-medium text-green-700">IN</span> adds to stock,
            <span className="ml-1 font-medium text-red-700">OUT</span> issues from stock.
          </>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Part
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Approved
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Already Recv.
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Direction
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lines.map((line, idx) => (
                  <tr key={line.item_id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {line.part_code}
                      <span className="ml-2 font-normal text-gray-500">{line.part_name}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {line.quantity_approved} {line.unit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                      {line.quantity_received_already}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Input
                        type="number"
                        min={0}
                        className="w-20 text-right"
                        value={line.quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setLines((prev) =>
                            prev.map((p, i) =>
                              i === idx
                                ? { ...p, quantity: Number.isFinite(v) && v >= 0 ? v : 0 }
                                : p
                            )
                          );
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-3">
                        <label className="flex cursor-pointer items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`dir-${line.item_id}`}
                            checked={line.direction === "in"}
                            onChange={() =>
                              setLines((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, direction: "in" } : p))
                              )
                            }
                          />
                          <span className="font-medium text-green-700">IN</span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-1 text-sm">
                          <input
                            type="radio"
                            name={`dir-${line.item_id}`}
                            checked={line.direction === "out"}
                            onChange={() =>
                              setLines((prev) =>
                                prev.map((p, i) => (i === idx ? { ...p, direction: "out" } : p))
                              )
                            }
                          />
                          <span className="font-medium text-red-700">OUT</span>
                        </label>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        placeholder="Optional note"
                        value={line.note}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, note: v } : p))
                          );
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void doReceive()} disabled={isSaving} size="lg">
          <PackageCheck className="mr-2 h-4 w-4" />
          {isSaving ? "Receiving..." : "Confirm Receive"}
        </Button>
      </div>
    </ERPLayout>
  );
}
