import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataLocationsPage() {
  return (
    <MasterDataPage
      module="settings"
      table="locations"
      title="Locations"
      description="Manage physical locations within areas."
      addTitle="Location"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No locations"
      emptyDescription="Add your first location to tag equipment positions."
      tableKey="master-locations"
      statusColumn={false}
      parentField={{ field: "area_id", label: "Area" }}
      parentDisplayKey="areas"
      parentNameKey="name"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. L1" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Boiler Bay 1" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}