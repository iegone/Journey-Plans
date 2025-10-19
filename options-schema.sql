-- =====================================================
-- Options Tables - حفظ الخيارات المخصصة
-- =====================================================

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
  display_name text,
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

-- Policies (full access for service role)
create policy "service can do anything on drivers"
  on public.drivers for all using (true) with check (true);

create policy "service can do anything on vehicles"
  on public.vehicles for all using (true) with check (true);

create policy "service can do anything on locations"
  on public.locations for all using (true) with check (true);

create policy "service can do anything on rest_types"
  on public.rest_types for all using (true) with check (true);

-- إدخال البيانات الافتراضية
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

insert into public.vehicles (number, display_name) values
  ('4972 YW', 'Unit 1'),
  ('575 BA', 'Unit 2'),
  ('2111RK', 'Unit 3'),
  ('6354 RH', 'Unit 4'),
  ('3267 HW', 'Unit 5'),
  ('3950 DA', 'Pickup 1'),
  ('171 MB', 'Pickup 2'),
  ('9689 HW', 'Pickup 3')
on conflict (number) do nothing;

insert into public.locations (name) values
  ('ARA'), ('MANAH'), ('DALEEL'), ('IBRI'), ('MUSCAT')
on conflict (name) do nothing;

insert into public.rest_types (name) values
  ('CHECKPOINT'), ('FUEL'), ('MEAL'), ('PRAYER'), ('COFFEE')
on conflict (name) do nothing;
alter table public.vehicles
  add column if not exists display_name text;
