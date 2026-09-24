import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataAssetCategoriesPage() {
  return (
    <MasterDataPage
      module="settings"
      table="asset_categories"
      title="Asset Categories"
      description="Manage equipment asset categories."
      backHref="/settings/master-data"
      addTitle="Category"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No asset categories"
      emptyDescription="Add your first category to classify equipment."
      tableKey="master-asset-categories"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. PUMP" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Pumps" },
        { key: "description", label: "Description", type: "textarea" },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
      ]}
    />
  );
}