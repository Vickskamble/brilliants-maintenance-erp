-- Additive RLS hardening: tables with RLS enabled but no policy (hidden from app users).
-- Mirrors the existing erp_allow_access_* pattern (authenticated, full access, app-level scoping).
-- staff is a leftover demo table and intentionally not covered.
CREATE POLICY "erp_allow_access_departments"
  ON public.departments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_allow_access_work_requests"
  ON public.work_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_allow_access_work_order_statuses"
  ON public.work_order_statuses FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "erp_allow_access_spare_part_stock_movements"
  ON public.spare_part_stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);