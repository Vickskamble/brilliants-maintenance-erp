export interface GetWorkOrdersParams {
  plantId?: string;
  equipmentId?: string;
  type?: string;
  priority?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}
