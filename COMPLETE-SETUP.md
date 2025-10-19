# 🎯 Complete Setup Guide

## خطوات الإعداد الكاملة - نفذها بالترتيب

---

## الخطوة 1️⃣: تثبيت bcryptjs

```bash
npm install bcryptjs
```

---

## الخطوة 2️⃣: إعداد الداتابيز

### في Supabase SQL Editor، شغّل الملفات التالية بالترتيب:

#### أ) جداول الخيارات (Options):

```sql
-- انسخ محتوى: options-schema.sql
-- أو شغّل الكود التالي:
```

راجع ملف `options-schema.sql`

#### ب) Migration لـ Journey Plan Number:

```sql
-- انسخ محتوى: migration-journey-plan-number.sql
```

#### ج) جداول Auth & Logs:

```sql
-- انسخ محتوى: auth-logs-schema.sql
```

**أو شغّل هذا الكود المختصر:**

```sql
-- Tables
create table public.drivers (id bigserial primary key, name text unique not null, code text, gsm text, created_at timestamptz default now());
create table public.vehicles (id bigserial primary key, number text unique not null, display_name text, created_at timestamptz default now());
create table public.locations (id bigserial primary key, name text unique not null, created_at timestamptz default now());
create table public.rest_types (id bigserial primary key, name text unique not null, created_at timestamptz default now());
create table public.users (id bigserial primary key, username text unique not null, password_hash text not null, full_name text, role text default 'user', created_at timestamptz default now(), last_login timestamptz, must_change_password boolean not null default false);
create table public.activity_logs (id bigserial primary key, user_name text not null, action text not null, journey_plan_number bigint, details jsonb default '{}'::jsonb, created_at timestamptz default now());

-- RLS
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicles add column if not exists display_name text;
alter table public.locations enable row level security;
alter table public.rest_types enable row level security;
alter table public.users enable row level security;
alter table public.activity_logs enable row level security;
alter table public.users add column if not exists must_change_password boolean not null default false;

-- Policies
create policy "service can do anything on drivers" on public.drivers for all using (true) with check (true);
create policy "service can do anything on vehicles" on public.vehicles for all using (true) with check (true);
create policy "service can do anything on locations" on public.locations for all using (true) with check (true);
create policy "service can do anything on rest_types" on public.rest_types for all using (true) with check (true);
create policy "service can do anything on users" on public.users for all using (true) with check (true);
create policy "service can do anything on activity_logs" on public.activity_logs for all using (true) with check (true);

-- Journey Plans Migration
alter table public.journey_plans add column if not exists id bigserial;
alter table public.journey_plans drop constraint if exists journey_plans_pkey cascade;
alter table public.journey_plans alter column journey_plan_number drop identity if exists;
alter table public.journey_plans add primary key (id);
alter table public.journey_plans add constraint journey_plans_number_unique unique (journey_plan_number);
drop function if exists public.set_journey_plan_sequence(bigint);

-- Default data
insert into public.drivers (name, code, gsm) values ('Mohamed Al Mayahi', 'VOS-001', '9070 7038'), ('Hamed Al Naabi', 'VOS-0014', '9796 9572'), ('Ahmed Salah', 'VOS-0029', '9206 2338'), ('Mohammed Sulaiman', 'VOS-003', '9633 5565'), ('Haitham Al Hadi', 'VOS-009', '9818 0866'), ('Waleed Al Balushi', 'VOS-0018', '9231 4855'), ('Mojaled Ahmed', 'VOS-0024', '9796 9571'), ('Abdu Aziz Salim', 'VOS-0004', '9988 7044'), ('Ali Said Al Mulhairhi', 'VOS-007', '9944 3307'), ('Haitham Al Rajahi', 'VOS-0025', '9232 4405'), ('Shaik Ali', 'VOS-0028', '9512 3881'), ('Khalid Al Sharji', 'VOS-0013', '9553 5327'), ('Zakarya Yahya', 'VOS-0030', '9945 4912') on conflict do nothing;
insert into public.vehicles (number, display_name) values ('4972 YW', 'Unit 1'), ('575 BA', 'Unit 2'), ('2111RK', 'Unit 3'), ('6354 RH', 'Unit 4'), ('3267 HW', 'Unit 5'), ('3950 DA', 'Pickup 1'), ('171 MB', 'Pickup 2'), ('9689 HW', 'Pickup 3') on conflict (number) do nothing;
insert into public.locations (name) values ('ARA'), ('MANAH'), ('DALEEL'), ('IBRI'), ('MUSCAT') on conflict do nothing;
insert into public.rest_types (name) values ('CHECKPOINT'), ('FUEL'), ('MEAL'), ('PRAYER'), ('COFFEE') on conflict do nothing;
insert into public.users (username, password_hash, full_name, role, must_change_password) values ('admin', '$2a$10$aTTDGEAEIlKl6hNAJxKDR.UVDVlC46YjXcYg2tvfPVzhVttApN4Xy', 'Administrator', 'admin', false) on conflict do nothing;
```

