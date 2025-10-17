-- Journey Plan table for Supabase (PostgreSQL)
-- Run inside the SQL editor of your Supabase project.

create table if not exists public.journey_plans (
  journey_plan_number bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  departure_date date,
  vehicle_number text,
  driver_name text,
  from_location text,
  from_departure_time text,
  to_location text,
  to_arrival_time text,
  call_journey_manager text,
  signature_date date,
  journey_plan_number_hint text,
  passengers jsonb default '[]'::jsonb,
  route_snapshot jsonb default '{}'::jsonb,
  rest_stops jsonb default '[]'::jsonb,
  notes text
);

alter table public.journey_plans
  add column if not exists call_journey_manager text;

alter table public.journey_plans
  add column if not exists signature_date date;

alter table public.journey_plans
  add column if not exists journey_plan_number_hint text;

create index if not exists journey_plans_created_at_idx
  on public.journey_plans (created_at desc);

alter table public.journey_plans enable row level security;

-- Allow the service role (used by the Express backend) full access.
do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'journey_plans'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'journey_plans'
        and policyname = 'service can do anything on journey_plans'
    ) then
      create policy "service can do anything on journey_plans"
        on public.journey_plans
        for all
        using (true)
        with check (true);
    end if;
  end if;
end $$;

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb
);

alter table public.settings enable row level security;

do $$
begin
  if exists (
    select 1 from pg_tables
    where schemaname = 'public' and tablename = 'settings'
  ) then
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'settings'
        and policyname = 'service can do anything on settings'
    ) then
      create policy "service can do anything on settings"
        on public.settings
        for all
        using (true)
        with check (true);
    end if;
  end if;
end $$;

-- Optional: read-only access for anon key (if you ever expose directly from frontend)
-- create policy "public read journey_plans"
--   on public.journey_plans
--   for select
--   using (true);
