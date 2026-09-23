-- ============================================================
-- Early base tables.
--
-- WHY THIS FILE EXISTS:
--   20260921100000_spare_parts.sql references public.plants
--   (FKs on spare_parts.plant_id, spare_part_plants.plant_id,
--   stock_movements.from/to_plant_id), but plants was only
--   created later by 20260923100000_app_schema.sql, so a fresh
--   DB could never apply the spare-parts migration (relation
--   "public.plants" does not exist). This migration runs first
--   (timestamp < 20260921100000) and creates the two dependency
--   tables. definitions are intentionally identical to their
--   guarded copies in 20260923100000_app_schema.sql; that file
--   is the canonical source if these tables ever change.
-- ============================================================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  code text not null,
  industry text,
  timezone text not null default 'UTC',
  country text,
  state text,
  city text,
  address text,
  contact_email text,
  contact_phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  code text not null,
  name text not null,
  address text,
  timezone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);