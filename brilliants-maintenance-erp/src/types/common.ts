export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  [key: string]: string | undefined;
}

export type SortDirection = "asc" | "desc";

export interface SortParams {
  column: string;
  direction: SortDirection;
}

export interface NumberSequence {
  prefix: string;
  year: number;
  sequence: number;
}

export const NUMBER_PREFIXES = {
  EQUIPMENT: "EQ",
  PM_PLAN: "PM",
  WORK_ORDER: "WO",
  BREAKDOWN: "BRK",
  CALIBRATION: "CAL",
  INSPECTION: "INS",
  STOCK: "STO",
  SHUTDOWN: "SD",
  WORK_REQUEST: "WR",
} as const;
