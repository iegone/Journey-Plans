-- =====================================================
-- Migration: Separate ID from Journey Plan Number
-- =====================================================
-- This migration makes journey_plan_number independent from the database ID
-- Run this in your Supabase SQL Editor

-- STEP 1: Add new id column as primary key
do $$
begin
  -- Check if migration is needed
  if exists (
    select 1 from information_schema.columns
    where table_name = 'journey_plans' 
      and column_name = 'journey_plan_number'
      and is_identity = 'YES'
  ) then
    
    raise notice 'Starting migration...';
    
    -- Add new id column
    alter table public.journey_plans add column if not exists id bigserial;
    
    -- Drop old primary key constraint
    alter table public.journey_plans drop constraint if exists journey_plans_pkey cascade;
    
    -- Remove identity from journey_plan_number
    alter table public.journey_plans 
      alter column journey_plan_number drop identity if exists;
    
    -- Set new primary key
    alter table public.journey_plans add primary key (id);
    
    -- Make journey_plan_number unique but not primary
    alter table public.journey_plans 
      add constraint journey_plans_number_unique unique (journey_plan_number);
    
    -- Recreate index
    drop index if exists journey_plans_number_idx;
    create index journey_plans_number_idx on public.journey_plans (journey_plan_number desc);
    
    raise notice 'Migration completed successfully!';
    raise notice 'journey_plan_number is now independent from ID';
    
  else
    raise notice 'Migration not needed - journey_plan_number is already independent';
  end if;
end $$;

-- STEP 2: Remove the sequence function (no longer needed)
drop function if exists public.set_journey_plan_sequence(bigint);

-- STEP 3: Verify migration
do $$
declare
  pk_column text;
begin
  select a.attname into pk_column
  from pg_index i
  join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
  where i.indrelid = 'public.journey_plans'::regclass
    and i.indisprimary;
    
  raise notice 'Current primary key column: %', pk_column;
  
  if pk_column = 'id' then
    raise notice '✓ Migration successful - using id as primary key';
  else
    raise warning '✗ Primary key is still: %', pk_column;
  end if;
end $$;

