-- ============================================================
-- Spare Parts / Inventory module
-- Tables: spare_parts, spare_part_plants, stock_movements
-- ============================================================

-- ---------- spare_parts ----------
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  part_code text not null unique,
  part_name text not null,
  category text not null default 'electrical',
  unit text not null default 'pcs',
  -- current on-hand quantity (denormalized, keep in sync via stock_movements trigger)
  current_stock integer not null default 0,
  min_stock integer not null default 0,
  reorder_level integer not null default 0,
  location text,
  description text,
  plant_id uuid references public.plants(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- spare_part_plants : per-plant stock breakdown ----------
create table if not exists public.spare_part_plants (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.spare_parts(id) on delete cascade,
  plant_id uuid not null references public.plants(id) on delete cascade,
  quantity integer not null default 0,
  location text,
  created_at timestamptz not null default now(),
  unique (part_id, plant_id)
);

-- ---------- stock_movements ----------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.spare_parts(id) on delete cascade,
  movement_type text not null check (
    movement_type in (
      'purchase_in', 'return_in', 'workorder_issue', 'breakdown_use',
      'adjustment', 'scrap_out', 'transfer'
    )
  ),
  quantity integer not null check (quantity <> 0),
  from_plant_id uuid references public.plants(id),
  to_plant_id uuid references public.plants(id),
  work_order_id uuid references public.work_orders(id),
  reference_no text,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_part on public.stock_movements(part_id);
create index if not exists idx_stock_movements_created on public.stock_movements(created_at desc(elapsed));

-- ---------- trigger: keep spare_parts.current_stock in sync ----------
create or replace function public.sync_spare_part_stock()
returns trigger
language plpgsql
security definer
as $$
declare
  v_qty integer;
begin
  if tg_op = 'INSERT' then
    v_qty := new.quantity;
    update public.spare_parts
      set current_stock = current_stock + v_qty,
          updated_at = now()
      where id = new.part_id;
  elsif tg_op = 'DELETE' then
    v_qty := -old.quantity;
    update public.spare_parts
      set current_stock = current_stock + v_qty,
          updated_at = now()
      where id = old.part_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_spare_part_stock on public.stock_movements;
create trigger trg_sync_spare_part_stock
  after insert or delete on public.stock_movements
  for each row execute function public.sync_spare_part_stock();

-- keep spare_part_plants.quantity in sync for transfer/issue movements
create or replace function public.sync_spare_part_plant()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.spare_part_plants (part_id, plant_id, quantity, location)
    values (new.part_id, coalesce(new.to_plant_id, new.from_plant_id), new.quantity, null)
    on conflict (part_id, plant_id)
    do update set quantity = public.spare_part_plants.quantity + excluded.quantity;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_sync_spare_part_plant on public.stock_movements;
create trigger trg_sync_spare_part_plant
  after insert on public.stock_movements
  for each row
  when (new.movement_type in ('purchase_in', 'transfer', 'return_in'))
  execute function public.sync_spare_part_plant();

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_spare_parts_updated at public.spare_parts;
create trigger trg_spare_parts_updated
  before update on public.spare_parts
  for each row execute function public.set_updated_at();
