export interface SparePartPlant {
  id: string;
  part_id: string;
  plant_id: string;
  quantity: number;
  location: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  part_id: string;
  plant_id: string;
  movement_type:
    | "purchase_in"
    | "return_in"
    | "workorder_issue"
    | "breakdown_use"
    | "adjustment"
    | "scrap_out"
    | "transfer";
  quantity: number;
  from_plant_id: string | null;
  to_plant_id: string | null;
  work_order_id: string | null;
  reference_no: string | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
}

export interface GetSparePartsParams {
  plantId?: string;
  category?: string;
  search?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface GetStockMovementsParams {
  partId?: string;
  plantId?: string;
  movementType?: string;
  page?: number;
  pageSize?: number;
}