---

## الخطوة 3️⃣: إعادة تشغيل السيرفر

```bash
# أوقف السيرفر (Ctrl+C)
npm install
node server.js
```

---

## 🎉 النظام جاهز!

### 🔐 تسجيل الدخول:

#### 👨‍💼 **Admin** (Dashboard):

1. افتح `dashboard.html`
2. سيتم redirect تلقائياً لـ `login.html`
3. **Username**: `admin`
4. **Password**: `admin123`
5. Login → Dashboard (إدارة كاملة)

#### 👷‍♂️ **Employee** (Journey Plan):

1. افتح `index.html`
2. سيتم redirect تلقائياً لـ `login.html`
3. **Username**: `employee`
4. **Password**: `employee123`
5. Login → Journey Plan (إنشاء/تعديل فقط)

---

## 📊 المميزات الكاملة:

### ✅ في `index.html` (Employee):

- 🔐 **محمي** - لازم login (Employee)
- Load & Search journeys (autocomplete)
- Validation كامل
- Edit & Update journeys
- Create new journeys
- كل الخيارات محفوظة في DB
- 👤 عرض المستخدم الحالي
- 🚪 Logout button

### ✅ في `dashboard.html` (Admin):

- 🔐 **محمي** - لازم login + Admin role
- 🔍 Filters (search + date)
- ☑️ Select All
- 🗑️ Delete Multiple
- 👁️ View journey
- ✏️ Edit journey number
- 👤 عرض المستخدم الحالي
- 📊 View Logs button
- 🚪 Logout button

### ✅ في `logs-viewer.html`:

- عرض كل الأنشطة
- مين عمل إيه
- امتى
- على أي journey

---

## 🔑 تغيير كلمة المرور:

بعد أول login، غيّر كلمة المرور:

```javascript
// في Console المتصفح:
fetch("/api/auth/change-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "admin",
    currentPassword: "admin123",
    newPassword: "your_new_secure_password",
  }),
})
  .then((r) => r.json())
  .then(console.log);
```

---

## 📝 Activity Logs تسجل:

| Action              | متى يحصل            |
| ------------------- | ------------------- |
| **create**          | إنشاء journey جديد  |
| **update**          | تعديل journey موجود |
| **delete**          | حذف journey         |
| **login**           | تسجيل دخول          |
| **change_password** | تغيير كلمة المرور   |

---

## 🎯 ملخص الملفات:

### الصفحات:

- ✅ `index.html` - إنشاء/تعديل Journey
- ✅ `dashboard.html` - إدارة Journeys (محمي)
- ✅ `login.html` - تسجيل الدخول
- ✅ `logs-viewer.html` - عرض السجلات
- ✅ `template.html` - قالب الطباعة

### الداتابيز:

- ✅ `journey_plans` - الرحلات
- ✅ `drivers` - السائقين
- ✅ `vehicles` - المركبات
- ✅ `locations` - الأماكن
- ✅ `rest_types` - أنواع الراحة
- ✅ `users` - المستخدمين
- ✅ `activity_logs` - السجلات
- ✅ `settings` - الإعدادات

**كل شيء جاهز! 🚀✨**
