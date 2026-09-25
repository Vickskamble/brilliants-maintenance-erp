"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge as StatusBadgeMeta } from "@/components/common/status-badge";
import { StatusBadge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  getWorkOrder,
  getWorkOrderActivities,
  getWorkOrderStatusHistory,
} from "@/services/work-orders";
import { AttachmentPanel } from "@/components/platform/attachment-panel";
import { WorkOrder } from "@/types/database";
import { WORK_ORDER_TYPES, WORK_ORDER_STATUSES, PRIORITY_LEVELS } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

interface WorkOrderDetail extends WorkOrder {
  plants?: { name: string } | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

interface ActivityRow {
  id: string;
  activity_type: string | null;
  description: string | null;
  started_at: string;
  ended_at: string | null;
  note: string | null;
}

interface HistoryRow {
  id: string;
  old_status: string | null;
  new_status: string;
  remarks: string | null;
  changed_by: string | null;
  changed_at: string;
}

interface SpareRecordRow {
  id: string;
  part_id: string;
  movement_type: string;
  quantity: number;
  reference_no: string | null;
  note: string | null;
  created_at: string;
  spare_parts: { part_code: string; part_name: string; unit: string | null }[] | null;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();

  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [spares, setSpares] = useState<SpareRecordRow[]>([]);
  const [actorNames, setActorNames] = useState<Record<string, string | null>>({});

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "activities", label: "Activities" },
    { key: "spares", label: "Spares" },
    { key: "history", label: "History" },
    { key: "files", label: "Attachments" },
  ];

  async function load() {
    setIsLoading(true);
    const [woRes, activityRes, historyRes, spareRes] = await Promise.all([
      getWorkOrder(id),
      getWorkOrderActivities(id),
      getWorkOrderStatusHistory(id),
      supabase
        .from("stock_movements")
        .select("*, spare_parts(part_code, part_name, unit)")
        .eq("work_order_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (woRes.data) setWorkOrder(woRes.data as unknown as WorkOrderDetail);
    if (activityRes.data) setActivities(activityRes.data as unknown as ActivityRow[]);
    if (historyRes.data) setHistory(historyRes.data as unknown as HistoryRow[]);
    if (spareRes.data) setSpares(spareRes.data as unknown as SpareRecordRow[]);
    const actorIds = new Set<string>();
    if (woRes.data?.created_by) actorIds.add(woRes.data.created_by);
    if (woRes.data?.assigned_by) actorIds.add(woRes.data.assigned_by);
    if (woRes.data?.closed_by) actorIds.add(woRes.data.closed_by);
    if (historyRes.data?.[0]?.changed_by) {
      actorIds.add(historyRes.data[0].changed_by);
    }
    const nameMap: Record<string, string | null> = {};
    if (actorIds.size > 0) {
      const actorRes = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", [...actorIds]);
      actorRes.data?.forEach((p) => {
        nameMap[p.id] = p.name;
      });
    }
    setActorNames(nameMap);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    load();
  }, [activeTab]);

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!workOrder) {
    return (
      <ERPLayout>
        <EmptyState
          title="Work order not found"
          description="The work order you are looking for does not exist."
          action={
            <Link href="/work-orders">
              <Button variant="outline">Back to Work Orders</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const typeMeta = WORK_ORDER_TYPES.find((t) => t.value === workOrder.type);
  const statusMeta = WORK_ORDER_STATUSES.find((s) => s.value === workOrder.status);
  const priorityMeta = PRIORITY_LEVELS.find((p) => p.value === workOrder.priority);

  return (
    <ERPLayout>
      <PageHeader
        title={`${workOrder.work_order_no} · ${workOrder.title}`}
        backHref="/work-orders"
        description={`${typeMeta?.label ?? workOrder.type} · ${priorityMeta?.label ?? workOrder.priority}`}
        action={
          <div className="flex items-center gap-2">
            <Link href={`/work-orders/${workOrder.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Link href={`/work-orders/${workOrder.id}/status`}>
              <Button>Update Status</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadgeMeta statusMeta={statusMeta} />
        <Badge className={typeMeta?.color}>{typeMeta?.label}</Badge>
        <Badge className={priorityMeta?.color}>{priorityMeta?.label}</Badge>
        {workOrder.plants?.name && (
          <span className="text-sm text-gray-500">{workOrder.plants.name}</span>
        )}
        {workOrder.equipment?.equipment_code && (
          <span className="text-sm text-gray-500">
            {workOrder.equipment.equipment_code} - {workOrder.equipment.equipment_name}
          </span>
        )}
      </div>

      {(workOrder.created_by || workOrder.assigned_to || workOrder.closed_by) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          {workOrder.created_by && (
            <span>
              Created by{" "}
              <span className="font-medium text-gray-700">
                {actorNames[workOrder.created_by] ?? workOrder.created_by}
              </span>
            </span>
          )}
          {workOrder.assigned_to && (
            <span>
              Assigned to{" "}
              <span className="font-medium text-gray-700">
                {workOrder.assigned_to}
              </span>
              {workOrder.assigned_by ? (
                <>
                  {" "}
                  by{" "}
                  <span className="font-medium text-gray-700">
                    {actorNames[workOrder.assigned_by] ?? workOrder.assigned_by}
                  </span>
                </>
              ) : null}
            </span>
          )}
          {workOrder.closed_by && (
            <span>
              Closed by{" "}
              <span className="font-medium text-gray-700">
                {actorNames[workOrder.closed_by] ?? workOrder.closed_by}
              </span>
            </span>
          )}
          {history[0]?.changed_by && (
            <span>
              Last change by{" "}
              <span className="font-medium text-gray-700">
                {actorNames[history[0].changed_by] ?? history[0].changed_by}
              </span>
            </span>
          )}
        </div>
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "overview" && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MetadataRow label="Plant" value={workOrder.plants?.name} />
              <MetadataRow label="Equipment" value={workOrder.equipment?.equipment_code} />
              <MetadataRow label="Type" value={typeMeta?.label} />
              <MetadataRow label="Priority" value={priorityMeta?.label} />
              <MetadataRow label="Status" value={statusMeta?.label} />
              <MetadataRow label="Planned Start" value={fmt(workOrder.planned_start)} />
              <MetadataRow label="Planned End" value={fmt(workOrder.planned_end)} />
              <MetadataRow label="Actual Start" value={fmt(workOrder.actual_start)} />
              <MetadataRow label="Actual End" value={fmt(workOrder.actual_end)} />
              <MetadataRow label="Verified At" value={fmt(workOrder.verified_at)} />
              <MetadataRow label="Closed At" value={fmt(workOrder.closed_at)} />
            </div>

            {workOrder.description && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-sm leading-relaxed text-gray-600">{workOrder.description}</p>
              </div>
            )}
            {workOrder.closure_remarks && (
              <div className="mt-2">
                <p className="text-sm leading-relaxed text-gray-500">
                  <span className="font-medium text-gray-700">Closure:</span> {workOrder.closure_remarks}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "activities" && (
        <Card>
          <CardContent className="p-0">
            {activities.length === 0 ? (
              <EmptyState
                title="No activities yet"
                description="Activities recorded against this work order will appear here."
              />
            ) : (
              <div className="divide-y divide-gray-200">
                {activities.map((a) => (
                  <div key={a.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-medium text-gray-900">
                        {a.activity_type?.replace(/_/g, " ") ?? "Activity"}
                      </p>
                      <p className="text-xs text-gray-500">{formatDateTime(a.started_at)}</p>
                    </div>
                    {a.description && (
                      <p className="mt-1 text-sm text-gray-600">{a.description}</p>
                    )}
                    {a.note && <p className="mt-1 text-xs text-gray-400">{a.note}</p>}
                    {a.ended_at && (
                      <p className="mt-1 text-xs text-gray-400">
                        Ended {formatDateTime(a.ended_at)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "spares" && (
        <Card>
          <CardContent className="p-0">
            {spares.length === 0 ? (
              <EmptyState
                title="No spares issued"
                description="Spare parts issued for this work order will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Part</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Movement</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Reference</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {spares.map((s) => (
                      <tr key={s.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {s.spare_parts?.[0]?.part_code ?? "-"}
                          <span className="ml-2 text-gray-500">{s.spare_parts?.[0]?.part_name ?? ""}</span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm capitalize text-gray-600">
                          {s.movement_type.replace(/_/g, " ")}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                          {s.quantity} {s.spare_parts?.[0]?.unit ?? ""}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {s.reference_no ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {formatDateTime(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardContent className="p-0">
            {history.length === 0 ? (
              <EmptyState title="No status changes yet" />
            ) : (
              <div className="divide-y divide-gray-200">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={h.old_status ?? "draft"} />
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <StatusBadge status={h.new_status} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatDateTime(h.changed_at)}</p>
                      {h.remarks && <p className="text-xs text-gray-400">{h.remarks}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "files" && (
        <AttachmentPanel
          entityType="work_order"
          entityId={workOrder.id}
          entityTitle={workOrder.title}
        />
      )}
    </ERPLayout>
  );
}

function MetadataRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="border-b border-gray-100 pb-3">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-1 text-sm text-gray-900">{value || "-"}</p>
    </div>
  );
}

function fmt(value: string | null): string | null {
  return value ? formatDateTime(value) : null;
}