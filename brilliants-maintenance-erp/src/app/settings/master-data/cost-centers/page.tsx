import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataCostCentersPage() {
  return (
    <MasterDataPage
      module="settings"
      table="cost_centers"
      title="Cost Centers"
      description="Manage cost centers for maintenance budgeting."
      backHref="/settings/master-data"
      addTitle="Cost Center"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No cost centers"
      emptyDescription="Add your first cost center to attribute costs."
      tableKey="master-cost-centers"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. CC-01" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Maintenance Opex" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}