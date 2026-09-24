import { createClient } from "@/lib/supabase/client";
import type { QueryScope } from "@/lib/auth/query-scope";
import { createMasterData } from "@/services/master-data";

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  numeric?: boolean;
}

export interface ImportSchema {
  key: string;
  label: string;
  columns: ImportColumn[];
  template: string;
  hint: string;
}

export const IMPORT_SCHEMAS: ImportSchema[] = [
  {
    key: "departments",
    label: "Departments",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "department_type", label: "Type (mechanical/electrical/instrumentation/production/utilities/civil)" },
    ],
    template: "code,name,department_type\nMECH,Mechanical,mechanical\nPROD,Production,production",
    hint: "code and name are required. Type is optional.",
  },
  {
    key: "sections",
    label: "Sections",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
    ],
    template: "code,name\nS1,Boiler House\nS2,Turbine Hall",
    hint: "code and name are required.",
  },
  {
    key: "areas",
    label: "Areas",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
    ],
    template: "code,name\nA1,Boiler Feed Area\nA2,Dispatch Yard",
    hint: "code and name are required.",
  },
  {
    key: "locations",
    label: "Locations",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
    template: "code,name,description\nL1,Boiler Bay 1,Main boiler house bay",
    hint: "code and name are required. Description is optional.",
  },
  {
    key: "cost_centers",
    label: "Cost Centers",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
    template: "code,name,description\nCC-01,Maintenance Opex,Annual maintenance budget",
    hint: "code and name are required.",
  },
  {
    key: "asset_categories",
    label: "Asset Categories",
    columns: [
      { key: "code", label: "Code", required: true },
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
    template: "code,name,description\nPUMP,Pumps,Rotating pumping equipment",
    hint: "code and name are required.",
  },
  {
    key: "criticality_profiles",
    label: "Criticality Profiles",
    columns: [
      { key: "code", label: "Code" },
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
    template: "code,name,description\nHIGH-VALUE,High Availability Asset,Assets whose downtime halts production",
    hint: "name is required. Code and description are optional.",
  },
  {
    key: "spare_parts",
    label: "Spare Parts",
    columns: [
      { key: "part_code", label: "Part Code", required: true },
      { key: "part_name", label: "Part Name", required: true },
      { key: "category", label: "Category" },
      { key: "unit", label: "Unit" },
      { key: "current_stock", label: "Current Stock", numeric: true },
      { key: "min_stock", label: "Min Stock", numeric: true },
      { key: "reorder_level", label: "Reorder Level", numeric: true },
      { key: "location", label: "Location" },
      { key: "description", label: "Description" },
    ],
    template:
      "part_code,part_name,category,unit,current_stock,min_stock,reorder_level,location,description\nMECH-SEAL-001,Mechanical Seal 40mm,mechanical,pcs,4,1,2,A-ROW-3,Mechanical seal for pumps",
    hint: "part_code and part_name are required. Duplicate part codes are skipped.",
  },
];

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}

/** Minimal CSV parser honoring double-quoted fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/\r\n/g, "\n");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export interface ParsedImport {
  rows: Record<string, string>[];
  error: string | null;
}

export function mapCsvToRows(
  schema: ImportSchema,
  text: string
): ParsedImport {
  const parsed = parseCsv(text);
  if (parsed.length === 0) {
    return { rows: [], error: "File is empty. Download the template and try again." };
  }
  const header = parsed[0].map((h) => h.trim().toLowerCase());
  const allowed = new Set(schema.columns.map((c) => c.key.toLowerCase()));
  const colIndex = new Map<string, number>();
  for (let i = 0; i < header.length; i++) {
    if (allowed.has(header[i])) colIndex.set(header[i], i);
  }
  if (colIndex.size === 0) {
    return {
      rows: [],
      error: `Column headers not recognized. Expected: ${schema.columns
        .map((c) => c.label.split(" (")[0])
        .join(", ")}`,
    };
  }
  const rows: Record<string, string>[] = [];
  const missingRequired: string[] = [];
  for (let r = 1; r < parsed.length; r++) {
    const cell = (key: string) => (parsed[r][colIndex.get(key)!] ?? "").trim();
    const row: Record<string, string> = {};
    let ok = true;
    for (const c of schema.columns) {
      const val = cell(c.key);
      if (c.required && !val) {
        missingRequired.push(`Row ${r + 1}: ${c.label}`);
        ok = false;
        break;
      }
      row[c.key] = val;
    }
    if (ok) rows.push(row);
  }
  const skipError =
    missingRequired.length > 0
      ? `Skipped ${missingRequired.length} row(s) with missing required values: ${missingRequired
          .slice(0, 5)
          .join("; ")}${missingRequired.length > 5 ? " …" : ""}`
      : null;
  return { rows, error: skipError ? `${skipError}` : null };
}

export async function runImport(
  schemaKey: string,
  rows: Record<string, string>[],
  scope: QueryScope
): Promise<ImportResult> {
  const supabase = createClient();
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    if (schemaKey === "spare_parts") {
      const payload: Record<string, unknown> = {
        part_code: row.part_code,
        part_name: row.part_name,
        category: row.category || "electrical",
        unit: row.unit || "pcs",
        current_stock: parseInt(row.current_stock, 10) || 0,
        min_stock: parseInt(row.min_stock, 10) || 0,
        reorder_level: parseInt(row.reorder_level, 10) || 0,
        location: row.location || null,
        description: row.description || null,
      };
      if (scope.plantId) payload.plant_id = scope.plantId;
      const { error } = await supabase.from("spare_parts").insert(payload);
      if (error) {
        skipped++;
        errors.push(`${row.part_code}: ${error.message}`);
      } else {
        inserted++;
      }
      continue;
    }

    const table = schemaKey as Parameters<typeof createMasterData>[0];
    const payload: Record<string, unknown> = { name: row.name };
    if (row.code) payload.code = row.code;
    if (row.description) payload.description = row.description;
    if (row.department_type) payload.department_type = row.department_type;
    const { error } = await createMasterData(table, payload, scope);
    if (error) {
      skipped++;
      errors.push(`${row.code || row.name}: ${error}`);
    } else {
      inserted++;
    }
  }

  return { inserted, skipped, errors };
}