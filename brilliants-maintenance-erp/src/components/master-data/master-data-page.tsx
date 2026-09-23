"use client";

import { useEffect, useState } from "react";
import { ERPLayout } from "@/components/layout/erp-layout";
import { PageHeader } from "@/components/common/page-header";
import { PermissionGate } from "@/components/auth/permission-gate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ERPDataTable } from "@/components/erp/table/erp-data-table";
import { ERPModal } from "@/components/erp/erp-modal";
import { useQueryScope } from "@/lib/auth/query-scope";
import {
  createMasterData,
  listMasterData,
  loadParentOptions,
  setMasterDataStatus,
  updateMasterData,
  type MasterRow,
  type MasterTable,
} from "@/services/master-data";
import { Pencil, Plus, Power } from "lucide-react";
import type { ERPColumn } from "@/components/erp/table/erp-table-types";

export interface MasterDataField {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface MasterDataColumnConfig {
  key: string;
  label: string;
  render?: (row: MasterRow) => React.ReactNode;
  hidden?: boolean;
}

export interface MasterDataPageProps {
  title: string;
  description: string;
  module: string;
  table: MasterTable;
  addTitle: string;
  searchPlaceholder?: string;
  emptyTitle: string;
  emptyDescription: string;
  fields: MasterDataField[];
  columns: MasterDataColumnConfig[];
  parentField?: { field: string; label: string; required?: boolean };
  parentDisplayKey?: string;
  parentNameKey?: string;
  statusColumn?: boolean;
  tableKey: string;
}

const STATUS_COLORS: Record<string, "success" | "default" | "warning" | "danger" | "info"> = {
  active: "success",
  inactive: "default",
};

export function MasterDataPage(props: MasterDataPageProps) {
  const {
    title,
    description,
    module,
    table,
    addTitle,
    searchPlaceholder,
    emptyTitle,
    emptyDescription,
    fields,
    columns,
    parentField,
    parentDisplayKey,
    parentNameKey,
    statusColumn = true,
    tableKey,
  } = props;

  const scope = useQueryScope();

  const [items, setItems] = useState<MasterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [parents, setParents] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    void load();
    if (parentField) {
      void loadParentOptions(table).then(setParents);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.organizationId, scope.plantId]);

  async function load() {
    setIsLoading(true);
    const { data, error } = await listMasterData(table, scope);
    setItems(data);
    setLoadError(error);
    setIsLoading(false);
  }

  function resetForm(row: MasterRow | null) {
    const initial: Record<string, string> = {};
    for (const field of fields) initial[field.key] = "";
    if (parentField) initial[parentField.field] = "";
    if (row) {
      for (const field of fields) {
        initial[field.key] = row[field.key] == null ? "" : String(row[field.key]);
      }
      if (parentField) {
        initial[parentField.field] =
          row[parentField.field] == null ? "" : String(row[parentField.field]);
      }
    }
    return initial;
  }

  function openCreate() {
    setEditingId(null);
    setForm(resetForm(null));
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(row: MasterRow) {
    setEditingId(String(row.id));
    setForm(resetForm(row));
    setFormError(null);
    setModalOpen(true);
  }

  async function doSubmit() {
    const missing = fields
      .filter((field) => field.required && !form[field.key]?.trim())
      .map((field) => field.label);
    if (parentField?.required && !form[parentField.field]) missing.push(parentField.label);
    if (missing.length > 0) {
      setFormError(`${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} required`);
      return;
    }

    setIsSaving(true);
    setFormError(null);

    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      const value = form[field.key];
      if (field.type === "select" && value === "") {
        payload[field.key] = null;
      } else if (value !== "") {
        payload[field.key] = value;
      }
    }
    if (parentField) {
      const parentValue = form[parentField.field];
      payload[parentField.field] = parentValue && parentValue !== "none" ? parentValue : null;
    }

    const { error } = editingId
      ? await updateMasterData(table, editingId, payload)
      : await createMasterData(table, payload, scope);

    setIsSaving(false);
    if (error) {
      setFormError(error);
      return;
    }

    setModalOpen(false);
    void load();
  }

  async function toggleStatus(row: MasterRow) {
    const next = String(row.status) === "active" ? "inactive" : "active";
    const { error } = await setMasterDataStatus(table, String(row.id), next);
    if (!error) void load();
  }

