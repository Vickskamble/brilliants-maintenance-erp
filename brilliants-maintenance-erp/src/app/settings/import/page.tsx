"use client";

import { useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { CsvImportCard, ImportSchemaPicker } from "@/components/platform/csv-import";
import { IMPORT_SCHEMAS } from "@/services/imports";

export default function ImportPage() {
  const [schemaKey, setSchemaKey] = useState(IMPORT_SCHEMAS[0].key);
  const schema = IMPORT_SCHEMAS.find((s) => s.key === schemaKey) ?? IMPORT_SCHEMAS[0];

  return (
    <ERPLayout>
      <div className="space-y-6">
        <PageHeader
          title="CSV Import"
          description="Bulk-import departments, areas, sections, locations, cost centers, asset categories, criticality profiles and spare parts from CSV."
          backHref="/settings"
        />

        <div className="flex flex-wrap items-center gap-3">
          <ImportSchemaPicker value={schemaKey} onChange={setSchemaKey} />
          <p className="text-sm text-gray-500">
            Download the template, fill rows, then upload the CSV file.
          </p>
        </div>

        <div className="max-w-3xl">
          <CsvImportCard key={schema.key} schema={schema} />
        </div>
      </div>
    </ERPLayout>
  );
}