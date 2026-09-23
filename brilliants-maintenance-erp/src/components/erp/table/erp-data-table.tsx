"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useLegacyTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table/legacy";
import type {
  ColumnFiltersState,
  ColumnVisibilityState,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingSpinner } from "@/components/common/loading";
import { EmptyState } from "@/components/common/empty-state";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ERPColumnManager } from "./erp-column-manager";
import { ERPSavedViewsMenu } from "./erp-saved-views-menu";
import { ERPBulkActionsBar } from "./erp-bulk-actions-bar";
import { exportRowsToCsv } from "./erp-table-export";
import type {
  ERPColumn,
  ERPDataTableProps,
  ERPSavedViewState,
} from "./erp-table-types";

function getRowValue<T>(col: ERPColumn<T>, row: T): unknown {
  if (col.accessorKey) {
    return (row as Record<string, unknown>)[col.accessorKey];
  }
  if (col.accessorFn) {
    return col.accessorFn(row);
  }
  return undefined;
}

function renderDefault(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "-";
  return String(value);
}

export function ERPDataTable<T extends RowData>({
  columns,
  data,
  idKey,
  loading,
  onRowClick,
  rowActions,
  bulkActions,
  searchPlaceholder = "Search...",
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  tableKey,
  emptyTitle = "No records found",
  emptyDescription,
  emptyAction,
  exportFileName = "export",
}: ERPDataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const legacyColumns = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorFn: (row: T) => getRowValue(col, row),
        header: col.header,
        enableSorting: col.sortable !== false,
        enableGlobalFilter: col.searchable !== false,
        size: typeof col.width === "number" ? col.width : undefined,
      })) as Parameters<typeof useLegacyTable<T>>[0]["columns"],
    [columns]
  );

  const table = useLegacyTable<T>({
    data,
    columns: legacyColumns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getRowId: (originalRow: T) => idKey(originalRow),
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    setRowSelection({});
  }, [data]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => columnVisibility[c.id] !== false),
    [columns, columnVisibility]
  );

  const filteredRows = table.getFilteredRowModel().rows;
  const pageRows = table.getRowModel().rows;
  const selectedOrigins = useMemo(
    () =>
      table
        .getSelectedRowModel()
        .rows.map((r) => r.original),
    [table]
  );

  const savedViewState: ERPSavedViewState = {
    globalFilter,
    columnFilters,
    sorting,
    columnVisibility,
    pageSize: pagination.pageSize,
  };

  function applySavedView(state: ERPSavedViewState) {
    setGlobalFilter(state.globalFilter);
    setColumnFilters(state.columnFilters);
    setSorting(state.sorting);
    setColumnVisibility(state.columnVisibility);
    setPagination((p) => ({ ...p, pageIndex: 0, pageSize: state.pageSize }));
    setRowSelection({});
  }

  function toggleSort(id: string) {
    setSorting((prev) => {
      const current = prev.find((s) => s.id === id);
      if (!current) return [{ id, desc: false }];
      if (!current.desc) return [{ id, desc: true }];
      return [];
    });
  }

  function handleExport(rows?: typeof filteredRows) {
    const targets = rows ?? filteredRows;
    const headerRow: string[] = [];
    const body: (string | number | boolean | null | undefined)[][] = [];
    visibleColumns
      .filter((c) => c.exportable !== false)
      .forEach((col) => {
        headerRow.push(col.exportHeader ?? col.header);
      });
    targets.forEach((r) => {
      const rowCells: (string | number | boolean | null | undefined)[] = [];
      visibleColumns
        .filter((c) => c.exportable !== false)
        .forEach((col) => {
          rowCells.push(
            col.exportValue
              ? col.exportValue(r.original)
              : (getRowValue(col, r.original) as
                  | string
                  | number
                  | boolean
                  | null
                  | undefined)
          );
        });
      body.push(rowCells);
    });
    exportRowsToCsv(exportFileName, headerRow, body);
  }

  const { pageIndex, pageSize } = pagination;
  const pageCount = table.getPageCount();
  const startItem =
    filteredRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, filteredRows.length);
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => r.getIsSelected());
  const somePageSelected =
    pageRows.some((r) => r.getIsSelected()) && !allPageSelected;

  if (loading && data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleExport()}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          {tableKey && (
            <ERPSavedViewsMenu
              tableKey={tableKey}
              currentState={savedViewState}
              onApply={applySavedView}
            />
          )}
          <ERPColumnManager
            columns={columns.map((c) => ({
              id: c.id,
              header: c.header,
              hideable: c.hideable !== false,
            }))}
            visibility={columnVisibility}
            onToggle={(id, visible) =>
              setColumnVisibility((prev) => ({
                ...prev,
                [id]: visible,
              }))
            }
          />
        </div>
      </div>

      {selectedOrigins.length > 0 && bulkActions && bulkActions.length > 0 && (
        <ERPBulkActionsBar
          count={selectedOrigins.length}
          rows={selectedOrigins}
          actions={bulkActions}
          onClear={() => setRowSelection({})}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox
                  aria-label="Select all rows on this page"
                  checked={allPageSelected}
                  onCheckedChange={() => {
                    const current = Object.keys(rowSelection);
                    if (allPageSelected) {
                      pageRows.forEach((r) => {
                        if (current.includes(r.id)) r.toggleSelected(false);
                      });
                    } else {
                      pageRows.forEach((r) => r.toggleSelected(true));
                    }
                  }}
                />
              </th>
              {visibleColumns.map((col) => {
                const sortState = sorting.find((s) => s.id === col.id);
                return (
                  <th
                    key={col.id}
                    className={cn(
                      "px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500",
                      col.headerClassName,
                      col.sortable !== false && "cursor-pointer select-none"
                    )}
                    style={
                      col.width
                        ? { width: col.width, minWidth: col.width }
                        : undefined
                    }
                    onClick={() => col.sortable !== false && toggleSort(col.id)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortable !== false && (
                        <span className="text-gray-400">
                          {sortState ? (
                            sortState.desc ? (
                              <ArrowDown className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUp className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )}
                    </div>
                    {col.filterable && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Input
                          placeholder={col.filterPlaceholder ?? `Filter ${col.header}`}
                          value={
                            (columnFilters.find((f) => f.id === col.id)
                              ?.value as string) ?? ""
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setColumnFilters((prev) => {
                              const rest = prev.filter(
                                (f) => f.id !== col.id
                              );
                              return v ? [...rest, { id: col.id, value: v }] : rest;
                            });
                          }}
                          className="mt-1.5 h-8 text-xs"
                        />
                      </div>
                    )}
                  </th>
                );
              })}
              {rowActions && rowActions.length > 0 && (
                <th className="w-12 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pageRows.map((row) => (
              <tr
                key={row.id}
                onClick={(e) => {
                  if (
                    onRowClick &&
                    !(e.target as HTMLElement).closest(
                      "button, input, a, label"
                    )
                  ) {
                    onRowClick(row.original);
                  }
                }}
                className={cn(
                  "transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : "hover:bg-gray-50"
                )}
              >
                <td className="px-4 py-4">
                  <Checkbox
                    aria-label="Select row"
                    checked={row.getIsSelected()}
                    onCheckedChange={() => row.toggleSelected()}
                  />
                </td>
                {visibleColumns.map((col) => (
                  <td
                    key={col.id}
                    className={cn("whitespace-nowrap px-6 py-4 text-sm", col.className)}
                    style={
                      col.width
                        ? { width: col.width, minWidth: col.width }
                        : undefined
                    }
                  >
                    {col.cell
                      ? col.cell(
                          row.original,
                          () => getRowValue(col, row.original)
                        )
                      : renderDefault(getRowValue(col, row.original))}
                  </td>
                ))}
                {rowActions && rowActions.length > 0 && (
                  <td className="px-4 py-4 text-right">
                    <div className="relative inline-block">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="absolute right-0 top-full z-50 mt-1 min-w-[10rem]">
                          {rowActions.map((action) => {
                            const Icon = action.icon;
                            const disabled = action.disabled?.(row.original);
                            return (
                              <DropdownMenuItem
                                key={action.label}
                                onSelect={() => {
                                  if (!disabled) action.onClick(row.original);
                                }}
                                className={disabled ? "opacity-50" : undefined}
                              >
                                {Icon && <Icon className="h-4 w-4" />}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-gray-200 px-6 py-3 sm:flex-row">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium text-gray-900">{startItem}</span>-
          <span className="font-medium text-gray-900">{endItem}</span> of{" "}
          <span className="font-medium text-gray-900">{filteredRows.length}</span>
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) =>
                setPagination({
                  pageIndex: 0,
                  pageSize: Number(e.target.value),
                })
              }
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => table.setPageIndex(Math.min(pageCount - 1, pageIndex + 1))}
              disabled={!table.getCanNextPage()}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-gray-50 hover:text-gray-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-2 text-sm text-gray-500">
              Page {pageIndex + 1} of {Math.max(1, pageCount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}