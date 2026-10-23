-- MR lifecycle: receive columns, MR link on stock movements, direct-receive
-- movement type, GRN->MR status propagation.
--
-- 1) material_requests gains receive metadata.
-- 2) material_request_items gains quantity_received (per-line fulfilment).
-- 3) stock_movements gains a material_request_id link + a new 'mr_issue'
--    movement type so a direct receive (no PO) can move stock OUT to the
--    requesting department. 'purchase_in' already exists for direct IN.
-- 4) Backfill quantity_approved = quantity_requested where NULL so the
--    PDF "Qty Appr." column is meaningful.

-- ---------- 1) material_requests receive metadata ----------
alter table public.material_requests
  add column if not exists received_at timestamptz,
  add column if not exists received_by uuid references auth.users(id),
  add column if not exists closed_at timestamptz;

-- ---------- 2) material_request_items per-line fulfilment ----------
alter table public.material_request_items
  add column if not exists quantity_received integer not null default 0;

-- ---------- 3) stock_movements: MR link + 'mr_issue' type ----------
alter table public.stock_movements
  add column if not exists material_request_id uuid references public.material_requests(id);

create index if not exists idx_stock_movements_mr
  on public.stock_movements(material_request_id)
  where material_request_id is not null;

-- widen the movement_type CHECK to include 'mr_issue' (direct MR issue OUT)
do $$
declare
  cons text;
begin
  select pg_get_constraintdef(oid) into cons
  from pg_constraint
  where conrelid = 'public.stock_movements'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%movement_type%';
  if cons is not null and cons not like '%mr_issue%' then
    execute 'alter table public.stock_movements drop constraint ' ||
            quote_ident(
              (select conname from pg_constraint
               where conrelid = 'public.stock_movements'::regclass
                 and contype = 'c'
                 and pg_get_constraintdef(oid) like '%movement_type%')
            );
    alter table public.stock_movements
      add constraint stock_movements_movement_type_check check (
        movement_type in (
          'purchase_in', 'return_in', 'workorder_issue', 'breakdown_use',
          'adjustment', 'scrap_out', 'transfer', 'mr_issue'
        )
      );
  end if;
end $$;

-- ---------- 4) backfill quantity_approved ----------
update public.material_request_items
set quantity_approved = quantity_requested
where quantity_approved is null
  and material_request_id in (
    select id from public.material_requests where status in ('approved','ordered','received')
  );
