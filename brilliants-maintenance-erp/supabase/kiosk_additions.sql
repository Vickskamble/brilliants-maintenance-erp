-- ---------------------------------------------------------------------------
-- Kiosk additions: QR codes, work order actor tracking + soft delete.
-- Applies idempotently.
-- ---------------------------------------------------------------------------

-- 1. Work orders: who created / assigned / deleted.
alter table public.work_orders
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- 2. Indexes for actor lookups + soft-delete filtering.
create index if not exists idx_work_orders_created_by on public.work_orders(created_by);
create index if not exists idx_work_orders_assigned_by on public.work_orders(assigned_by);
create index if not exists idx_work_orders_deleted on public.work_orders(plant_id, deleted_at);

-- 3. Backfill equipment QR payloads (canonical: BEM:<equipment_id>).
update public.equipment
set qr_code = 'BEM:' || id
where qr_code is null or qr_code = '';

-- 4. Ensure equipment qr_code stays populated on new rows.
create or replace function public.equipment_ensure_qrcode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.qr_code is null or new.qr_code = '' then
    new.qr_code := 'BEM:' || new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_equipment_ensure_qrcode on public.equipment;
create trigger trg_equipment_ensure_qrcode
  before insert on public.equipment
  for each row execute function public.equipment_ensure_qrcode();