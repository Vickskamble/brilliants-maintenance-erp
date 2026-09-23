"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { MetadataRow } from "@/components/common/metadata-row";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingPage } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import { createClient } from "@/lib/supabase/client";
import { BREAKDOWN_STATUSES } from "@/lib/constants";
import { ArrowLeft, CheckCircle2, Trash2 } from "lucide-react";

interface BreakdownDetail {
  id: string;
  breakdown_no: string | null;
  plant_id: string | null;
  equipment_id: string | null;
  problem_description: string | null;
  description: string | null;
  root_cause: string | null;
  action_taken: string | null;
  resolution_notes: string | null;
  severity: string | null;
  status: string;
  reported_at: string | null;
  downtime_minutes: number | null;
  resolved_at: string | null;
  plants?: { name: string } | null;
  equipment?: { equipment_code: string; equipment_name: string } | null;
}

export default function BreakdownDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const supabase = createClient();

  const [breakdown, setBreakdown] = useState<BreakdownDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void load();
  }, [id]);

  async function load() {
    const { data } = await supabase
      .from("breakdowns")
      .select(
        `*,
         plants(name),
         equipment(equipment_code, equipment_name)`
      )
      .eq("id", id)
      .single();
    if (data) setBreakdown(data as unknown as BreakdownDetail);
    setIsLoading(false);
  }

  async function updateStatus(status: string) {
    setIsSaving(true);
    const payload: Record<string, string | null> = { status };
    if (status === "restored" && breakdown && !breakdown.resolved_at) {
      payload.resolved_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("breakdowns")
      .update(payload)
      .eq("id", id);
    setIsSaving(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    void load();
  }

  async function handleDelete() {
    if (!confirm("Delete this breakdown record? This cannot be undone.")) return;
    setIsDeleting(true);
    const { error } = await supabase.from("breakdowns").delete().eq("id", id);
    setIsDeleting(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    router.push("/breakdowns");
    router.refresh();
  }

  if (isLoading) {
    return (
      <ERPLayout>
        <LoadingPage />
      </ERPLayout>
    );
  }

  if (!breakdown) {
    return (
      <ERPLayout>
        <EmptyState
          title="Breakdown not found"
          description="The breakdown record you are looking for does not exist."
          action={
            <Link href="/breakdowns">
              <Button variant="outline">Back to Breakdowns</Button>
            </Link>
          }
        />
      </ERPLayout>
    );
  }

  const statusMeta = BREAKDOWN_STATUSES.find(
    (s) => s.value === breakdown.status
  );

  return (
    <ERPLayout>
      <PageHeader
        title={breakdown.breakdown_no ?? "Breakdown"}
        description={`${breakdown.plants?.name ?? "No plant"} · ${
          breakdown.equipment?.equipment_code ?? "No equipment"
        }`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/breakdowns">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge statusMeta={statusMeta} />
        {breakdown.severity && (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize">
            {breakdown.severity.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <MetadataRow label="Problem" value={breakdown.problem_description} />
              <MetadataRow
                label="Plant"
                value={breakdown.plants?.name ?? "—"}
              />
              <MetadataRow
                label="Equipment"
                value={
                  breakdown.equipment
                    ? `${breakdown.equipment.equipment_code} - ${breakdown.equipment.equipment_name}`
                    : "—"
                }
              />
              <MetadataRow
                label="Reported At"
                value={
                  breakdown.reported_at
                    ? new Date(breakdown.reported_at).toLocaleString("en-IN")
                    : "—"
                }
              />
              <MetadataRow
                label="Downtime"
                value={
                  breakdown.downtime_minutes != null
                    ? `${breakdown.downtime_minutes} minutes`
                    : "—"
                }
              />
              {breakdown.resolved_at && (
                <MetadataRow
                  label="Resolved At"
                  value={new Date(breakdown.resolved_at).toLocaleString("en-IN")}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Diagnosis & Repair
            </h3>
            <div className="space-y-4">
              <MetadataRow label="Root Cause" value={breakdown.root_cause} />
              <MetadataRow label="Action Taken" value={breakdown.action_taken} />
              <MetadataRow
                label="Resolution Notes"
                value={breakdown.resolution_notes}
              />
              <MetadataRow label="Description" value={breakdown.description} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Status
            </h3>
            <div className="space-y-4">
              <Select
                id="status"
                value={breakdown.status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={isSaving}
                options={BREAKDOWN_STATUSES.map((s) => ({
                  value: s.value,
                  label: s.label,
                }))}
              />
              {breakdown.status !== "restored" &&
                breakdown.status !== "closed" &&
                breakdown.status !== "cancelled" && (
                  <Button
                    variant="primary"
                    className="w-full"
                    disabled={isSaving}
                    onClick={() => updateStatus("restored")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Resolved
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ERPLayout>
  );
}