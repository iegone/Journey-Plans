-- =====================================================
-- Auth & Logs Schema
-- نظام بسيط للـ Authentication والـ Logs
-- =====================================================

-- جدول المستخدمين
create table if not exists public.users (
  id bigserial primary key,
  username text not null unique,
  password_hash text not null,
  full_name text,
  role text default 'user',
  created_at timestamptz not null default now(),
  last_login timestamptz,
  must_change_password boolean not null default false
);

-- جدول السجلات (Logs)
create table if not exists public.activity_logs (
  id bigserial primary key,
  user_name text not null,
  action text not null,
  journey_plan_number bigint,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.users enable row level security;
alter table public.activity_logs enable row level security;

alter table public.users
  add column if not exists must_change_password boolean not null default false;

-- Policies
create policy "service can do anything on users"
  on public.users for all using (true) with check (true);

create policy "service can do anything on activity_logs"
  on public.activity_logs for all using (true) with check (true);

-- إنشاء مستخدمين افتراضيين
-- Admin: admin / admin123
-- Employee: employee / employee123

insert into public.users (username, password_hash, full_name, role) values
  ('admin', '$2a$10$aTTDGEAEIlKl6hNAJxKDR.UVDVlC46YjXcYg2tvfPVzhVttApN4Xy', 'Administrator', 'admin', false),
  ('employee', '$2a$10$hwIptozj1IZ4fFoW6Jjm6e3L1Zz.RtaXEGK8axITVDXE3qD/UcBUm', 'Regular Employee', 'user', false)
on conflict (username) do nothing;

-- Index للبحث السريع
create index if not exists activity_logs_created_at_idx
  on public.activity_logs (created_at desc);

create index if not exists activity_logs_journey_number_idx
  on public.activity_logs (journey_plan_number);

create index if not exists activity_logs_user_idx
  on public.activity_logs (user_name);

-- ملاحظة مهمة:
-- لحفظ كلمة مرور جديدة، استخدم bcrypt في Node.js:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('your_password', 10);
