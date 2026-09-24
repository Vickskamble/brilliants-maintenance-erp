"use client";

import { MasterDataPage } from "@/components/master-data/master-data-page";
import { Badge } from "@/components/ui/badge";
import type { MasterRow } from "@/services/master-data";

const LEVEL_COLORS: Record<string, "danger" | "warning" | "default" | "success" | "info"> = {
  critical: "danger",
  major: "warning",
  normal: "default",
};

function LevelCell({ row }: { row: MasterRow }) {
  const level = String(row.level ?? "—");
  return <Badge variant={LEVEL_COLORS[level] ?? "default"}>{level}</Badge>;
}

export default function MasterDataCriticalityPage() {
  return (
    <MasterDataPage
      module="settings"
      table="criticality_profiles"
      title="Criticality"
      description="Manage equipment criticality profiles."
      backHref="/settings/master-data"
      addTitle="Criticality Profile"
      searchPlaceholder="Search by name..."
      emptyTitle="No criticality profiles"
      emptyDescription="Add profiles to classify equipment importance."
      tableKey="master-criticality"
      statusColumn={false}
      fields={[
        { key: "code", label: "Code", placeholder: "e.g. HIGH-VALUE" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. High Availability Asset" },
        {
          key: "level",
          label: "Level",
          type: "select",
          options: [
            { value: "critical", label: "Critical" },
            { value: "major", label: "Major" },
            { value: "normal", label: "Normal" },
          ],
        },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "level", label: "Level", render: (row) => <LevelCell row={row} /> },
      ]}
    />
  );
}