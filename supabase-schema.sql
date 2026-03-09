-- ============================================================
-- ALMYAR UNITED TRADING LLC - Railway Project Platform Schema
-- Run this entire file in: Supabase → SQL Editor → New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- LABORERS
create table public.laborers (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  designation   text not null default '',
  supplier_name text not null default '',
  id_number     text not null default '',
  nationality   text not null default '',
  phone         text not null default '',
  daily_rate    numeric(10,2),
  is_active     boolean not null default true,
  notes         text,
  front_photo   text,
  back_photo    text,
  bank_name     text,
  bank_account_number text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- VENDORS
create table public.vendors (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  contact_person       text not null default '',
  contact_person_phone text not null default '',
  company_phone        text not null default '',
  email                text not null default '',
  address        text not null default '',
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- MACHINES
create table public.machines (
  id           uuid primary key default uuid_generate_v4(),
  vendor_id    uuid references public.vendors(id) on delete set null,
  name         text not null,
  type         text not null default '',
  plate_number text not null default '',
  model        text not null default '',
  year         int,
  daily_rate   numeric(10,2),
  status       text not null default 'available'
                 check (status in ('available','in_use','maintenance','returned')),
  notes        text,
  is_active    boolean not null default true,
  contact_person  text,
  contact_number  text,
  operator_name   text,
  operator_id     text,
  vehicle_photo   text,
  vehicle_card    text,
  operator_card   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- MACHINE USAGE LOGS
create table public.machine_usage_logs (
  id               uuid primary key default uuid_generate_v4(),
  machine_id       uuid not null references public.machines(id) on delete cascade,
  log_date         date not null,
  hours_used       numeric(5,2) not null default 0,
  operator_name    text not null default '',
  fuel_consumed    numeric(8,2),
  task_description text,
  site_location    text,
  remarks          text,
  created_at       timestamptz not null default now()
);
create unique index machine_usage_logs_machine_day_idx on public.machine_usage_logs(machine_id, log_date);

-- TIMESHEETS
create table public.timesheets (
  id                  uuid primary key default uuid_generate_v4(),
  laborer_id          uuid, -- no FK: stores laborer OR machine UUID
  month               int not null check (month between 0 and 11),
  year                int not null,
  project_name        text not null default '',
  supplier_name       text not null default '',
  site_engineer_name  text not null default '',
  designation         text not null default '',
  total_worked        numeric(7,2) not null default 0,
  total_ot            numeric(7,2) not null default 0,
  total_actual        numeric(7,2) not null default 0,
  status              text not null default 'draft'
                        check (status in ('draft','submitted','approved')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- TIMESHEET ENTRIES
create table public.timesheet_entries (
  id             uuid primary key default uuid_generate_v4(),
  timesheet_id   uuid not null references public.timesheets(id) on delete cascade,
  day            int not null check (day between 1 and 31),
  time_in        text not null default '',
  time_out_lunch text not null default '',
  lunch_break    text not null default '',
  time_in_2      text not null default '',
  time_out_2     text not null default '',
  total_duration numeric(5,2) not null default 0,
  over_time      numeric(5,2) not null default 0,
  actual_worked  numeric(5,2) not null default 0,
  approver_sig   text not null default '',
  remarks        text not null default '',
  created_at     timestamptz not null default now()
);
create unique index timesheet_entries_sheet_day_idx on public.timesheet_entries(timesheet_id, day);

-- AUTO updated_at TRIGGERS
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger laborers_updated_at   before update on public.laborers   for each row execute procedure public.handle_updated_at();
create trigger vendors_updated_at    before update on public.vendors    for each row execute procedure public.handle_updated_at();
create trigger machines_updated_at   before update on public.machines   for each row execute procedure public.handle_updated_at();
create trigger timesheets_updated_at before update on public.timesheets for each row execute procedure public.handle_updated_at();

-- ROW LEVEL SECURITY
alter table public.laborers          enable row level security;
alter table public.vendors           enable row level security;
alter table public.machines          enable row level security;
alter table public.machine_usage_logs enable row level security;
alter table public.timesheets        enable row level security;
alter table public.timesheet_entries enable row level security;

create policy "auth_all" on public.laborers           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.vendors            for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machines           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machine_usage_logs for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheets         for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheet_entries  for all to authenticated using (true) with check (true);
