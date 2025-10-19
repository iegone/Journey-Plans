# 🚀 Setup Steps - خطوات الإعداد

## ⚠️ مهم جداً - شغّل هذه الخطوات بالترتيب

---

## الخطوة 1️⃣: إنشاء جداول الخيارات

### افتح Supabase SQL Editor وشغّل ملف `options-schema.sql` كامل

أو انسخ والصق هذا الكود:

```sql
-- جدول السائقين
create table if not exists public.drivers (
  id bigserial primary key,
  name text not null unique,
  code text,
  gsm text,
  created_at timestamptz not null default now()
);

-- جدول المركبات
create table if not exists public.vehicles (
  id bigserial primary key,
  number text not null unique,
  created_at timestamptz not null default now()
);

-- جدول الأماكن
create table if not exists public.locations (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- جدول أنواع الراحة
create table if not exists public.rest_types (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.locations enable row level security;
alter table public.rest_types enable row level security;

-- Policies
create policy "service can do anything on drivers"
  on public.drivers for all using (true) with check (true);

create policy "service can do anything on vehicles"
  on public.vehicles for all using (true) with check (true);

create policy "service can do anything on locations"
  on public.locations for all using (true) with check (true);

create policy "service can do anything on rest_types"
  on public.rest_types for all using (true) with check (true);

-- البيانات الافتراضية
insert into public.drivers (name, code, gsm) values
  ('Mohamed Al Mayahi', 'VOS-001', '9070 7038'),
  ('Hamed Al Naabi', 'VOS-0014', '9796 9572'),
  ('Ahmed Salah', 'VOS-0029', '9206 2338'),
  ('Mohammed Sulaiman', 'VOS-003', '9633 5565'),
  ('Haitham Al Hadi', 'VOS-009', '9818 0866'),
  ('Waleed Al Balushi', 'VOS-0018', '9231 4855'),
  ('Mojaled Ahmed', 'VOS-0024', '9796 9571'),
  ('Abdu Aziz Salim', 'VOS-0004', '9988 7044'),
  ('Ali Said Al Mulhairhi', 'VOS-007', '9944 3307'),
  ('Haitham Al Rajahi', 'VOS-0025', '9232 4405'),
  ('Shaik Ali', 'VOS-0028', '9512 3881'),
  ('Khalid Al Sharji', 'VOS-0013', '9553 5327'),
  ('Zakarya Yahya', 'VOS-0030', '9945 4912')
on conflict (name) do nothing;

insert into public.vehicles (number) values
  ('4972 YW'), ('575 BA'), ('2111RK'), ('6354 RH'),
  ('3267 HW'), ('3950 DA'), ('171 MB'), ('9689 HW')
on conflict (number) do nothing;

insert into public.locations (name) values
  ('ARA'), ('MANAH'), ('DALEEL'), ('IBRI'), ('MUSCAT')
on conflict (name) do nothing;

insert into public.rest_types (name) values
  ('CHECKPOINT'), ('FUEL'), ('MEAL'), ('PRAYER'), ('COFFEE')
on conflict (name) do nothing;
```

---

## الخطوة 2️⃣: تشغيل Migration لـ Journey Plan Number

### شغّل ملف `migration-journey-plan-number.sql`

أو الكود المختصر:

```sql
alter table public.journey_plans add column if not exists id bigserial;
alter table public.journey_plans drop constraint if exists journey_plans_pkey cascade;
alter table public.journey_plans alter column journey_plan_number drop identity if exists;
alter table public.journey_plans add primary key (id);
alter table public.journey_plans add constraint journey_plans_number_unique unique (journey_plan_number);
drop function if exists public.set_journey_plan_sequence(bigint);
```

---

## الخطوة 3️⃣: إعادة تشغيل السيرفر

```bash
# أوقف السيرفر (Ctrl+C)
node server.js
```

---

## ✅ التحقق من النجاح

بعد تشغيل الخطوات:

1. افتح `index.html`
2. الـ dropdowns **تتحمّل من الداتابيز** ✅
3. أضف خيار جديد → **يُحفظ في الداتابيز** ✅
4. أعد تحميل الصفحة → الخيار **لسه موجود** ✅

---

## 🎯 النتيجة النهائية

- ✅ جداول: drivers, vehicles, locations, rest_types
- ✅ journey_plan_number منفصل عن ID
- ✅ كل الخيارات محفوظة ودائمة
- ✅ Select All & Delete Multiple في Dashboard
- ✅ Datalist مع بحث مدمج

**شغّل الخطوات دي وهتشتغل 100%!** 🚀

