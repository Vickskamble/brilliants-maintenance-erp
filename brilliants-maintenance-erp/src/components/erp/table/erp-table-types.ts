import type { LucideIcon } from "lucide-react";

export interface ERPColumn<T> {
  /** Unique id; also used as accessor when `accessorKey` is provided. */
  id: string;
  header: string;
  /** Data key on the row used for sorting / default cell rendering / CSV. */
  accessorKey?: string;
  /** Alternative accessor for computed or nested values. */
  accessorFn?: (row: T) => unknown;
  /** Custom cell renderer. `getValue` returns the accessed value. */
  cell?: (row: T, getValue: () => unknown) => React.ReactNode;
  sortable?: boolean;
  /** Include this column value in the global quick-search. Default true. */
  searchable?: boolean;
  /** Show an inline per-column filter input under the header. */
  filterable?: boolean;
  filterPlaceholder?: string;
  className?: string;
  headerClassName?: string;
  width?: number | string;
  /** Include in CSV export. Default true. */
  exportable?: boolean;
  exportHeader?: string;
  exportValue?: (row: T) => string | number | boolean | null | undefined;
  /** Allow hiding via column manager. Default true. */
  hideable?: boolean;
}

export interface ERPRowAction<T> {
  label: string;
  icon?: LucideIcon;
  onClick: (row: T) => void;
  disabled?: (row: T) => boolean;
}

export interface ERPBulkAction<T> {
  label: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  onClick: (rows: T[]) => void;
}

export interface ERPSavedViewState {
  globalFilter: string;
  columnFilters: { id: string; value: unknown }[];
  sorting: { id: string; desc: boolean }[];
  columnVisibility: Record<string, boolean>;
  pageSize: number;
}

export interface ERPSavedView {
  id: string;
  name: string;
  state: ERPSavedViewState;
  isDefault?: boolean;
}

export interface ERPDataTableProps<T> {
  columns: ERPColumn<T>[];
  data: T[];
  idKey: (row: T) => string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  rowActions?: ERPRowAction<T>[];
  bulkActions?: ERPBulkAction<T>[];
  searchPlaceholder?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** Key used to namespace saved views in localStorage. */
  tableKey?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  exportFileName?: string;
}