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
  foreman_id    uuid,
  site_number   text,
  room_number   text,
  start_date    date,
  monthly_salary numeric(10,2),
  foreman_commission numeric(10,2) not null default 0,
  is_active     boolean not null default true,
  notes         text,
  front_photo   text,
  back_photo    text,
  bank_name     text,
  bank_account_number text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- FOREMEN
create table public.foremen (
  id            uuid primary key default uuid_generate_v4(),
  full_name     text not null,
  id_number     text not null default '',
  phone         text not null default '',
  email         text not null default '',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.laborers
  add constraint laborers_foreman_id_fkey
  foreign key (foreman_id) references public.foremen(id) on delete set null;

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
  category     text not null default 'vehicle',
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
  sheet_type          text not null default 'labor'
                        check (sheet_type in ('labor','vehicle','equipment')),
  labor_name          text,
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

-- LABOR ADVANCES
create table public.labor_advances (
  id             uuid primary key default uuid_generate_v4(),
  laborer_id     uuid not null references public.laborers(id) on delete cascade,
  advance_date   date not null,
  amount         numeric(10,2) not null check (amount >= 0),
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index labor_advances_laborer_date_idx on public.labor_advances(laborer_id, advance_date);

-- SALARY RECORDS
create table public.salary_records (
  id                 uuid primary key default uuid_generate_v4(),
  laborer_id         uuid not null references public.laborers(id) on delete cascade,
  timesheet_id       uuid not null references public.timesheets(id) on delete cascade,
  month              int not null check (month between 0 and 11),
  year               int not null,
  regular_hours      numeric(8,2) not null default 0,
  overtime_hours     numeric(8,2) not null default 0,
  total_worked_hours numeric(8,2) not null default 0,
  hourly_rate        numeric(10,4) not null default 0,
  basic_salary       numeric(10,2) not null default 0,
  advances_amount    numeric(10,2) not null default 0,
  foreman_commission numeric(10,2) not null default 0,
  net_salary         numeric(10,2) not null default 0,
  status             text not null default 'draft' check (status in ('draft','approved')),
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (timesheet_id)
);
create index salary_records_month_year_idx on public.salary_records(month, year);
create index salary_records_laborer_month_year_idx on public.salary_records(laborer_id, month, year);

-- NPC INVOICES
create table public.npc_invoices (
  id                  uuid primary key default uuid_generate_v4(),
  invoice_number      text not null unique,
  invoice_date        date not null,
  bill_to             text not null,
  project             text not null default '',
  service_description text not null default '',
  vat_percent         numeric(5,2) not null default 5,
  subtotal            numeric(12,3) not null default 0,
  vat_amount          numeric(12,3) not null default 0,
  total_amount        numeric(12,3) not null default 0,
  currency            text not null default 'OMR',
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table public.npc_invoice_items (
  id            uuid primary key default uuid_generate_v4(),
  invoice_id    uuid not null references public.npc_invoices(id) on delete cascade,
  description   text not null,
  working_hours numeric(10,2) not null default 0,
  hourly_rate   numeric(10,3) not null default 0,
  amount        numeric(12,3) not null default 0,
  created_at    timestamptz not null default now()
);

-- AUTO updated_at TRIGGERS
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger laborers_updated_at   before update on public.laborers   for each row execute procedure public.handle_updated_at();
create trigger foremen_updated_at    before update on public.foremen    for each row execute procedure public.handle_updated_at();
create trigger vendors_updated_at    before update on public.vendors    for each row execute procedure public.handle_updated_at();
create trigger machines_updated_at   before update on public.machines   for each row execute procedure public.handle_updated_at();
create trigger timesheets_updated_at before update on public.timesheets for each row execute procedure public.handle_updated_at();
create trigger labor_advances_updated_at before update on public.labor_advances for each row execute procedure public.handle_updated_at();
create trigger salary_records_updated_at before update on public.salary_records for each row execute procedure public.handle_updated_at();
create trigger npc_invoices_updated_at before update on public.npc_invoices for each row execute procedure public.handle_updated_at();

-- ROW LEVEL SECURITY
alter table public.laborers          enable row level security;
alter table public.foremen           enable row level security;
alter table public.vendors           enable row level security;
alter table public.machines          enable row level security;
alter table public.machine_usage_logs enable row level security;
alter table public.timesheets        enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.labor_advances    enable row level security;
alter table public.salary_records    enable row level security;
alter table public.npc_invoices      enable row level security;
alter table public.npc_invoice_items enable row level security;

create policy "auth_all" on public.laborers           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.foremen            for all to authenticated using (true) with check (true);
create policy "auth_all" on public.vendors            for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machines           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machine_usage_logs for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheets         for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheet_entries  for all to authenticated using (true) with check (true);
create policy "auth_all" on public.labor_advances     for all to authenticated using (true) with check (true);
create policy "auth_all" on public.salary_records     for all to authenticated using (true) with check (true);
create policy "auth_all" on public.npc_invoices       for all to authenticated using (true) with check (true);
create policy "auth_all" on public.npc_invoice_items  for all to authenticated using (true) with check (true);
