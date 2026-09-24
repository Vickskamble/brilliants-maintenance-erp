-- Additive Phase 7: procurement (MR -> PO -> GRN) + vendor evaluation.
-- New tables only; GRN posts into existing stock_movements ledger and reuses
-- spare_parts.current_stock (existing inventory engine untouched).

CREATE TABLE IF NOT EXISTS public.material_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plant_id uuid,
  request_no text NOT NULL UNIQUE,
  title text NOT NULL,
  requested_by uuid,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.material_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_request_id uuid NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
  spare_part_id uuid NOT NULL,
  quantity_requested integer NOT NULL,
  quantity_approved integer,
  remarks text
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plant_id uuid,
  po_no text NOT NULL UNIQUE,
  vendor_id uuid REFERENCES public.vendors(id),
  material_request_id uuid REFERENCES public.material_requests(id),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  expected_delivery timestamptz,
  currency text NOT NULL DEFAULT 'INR',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  spare_part_id uuid NOT NULL,
  quantity_ordered integer NOT NULL,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  quantity_received integer NOT NULL DEFAULT 0,
  remarks text
);

CREATE TABLE IF NOT EXISTS public.grn_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  plant_id uuid,
  grn_no text NOT NULL UNIQUE,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  status text NOT NULL DEFAULT 'posted',
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  rated_by uuid,
  rating smallint NOT NULL,
  delivery_score smallint,
  quality_score smallint,
  price_score smallint,
  responsiveness_score smallint,
  comments text,
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_request_items_request ON public.material_request_items (material_request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON public.purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_mr ON public.purchase_orders (material_request_id);
CREATE INDEX IF NOT EXISTS idx_grn_receipts_po ON public.grn_receipts (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_ratings_vendor ON public.vendor_ratings (vendor_id);

ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grn_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_allow_access_material_requests" ON public.material_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_material_request_items" ON public.material_request_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_purchase_order_items" ON public.purchase_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_grn_receipts" ON public.grn_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "erp_allow_access_vendor_ratings" ON public.vendor_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);