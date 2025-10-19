# 🚀 How to Apply the Fix

## خطوة واحدة فقط!

### افتح Supabase SQL Editor وشغّل هذا الكود:

```sql
-- Add new id column
alter table public.journey_plans add column if not exists id bigserial;

-- Drop old primary key
alter table public.journey_plans drop constraint if exists journey_plans_pkey cascade;

-- Remove identity from journey_plan_number
alter table public.journey_plans
  alter column journey_plan_number drop identity if exists;

-- Set new primary key
alter table public.journey_plans add primary key (id);

-- Make journey_plan_number unique
alter table public.journey_plans
  add constraint journey_plans_number_unique unique (journey_plan_number);

-- Recreate index
drop index if exists journey_plans_number_idx;
create index journey_plans_number_idx on public.journey_plans (journey_plan_number desc);

-- Remove old function
drop function if exists public.set_journey_plan_sequence(bigint);
```

### ثم أعد تشغيل السيرفر:

```bash
node server.js
```

## ✅ خلاص! الآن:

- يمكنك تغيير رقم Journey Plan من Dashboard
- الرقم **لن يرجع** مرة أخرى
- كل journey جديد **يزيد تلقائياً**

