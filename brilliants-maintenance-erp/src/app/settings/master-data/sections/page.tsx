import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataSectionsPage() {
  return (
    <MasterDataPage
      module="settings"
      table="sections"
      title="Sections"
      description="Manage sections belonging to departments."
      addTitle="Section"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No sections"
      emptyDescription="Add your first section to organize areas and equipment."
      tableKey="master-sections"
      parentField={{ field: "department_id", label: "Department" }}
      parentDisplayKey="departments"
      parentNameKey="name"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. S1" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Boiler House" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}