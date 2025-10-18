-- Journey Plan table for Supabase (PostgreSQL)
-- Run inside the SQL editor of your Supabase project.

-- IMPORTANT: If table already exists, run migration script below instead of recreating

create table if not exists public.journey_plans (
  id bigserial primary key,
  journey_plan_number bigint not null unique,
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

-- Index for fast lookup by journey_plan_number
create index if not exists journey_plans_number_idx
  on public.journey_plans (journey_plan_number desc);

-- ===== MIGRATION SCRIPT (if table already exists) =====
-- Run this if you already have data in the journey_plans table

-- Step 1: Add new id column
do $$
begin
  -- Check if we need to migrate (journey_plan_number is still primary key)
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'journey_plans'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name like '%journey_plan_number%'
  ) then
    -- Add new id column
    alter table public.journey_plans add column if not exists id bigserial;
    
    -- Drop old primary key
    alter table public.journey_plans drop constraint if exists journey_plans_pkey;
    
    -- Make journey_plan_number nullable temporarily and remove identity
    alter table public.journey_plans 
      alter column journey_plan_number drop identity if exists,
      alter column journey_plan_number drop not null;
    
    -- Set id as new primary key
    alter table public.journey_plans add primary key (id);
    
    -- Make journey_plan_number not null and unique
    alter table public.journey_plans 
      alter column journey_plan_number set not null,
      add constraint journey_plans_number_unique unique (journey_plan_number);
      
    raise notice 'Migration completed successfully';
  end if;
end $$;

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

-- Note: set_journey_plan_sequence function is no longer needed
-- journey_plan_number is now manually controlled by the backend

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
