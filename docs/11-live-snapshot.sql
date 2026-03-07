-- Live Snapshot tables for fast read paths
-- Run in Supabase SQL editor (project: mhvzpetucfdjkvutmpen)

create table if not exists public.mrapple_live_phones (
  item_id text primary key,
  tecnico_nombre text not null,
  payload jsonb not null,
  source_ts timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_mrapple_live_phones_tecnico
  on public.mrapple_live_phones (tecnico_nombre);

create index if not exists idx_mrapple_live_phones_updated
  on public.mrapple_live_phones (updated_at desc);

create table if not exists public.mrapple_live_repairs (
  item_id text primary key,
  tecnico_nombre text not null,
  estado text,
  payload jsonb not null,
  source_ts timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_mrapple_live_repairs_tecnico
  on public.mrapple_live_repairs (tecnico_nombre);

create index if not exists idx_mrapple_live_repairs_updated
  on public.mrapple_live_repairs (updated_at desc);

create index if not exists idx_mrapple_live_repairs_estado
  on public.mrapple_live_repairs (estado);

create table if not exists public.mrapple_live_team_summary (
  tecnico_nombre text primary key,
  phones_count integer not null default 0,
  repairs_count integer not null default 0,
  source_ts timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.mrapple_live_sync_state (
  workflow_name text primary key,
  last_success_at timestamptz,
  lag_seconds integer,
  last_error text,
  updated_at timestamptz not null default now()
);

