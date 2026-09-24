import { MasterDataPage } from "@/components/master-data/master-data-page";

export default function MasterDataDepartmentsPage() {
  return (
    <MasterDataPage
      module="settings"
      table="departments"
      title="Departments"
      description="Manage maintenance and production departments."
      backHref="/settings/master-data"
      addTitle="Department"
      searchPlaceholder="Search by code or name..."
      emptyTitle="No departments"
      emptyDescription="Add your first department to start organizing sections and equipment."
      tableKey="master-departments"
      fields={[
        { key: "code", label: "Code", required: true, placeholder: "e.g. MECH" },
        { key: "name", label: "Name", required: true, placeholder: "e.g. Mechanical" },
        {
          key: "department_type",
          label: "Type",
          type: "select",
          options: [
            { value: "mechanical", label: "Mechanical" },
            { value: "electrical", label: "Electrical" },
            { value: "instrumentation", label: "Instrumentation" },
            { value: "production", label: "Production" },
            { value: "utilities", label: "Utilities" },
            { value: "civil", label: "Civil" },
          ],
        },
      ]}
      columns={[
        { key: "code", label: "Code" },
        { key: "name", label: "Name" },
        { key: "department_type", label: "Type" },
      ]}
    />
  );
}