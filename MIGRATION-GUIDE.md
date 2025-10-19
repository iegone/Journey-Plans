# 🔄 Migration Guide - Journey Plan Number Fix

## المشكلة

`journey_plan_number` كان مربوط بالـ database ID (auto-increment)، مما يمنع التحكم في التسلسل.

## الحل

فصل `journey_plan_number` عن `id` - كل واحد مستقل.

---

## 📝 خطوات التطبيق

### 1️⃣ تشغيل Migration في Supabase

افتح **Supabase SQL Editor** وشغل الملف:

```
migration-journey-plan-number.sql
```

أو انسخ والصق الكود التالي:

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

### 2️⃣ إعادة تشغيل السيرفر

```bash
# أوقف السيرفر (Ctrl+C)
# ثم شغله من جديد:
node server.js
```

---

## ✅ النتائج

بعد Migration:

### قبل ❌

- `journey_plan_number` = primary key (auto-increment)
- لا يمكن تغيير التسلسل
- PostgreSQL يتحكم في الرقم

### بعد ✅

- `id` = primary key (auto-increment)
- `journey_plan_number` = عمود عادي (unique)
- **أنت** تتحكم في الرقم من Dashboard
- يمكن تغيير التسلسل في أي وقت

---

## 🎯 الاستخدام بعد Migration

### في Dashboard:

1. اضغط "Set Next Number"
2. اكتب الرقم المطلوب (مثلاً: 100)
3. ✅ الرقم يتغير ويبقى ثابت

### في index.html:

1. الرقم الحالي **يظهر تلقائياً**
2. لما تعمل Save → الرقم يزيد تلقائياً
3. مثال: 100 → 101 → 102 → ...

---

## ⚠️ ملاحظات مهمة

1. **backup** قبل تشغيل Migration
2. Migration **آمن** - يحافظ على كل البيانات
3. إذا حدث خطأ، راجع رسائل PostgreSQL في SQL Editor

