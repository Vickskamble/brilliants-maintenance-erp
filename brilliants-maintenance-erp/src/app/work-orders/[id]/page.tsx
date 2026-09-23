"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { CardHeader, CardTitle, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { formatDateTime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getWorkOrder } from "@/services/work-orders";
import { WorkOrder, Plant, Equipment } from "@/types/database";
import { WORK_ORDER_TYPES, WORK_ORDER_STATUSES, PRIORITY_LEVELS } from "@/lib/constants";
import { ChevronRight, Plus } from "lucide-react";

interface WorkOrderDetail extends WorkOrder {
  plants?: { name: string } | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

export default function WorkOrderDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const supabase = createClient();

  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [spares, setSpares] = useState<Array<{ id: string; spare_part: { part_code: string; part_name: string } | null; quantity: number | null }>>([]);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "activities", label: "Activities" },
    { key: "spares", label: "Spares" },
    { key: "history", label: "History" },
  ];

  async function load() {
    setIsLoading(true);
    const { data, error } = await getWorkOrder(id);
    if (data) setWorkOrder(data as unknown as WorkOrderDetail);
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
        <StatusBadge statusMeta={statusMeta} />
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
            </div>

            {workOrder.description && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <p className="text-sm leading-relaxed text-gray-600">{workOrder.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "details" && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <MetadataRow label="Verified By" value={workOrder.verified_by} />
              <MetadataRow label="Verified At" value={fmt(workOrder.verified_at)} />
              <MetadataRow label="Closed By" value={workOrder.closed_by} />
              <MetadataRow label="Closed At" value={fmt(workOrder.closed_at)} />
              <MetadataRow label="Closure Remarks" value={workOrder.closure_remarks} />
              <MetadataRow label="Created At" value={fmt(workOrder.created_at)} />
              <MetadataRow label="Updated At" value={fmt(workOrder.updated_at)} />
            </div>
          </CardContent>
        </Card>
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
