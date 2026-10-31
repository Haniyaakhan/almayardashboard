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
  laborer_id    uuid unique references public.laborers(id) on delete set null,
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
                        check (sheet_type in ('labor','vehicle','equipment','tunnel_employee','tunnel_vehicle','latest_timesheet')),
  labor_name          text,
  month               int not null check (month between 0 and 11),
  year                int not null,
  project_name        text not null default '',
  supplier_name       text not null default '',
  site_engineer_name  text not null default '',
  designation         text not null default '',
  shift               text check (shift is null or shift in ('day','night')),
  driver_name         text,
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

-- SALARY SHEETS (MANUAL MONTHLY SALARY GENERATION)
create table public.salary_sheets (
  id                 uuid primary key default uuid_generate_v4(),
  month              int not null check (month between 0 and 11),
  year               int not null,
  status             text not null default 'draft' check (status in ('draft','approved')),
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (month, year)
);ALTER TABLE salary_sheet_entries ADD COLUMN IF NOT EXISTS deduction NUMERIC DEFAULT 0;
```> ALTER TABLE salary_sheet_entries ADD COLUMN IF NOT EXISTS deduction NUMERIC DEFAULT 0;

create table public.salary_sheet_entries (
  id                 uuid primary key default uuid_generate_v4(),
  sheet_id           uuid not null references public.salary_sheets(id) on delete cascade,
  laborer_id         uuid not null references public.laborers(id) on delete cascade,
  labor_name         text not null default '',
  labor_code         text not null default '',
  designation        text not null default '',
  bank_name          text not null default '-',
  bank_account_number text not null default '-',
  monthly_salary     numeric(12,3) not null default 0,
  actual_worked_hours numeric(10,3) not null default 0,
  overtime_hours     numeric(10,3) not null default 0,
  total_worked_hours numeric(10,3) not null default 0,
  hourly_rate        numeric(12,6) not null default 0,
  total_salary       numeric(12,3) not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (sheet_id, laborer_id)
);

create index salary_sheets_month_year_idx on public.salary_sheets(month, year);
create index salary_sheet_entries_sheet_idx on public.salary_sheet_entries(sheet_id);

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
create trigger salary_sheets_updated_at before update on public.salary_sheets for each row execute procedure public.handle_updated_at();
create trigger salary_sheet_entries_updated_at before update on public.salary_sheet_entries for each row execute procedure public.handle_updated_at();
create trigger npc_invoices_updated_at before update on public.npc_invoices for each row execute procedure public.handle_updated_at();

-- ROW LEVEL SECURITY
alter table public.laborers          enable row level security;
alter table public.foremen           enable row level security;
alter table public.vendors           enable row level security;
alter table public.machines          enable row level security;
alter table public.machine_usage_logs enable row level security;
alter table public.timesheets        enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.salary_sheets     enable row level security;
alter table public.salary_sheet_entries enable row level security;
alter table public.npc_invoices      enable row level security;
alter table public.npc_invoice_items enable row level security;

create policy "auth_all" on public.laborers           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.foremen            for all to authenticated using (true) with check (true);
create policy "auth_all" on public.vendors            for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machines           for all to authenticated using (true) with check (true);
create policy "auth_all" on public.machine_usage_logs for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheets         for all to authenticated using (true) with check (true);
create policy "auth_all" on public.timesheet_entries  for all to authenticated using (true) with check (true);
create policy "auth_all" on public.salary_sheets     for all to authenticated using (true) with check (true);
create policy "auth_all" on public.salary_sheet_entries for all to authenticated using (true) with check (true);
create policy "auth_all" on public.npc_invoices       for all to authenticated using (true) with check (true);
create policy "auth_all" on public.npc_invoice_items  for all to authenticated using (true) with check (true);

-- ============================================================
-- VEHICLE LPO & SHIFT MANAGEMENT — PHASE 1
-- ============================================================

create type public.user_role as enum ('admin','operations');

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       public.user_role not null default 'operations',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create table public.vehicle_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.vehicle_types (name) values
  ('Bob Cat'),('Bus'),('Crane'),('Diesel Tanker'),('Dozer'),('Excavator'),
  ('Flat Bed'),('Forklift'),('Grader'),('Hiab'),('JCB'),('Low Bed'),
  ('Manlift'),('Pick Up'),('Roller'),('Shovel'),('Six Wheel Truck'),
  ('Tipper'),('Water Tanker'),('Other');

alter table public.machines add column vehicle_type_id uuid references public.vehicle_types(id);

create table public.lpos (
  id uuid primary key default uuid_generate_v4(),
  lpo_number text not null,
  vehicle_type_id uuid not null references public.vehicle_types(id),
  quantity_total int not null check (quantity_total > 0),
  quantity_used int not null default 0 check (quantity_used >= 0),
  status text not null default 'active' check (status in ('active','pending_renewal','closed')),
  valid_from date,
  valid_to date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lpos_vehicle_type_status_idx on public.lpos(vehicle_type_id, status);

create table public.lpo_renewals (
  id uuid primary key default uuid_generate_v4(),
  lpo_id uuid not null references public.lpos(id) on delete cascade,
  added_quantity int not null check (added_quantity > 0),
  previous_quantity_total int not null,
  new_quantity_total int not null,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.profiles      enable row level security;
alter table public.vehicle_types enable row level security;
alter table public.lpos          enable row level security;
alter table public.lpo_renewals  enable row level security;

create policy "select_own_or_admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "update_own_no_role_change" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "admin_update_any" on public.profiles for update to authenticated
  using (public.is_admin());

create policy "select_all" on public.vehicle_types for select to authenticated using (true);
create policy "admin_write" on public.vehicle_types for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.vehicle_types for update to authenticated using (public.is_admin());

create policy "select_all" on public.lpos for select to authenticated using (true);
create policy "admin_write" on public.lpos for insert to authenticated with check (public.is_admin());
create policy "admin_update" on public.lpos for update to authenticated using (public.is_admin());

create policy "select_all" on public.lpo_renewals for select to authenticated using (true);
create policy "admin_write" on public.lpo_renewals for insert to authenticated with check (public.is_admin());

-- ============================================================
-- VEHICLE LPO & SHIFT MANAGEMENT — PHASE 2
-- ============================================================

create table public.shifts (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.machines(id),
  shift_date date not null,
  shift_type text not null check (shift_type in ('day','night')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  break_minutes int not null default 60,
  net_hours numeric(5,2) not null default 10,
  driver_name_snapshot text,
  vehicle_type_snapshot text,
  vehicle_plate_snapshot text,
  lpo_id uuid references public.lpos(id),
  lpo_number_snapshot text,
  overridden_driver boolean not null default false,
  override_reason text,
  override_duplicate boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','approved','cancelled')),
  project_name text,
  supplier_name text,
  site_engineer_name text,
  remarks text,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index shifts_vehicle_date_type_uq on public.shifts(vehicle_id, shift_date, shift_type)
  where status <> 'cancelled' and not override_duplicate;
create index shifts_status_idx on public.shifts(status);
create index shifts_lpo_idx on public.shifts(lpo_id);

create function public.snapshot_shift_fields() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m record;
  l record;
begin
  select type, operator_name, plate_number into m from public.machines where id = new.vehicle_id;
  if not found then
    raise exception 'Vehicle % not found', new.vehicle_id;
  end if;
  new.vehicle_type_snapshot := m.type;
  new.driver_name_snapshot := coalesce(new.driver_name_snapshot, m.operator_name);
  new.vehicle_plate_snapshot := m.plate_number;

  if new.lpo_id is not null then
    select lpo_number into l from public.lpos where id = new.lpo_id;
    new.lpo_number_snapshot := l.lpo_number;
  end if;

  return new;
end; $$;

create trigger before_insert_shift_snapshot before insert on public.shifts
  for each row execute procedure public.snapshot_shift_fields();

create function public.adjust_lpo_balance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'approved' and old.status <> 'approved' and new.lpo_id is not null then
    update public.lpos set quantity_used = quantity_used + 1, updated_at = now() where id = new.lpo_id;
  elsif old.status = 'approved' and new.status <> 'approved' and old.lpo_id is not null then
    update public.lpos set quantity_used = greatest(quantity_used - 1, 0), updated_at = now() where id = old.lpo_id;
  end if;
  return new;
end; $$;

create trigger after_update_shift_adjust_lpo after update on public.shifts
  for each row execute procedure public.adjust_lpo_balance();

create function public.update_lpo_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.quantity_used >= new.quantity_total and new.status = 'active' then
    new.status := 'pending_renewal';
  elsif new.quantity_used < new.quantity_total and new.status = 'pending_renewal' then
    new.status := 'active';
  end if;
  return new;
end; $$;

create trigger before_update_lpo_status before update on public.lpos
  for each row execute procedure public.update_lpo_status();

alter table public.shifts enable row level security;
create policy "select_all" on public.shifts for select to authenticated using (true);
create policy "insert_shifts" on public.shifts for insert to authenticated
  with check (override_duplicate = false or public.is_admin());
create policy "update_non_approved_or_admin" on public.shifts for update to authenticated
  using (status <> 'approved' or public.is_admin())
  with check (public.is_admin() or status in ('draft','submitted','cancelled'));

-- ============================================================
-- VEHICLE LPO & SHIFT MANAGEMENT — PHASE 4
-- ============================================================

create table public.vehicle_register_reviews (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.machines(id),
  review_month int not null check (review_month between 0 and 11),
  review_year int not null,
  classification text not null check (classification in ('unchanged','driver_changed','left_fleet')),
  previous_driver_name text,
  new_driver_name text,
  effective_date date not null,
  notes text,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (vehicle_id, review_month, review_year)
);

alter table public.vehicle_register_reviews enable row level security;
create policy "select_all" on public.vehicle_register_reviews for select to authenticated using (true);
create policy "admin_write" on public.vehicle_register_reviews for insert to authenticated with check (public.is_admin());
