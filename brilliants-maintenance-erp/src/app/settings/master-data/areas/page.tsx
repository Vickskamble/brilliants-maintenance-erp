import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataAreasPage() {
  return (
    <MasterDataPage
      module="settings"
      table="areas"
      title="Areas"
      description="Manage areas within sections."
      backHref="/settings/master-data"
      addTitle="Area"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No areas"
      emptyDescription="Add your first area to organize locations and equipment."
      tableKey="master-areas"
      parentField={{ field: "section_id", label: "Section" }}
      parentDisplayKey="sections"
      parentNameKey="name"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. A1" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Boiler Feed Area" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}