  function renderCellValue(row: MasterRow, columnKey: string, configured: boolean): React.ReactNode {
    if (configured) {
      const column = columns.find((c) => c.key === columnKey);
      if (column?.render) return column.render(row);
    }
    const value = row[columnKey];
    if (value != null && typeof value === "object") {
      const name = (value as { name?: unknown }).name;
      return <span className="text-sm text-gray-900">{String(name ?? "—")}</span>;
    }
    return <span className="text-sm text-gray-900">{String(value ?? "—")}</span>;
  }

  const tableColumns: ERPColumn<MasterRow>[] = [];

  if (parentDisplayKey && parentNameKey) {
    tableColumns.push({
      id: parentDisplayKey,
      header: "",
      accessorKey: parentDisplayKey,
      hideable: false,
      exportable: false,
      searchable: false,
      cell: (row) => renderCellValue(row, parentDisplayKey, false),
    });
  }

  for (const column of columns) {
    if (column.hidden) continue;
    tableColumns.push({
      id: column.key,
      header: column.label,
      accessorKey: column.key,
      cell: (row) => renderCellValue(row, column.key, true),
      exportValue: (row) => {
        const value = row[column.key];
        if (value != null && typeof value === "object") {
          return String((value as { name?: unknown }).name ?? "");
        }
        return String(value ?? "");
      },
    });
  }

  if (statusColumn) {
    tableColumns.push({
      id: "status",
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <Badge variant={STATUS_COLORS[String(row.status)] ?? "default"}>
          {String(row.status ?? "—")}
        </Badge>
      ),
      exportValue: (row) => String(row.status ?? ""),
    });
  }

  const rowActions = [
    { label: "Edit", icon: Pencil, onClick: (row: MasterRow) => openEdit(row) },
  ];
  if (statusColumn) {
    rowActions.push({ label: "Deactivate / Activate", icon: Power, onClick: (row: MasterRow) => void toggleStatus(row) });
  }

  return (
    <ERPLayout>
      <PermissionGate module={module} action="view">
        <div className="space-y-6">
          <PageHeader
            title={title}
            description={description}
            action={
              <PermissionGate module={module} action="create" fallback={null}>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add {addTitle}
                </Button>
              </PermissionGate>
            }
          />

          {loadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {loadError}
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <ERPDataTable
                columns={tableColumns}
                data={items}
                idKey={(row) => String(row.id)}
                loading={isLoading}
                searchPlaceholder={searchPlaceholder ?? `Search ${title.toLowerCase()}...`}
                defaultPageSize={12}
                tableKey={tableKey}
                exportFileName={tableKey}
                emptyTitle={emptyTitle}
                emptyDescription={emptyDescription}
                rowActions={rowActions}
              />
            </CardContent>
          </Card>
        </div>
      </PermissionGate>

      <ERPModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit ${addTitle}` : addTitle}
        description={`${editingId ? "Update" : "Create"} a ${addTitle.toLowerCase()} record.`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void doSubmit()} disabled={isSaving}>
              {isSaving ? "Saving..." : editingId ? "Save Changes" : "Create"}
            </Button>
          </>
        }
      >
        <form id="master-data-form" onSubmit={(e) => { e.preventDefault(); void doSubmit(); }} className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {parentField && (
            <div>
              <Label htmlFor={parentField.field}>{parentField.label}</Label>
              <Select
                id={parentField.field}
                value={form[parentField.field] ?? ""}
                onChange={(e) => setForm({ ...form, [parentField.field]: e.target.value })}
              >
                <option value="">Select {parentField.label.toLowerCase()}...</option>
                <option value="none">No {parentField.label.toLowerCase()}</option>
                {parents.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {fields.map((field) => (
            <div key={field.key}>
              <Label htmlFor={field.key}>
                {field.label}
                {field.required && " *"}
              </Label>
              {field.type === "select" ? (
                <Select
                  id={field.key}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                >
                  <option value="">Select...</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <textarea
                  id={field.key}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              ) : (
                <Input
                  id={field.key}
                  value={form[field.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
        </form>
      </ERPModal>
    </ERPLayout>
  );
}