-- ============================================================
-- MIGRATION: Run this in Supabase → SQL Editor → New query
-- ============================================================

-- 1. Remove FK constraint on timesheets.laborer_id
--    This allows machine UUIDs to be stored (vehicle/equipment timesheets)
ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_laborer_id_fkey;

-- 2. Add phone fields to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS contact_person_phone text NOT NULL DEFAULT '';
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS company_phone text NOT NULL DEFAULT '';

-- 3. Add category to machines to distinguish vehicles from equipment
ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'vehicle';

-- 4. Add timesheet type and free-text labor name used by the app
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS sheet_type text NOT NULL DEFAULT 'labor';
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS labor_name text;

-- 5. Ensure sheet_type only allows supported values (include tunnel_vehicle)
DO $$
BEGIN
	-- Drop existing constraint if present so we can recreate with updated allowed values
	IF EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'timesheets_sheet_type_check'
			AND conrelid = 'public.timesheets'::regclass
	) THEN
		ALTER TABLE public.timesheets DROP CONSTRAINT timesheets_sheet_type_check;
	END IF;

	ALTER TABLE public.timesheets
		ADD CONSTRAINT timesheets_sheet_type_check
		CHECK (sheet_type IN ('labor','vehicle','equipment','tunnel_employee','tunnel_vehicle','latest_timesheet'));
END $$;

-- 5b. Enforce numeric + unique Labour ID at DB level
-- Normalize existing values first (trim spaces)
UPDATE public.laborers
SET id_number = trim(id_number)
WHERE id_number IS DISTINCT FROM trim(id_number);

-- Stop migration if invalid data exists, so constraints do not fail silently
DO $$
DECLARE
	invalid_count int;
	duplicate_count int;
BEGIN
	SELECT count(*)
	INTO invalid_count
	FROM public.laborers
	WHERE coalesce(id_number, '') = ''
		OR id_number !~ '^[0-9]+$';

	IF invalid_count > 0 THEN
		RAISE EXCEPTION 'Cannot enforce labour ID constraints: % invalid id_number value(s) found (must be non-empty numeric).', invalid_count;
	END IF;

	SELECT count(*)
	INTO duplicate_count
	FROM (
		SELECT id_number
		FROM public.laborers
		GROUP BY id_number
		HAVING count(*) > 1
	) d;

	IF duplicate_count > 0 THEN
		RAISE EXCEPTION 'Cannot enforce labour ID uniqueness: % duplicate id_number group(s) found.', duplicate_count;
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'laborers_id_number_numeric_check'
			AND conrelid = 'public.laborers'::regclass
	) THEN
		ALTER TABLE public.laborers
			ADD CONSTRAINT laborers_id_number_numeric_check
			CHECK (id_number ~ '^[0-9]+$');
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS laborers_id_number_unique_idx ON public.laborers(id_number);

-- 14. Monthly salary sheet model used by salary-generation page
CREATE TABLE IF NOT EXISTS public.salary_sheets (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	month int NOT NULL CHECK (month BETWEEN 0 AND 11),
	year int NOT NULL,
	status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
	approved_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (month, year)
);

CREATE TABLE IF NOT EXISTS public.salary_sheet_entries (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	sheet_id uuid NOT NULL REFERENCES public.salary_sheets(id) ON DELETE CASCADE,
	laborer_id uuid NOT NULL REFERENCES public.laborers(id) ON DELETE CASCADE,
	labor_name text NOT NULL DEFAULT '',
	labor_code text NOT NULL DEFAULT '',
	designation text NOT NULL DEFAULT '',
	bank_name text NOT NULL DEFAULT '-',
	bank_account_number text NOT NULL DEFAULT '-',
	monthly_salary numeric(12,3) NOT NULL DEFAULT 0,
	actual_worked_hours numeric(10,3) NOT NULL DEFAULT 0,
	overtime_hours numeric(10,3) NOT NULL DEFAULT 0,
	total_worked_hours numeric(10,3) NOT NULL DEFAULT 0,
	hourly_rate numeric(12,6) NOT NULL DEFAULT 0,
	total_salary numeric(12,3) NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (sheet_id, laborer_id)
);

CREATE INDEX IF NOT EXISTS salary_sheets_month_year_idx ON public.salary_sheets(month, year);
CREATE INDEX IF NOT EXISTS salary_sheet_entries_sheet_idx ON public.salary_sheet_entries(sheet_id);

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'salary_sheets_updated_at') THEN
		CREATE TRIGGER salary_sheets_updated_at
		BEFORE UPDATE ON public.salary_sheets
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'salary_sheet_entries_updated_at') THEN
		CREATE TRIGGER salary_sheet_entries_updated_at
		BEFORE UPDATE ON public.salary_sheet_entries
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;
END $$;

ALTER TABLE public.salary_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_sheet_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_sheets' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.salary_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_sheet_entries' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.salary_sheet_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
END $$;

-- 6. Add operations/payroll fields to laborers
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS foreman_id uuid;
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS site_number text;
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS room_number text;
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS monthly_salary numeric(10,2);
ALTER TABLE public.laborers ADD COLUMN IF NOT EXISTS foreman_commission numeric(10,2) NOT NULL DEFAULT 0;

-- 7. Foremen table
CREATE TABLE IF NOT EXISTS public.foremen (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	laborer_id uuid,
	full_name text NOT NULL,
	id_number text NOT NULL DEFAULT '',
	phone text NOT NULL DEFAULT '',
	email text NOT NULL DEFAULT '',
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.foremen ADD COLUMN IF NOT EXISTS laborer_id uuid;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'foremen_laborer_id_fkey'
			AND conrelid = 'public.foremen'::regclass
	) THEN
		ALTER TABLE public.foremen
			ADD CONSTRAINT foremen_laborer_id_fkey
			FOREIGN KEY (laborer_id) REFERENCES public.laborers(id) ON DELETE SET NULL;
	END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS foremen_laborer_id_unique_idx
	ON public.foremen(laborer_id)
	WHERE laborer_id IS NOT NULL;

-- 7b. One-time backfill: link existing foremen to laborers by ID number.
-- Safe behavior:
-- - only links records where foremen.laborer_id is currently null
-- - only links non-empty ID numbers
-- - only links when match is 1 foreman <-> 1 laborer (unambiguous)
WITH normalized_foremen AS (
	SELECT id, upper(trim(id_number)) AS id_number_norm
	FROM public.foremen
	WHERE laborer_id IS NULL
		AND coalesce(trim(id_number), '') <> ''
),
normalized_laborers AS (
	SELECT id, upper(trim(id_number)) AS id_number_norm
	FROM public.laborers
	WHERE coalesce(trim(id_number), '') <> ''
),
candidate_matches AS (
	SELECT f.id AS foreman_id, l.id AS laborer_id
	FROM normalized_foremen f
	JOIN normalized_laborers l
		ON l.id_number_norm = f.id_number_norm
	WHERE NOT EXISTS (
		SELECT 1
		FROM public.foremen fx
		WHERE fx.laborer_id = l.id
	)
),
unique_per_foreman AS (
	SELECT foreman_id, min(laborer_id::text)::uuid AS laborer_id
	FROM candidate_matches
	GROUP BY foreman_id
	HAVING count(*) = 1
),
unique_per_laborer AS (
	SELECT laborer_id, min(foreman_id::text)::uuid AS foreman_id
	FROM candidate_matches
	GROUP BY laborer_id
	HAVING count(*) = 1
),
final_matches AS (
	SELECT uf.foreman_id, uf.laborer_id
	FROM unique_per_foreman uf
	JOIN unique_per_laborer ul
		ON ul.foreman_id = uf.foreman_id
		AND ul.laborer_id = uf.laborer_id
)
UPDATE public.foremen f
SET laborer_id = m.laborer_id
FROM final_matches m
WHERE f.id = m.foreman_id
	AND f.laborer_id IS NULL;

-- 8. Add laborers.foreman_id FK after foremen exists
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'laborers_foreman_id_fkey'
			AND conrelid = 'public.laborers'::regclass
	) THEN
		ALTER TABLE public.laborers
			ADD CONSTRAINT laborers_foreman_id_fkey
			FOREIGN KEY (foreman_id) REFERENCES public.foremen(id) ON DELETE SET NULL;
	END IF;
END $$;

-- 9. Remove labor advances model
DO $$
BEGIN
	IF to_regclass('public.labor_advances') IS NOT NULL THEN
		DROP POLICY IF EXISTS "auth_all" ON public.labor_advances;
		DROP TRIGGER IF EXISTS labor_advances_updated_at ON public.labor_advances;
		DROP INDEX IF EXISTS public.labor_advances_laborer_date_idx;
		DROP TABLE IF EXISTS public.labor_advances;
	END IF;
END $$;

-- 10. Remove legacy salary records model (replaced by salary_sheets + salary_sheet_entries)
DO $$
BEGIN
	IF to_regclass('public.salary_records') IS NOT NULL THEN
		DROP POLICY IF EXISTS "auth_all" ON public.salary_records;
		DROP TRIGGER IF EXISTS salary_records_updated_at ON public.salary_records;
		DROP INDEX IF EXISTS public.salary_records_laborer_month_year_idx;
		DROP INDEX IF EXISTS public.salary_records_month_year_idx;
		DROP TABLE IF EXISTS public.salary_records;
	END IF;
END $$;

-- 11. NPC invoices
CREATE TABLE IF NOT EXISTS public.npc_invoices (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	invoice_number text NOT NULL UNIQUE,
	invoice_date date NOT NULL,
	bill_to text NOT NULL,
	project text NOT NULL DEFAULT '',
	service_description text NOT NULL DEFAULT '',
	vat_percent numeric(5,2) NOT NULL DEFAULT 5,
	subtotal numeric(12,3) NOT NULL DEFAULT 0,
	vat_amount numeric(12,3) NOT NULL DEFAULT 0,
	total_amount numeric(12,3) NOT NULL DEFAULT 0,
	currency text NOT NULL DEFAULT 'OMR',
	notes text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.npc_invoice_items (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	invoice_id uuid NOT NULL REFERENCES public.npc_invoices(id) ON DELETE CASCADE,
	description text NOT NULL,
	working_hours numeric(10,2) NOT NULL DEFAULT 0,
	hourly_rate numeric(10,3) NOT NULL DEFAULT 0,
	amount numeric(12,3) NOT NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. updated_at triggers for new tables
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'foremen_updated_at') THEN
		CREATE TRIGGER foremen_updated_at BEFORE UPDATE ON public.foremen
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'npc_invoices_updated_at') THEN
		CREATE TRIGGER npc_invoices_updated_at BEFORE UPDATE ON public.npc_invoices
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;
END $$;

-- 13. RLS + policy for new tables
ALTER TABLE public.foremen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'foremen' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.foremen FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'npc_invoices' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.npc_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'npc_invoice_items' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.npc_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
END $$;

-- 14. Add day/night shift indicator used by the Latest Timesheet module
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS shift text;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'timesheets_shift_check'
	) THEN
		ALTER TABLE public.timesheets
			ADD CONSTRAINT timesheets_shift_check
			CHECK (shift IS NULL OR shift IN ('day','night'));
	END IF;
END $$;

-- 15. Add driver name field used by the Latest Timesheet module
ALTER TABLE public.timesheets ADD COLUMN IF NOT EXISTS driver_name text;

-- ============================================================
-- 16. VEHICLE LPO & SHIFT MANAGEMENT — PHASE 1: CORE SETUP
-- Roles/RBAC, vehicle type reconciliation, LPO shape
-- ============================================================

-- 16a. Roles
DO $$ BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
		CREATE TYPE public.user_role AS ENUM ('admin','operations');
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
	id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
	email      text,
	full_name  text,
	role       public.user_role NOT NULL DEFAULT 'operations',
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
	INSERT INTO public.profiles (id, email) VALUES (new.id, new.email)
	ON CONFLICT (id) DO NOTHING;
	RETURN new;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
	FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
	SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_or_admin" ON public.profiles;
CREATE POLICY "select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
	USING (id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "update_own_no_role_change" ON public.profiles;
CREATE POLICY "update_own_no_role_change" ON public.profiles FOR UPDATE TO authenticated
	USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
DROP POLICY IF EXISTS "admin_update_any" ON public.profiles;
CREATE POLICY "admin_update_any" ON public.profiles FOR UPDATE TO authenticated
	USING (public.is_admin());

-- Backfill profiles for any existing auth.users rows that predate the trigger
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 16b. Vehicle type reconciliation
CREATE TABLE IF NOT EXISTS public.vehicle_types (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	name text NOT NULL UNIQUE,
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all" ON public.vehicle_types;
CREATE POLICY "select_all" ON public.vehicle_types FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_write" ON public.vehicle_types;
CREATE POLICY "admin_write" ON public.vehicle_types FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update" ON public.vehicle_types;
CREATE POLICY "admin_update" ON public.vehicle_types FOR UPDATE TO authenticated USING (public.is_admin());

INSERT INTO public.vehicle_types (name) VALUES
	('Bob Cat'),('Bus'),('Crane'),('Diesel Tanker'),('Dozer'),('Excavator'),
	('Flat Bed'),('Forklift'),('Grader'),('Hiab'),('JCB'),('Low Bed'),
	('Manlift'),('Pick Up'),('Roller'),('Shovel'),('Six Wheel Truck'),
	('Tipper'),('Water Tanker'),('Other')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.machines ADD COLUMN IF NOT EXISTS vehicle_type_id uuid REFERENCES public.vehicle_types(id);

UPDATE public.machines m
SET vehicle_type_id = vt.id
FROM public.vehicle_types vt
WHERE m.category = 'vehicle' AND m.vehicle_type_id IS NULL AND m.type = vt.name;

-- 16c. LPOs (type-linked, count-based)
CREATE TABLE IF NOT EXISTS public.lpos (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	lpo_number text NOT NULL,
	vehicle_type_id uuid NOT NULL REFERENCES public.vehicle_types(id),
	quantity_total int NOT NULL CHECK (quantity_total > 0),
	quantity_used int NOT NULL DEFAULT 0 CHECK (quantity_used >= 0),
	status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending_renewal','closed')),
	valid_from date,
	valid_to date,
	notes text,
	created_by uuid REFERENCES auth.users(id),
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lpos_vehicle_type_status_idx ON public.lpos(vehicle_type_id, status);

CREATE TABLE IF NOT EXISTS public.lpo_renewals (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	lpo_id uuid NOT NULL REFERENCES public.lpos(id) ON DELETE CASCADE,
	added_quantity int NOT NULL CHECK (added_quantity > 0),
	previous_quantity_total int NOT NULL,
	new_quantity_total int NOT NULL,
	note text,
	created_by uuid REFERENCES auth.users(id),
	created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lpo_renewals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all" ON public.lpos;
CREATE POLICY "select_all" ON public.lpos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_write" ON public.lpos;
CREATE POLICY "admin_write" ON public.lpos FOR INSERT TO authenticated WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "admin_update" ON public.lpos;
CREATE POLICY "admin_update" ON public.lpos FOR UPDATE TO authenticated USING (public.is_admin());
DROP POLICY IF EXISTS "select_all" ON public.lpo_renewals;
CREATE POLICY "select_all" ON public.lpo_renewals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin_write" ON public.lpo_renewals;
CREATE POLICY "admin_write" ON public.lpo_renewals FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- ============================================================
-- 17. VEHICLE LPO & SHIFT MANAGEMENT — PHASE 2: SHIFT OPERATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.shifts (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	vehicle_id uuid NOT NULL REFERENCES public.machines(id),
	shift_date date NOT NULL,
	shift_type text NOT NULL CHECK (shift_type IN ('day','night')),
	start_at timestamptz NOT NULL,
	end_at timestamptz NOT NULL,
	break_minutes int NOT NULL DEFAULT 60,
	net_hours numeric(5,2) NOT NULL DEFAULT 10,
	driver_name_snapshot text,
	vehicle_type_snapshot text,
	vehicle_plate_snapshot text,
	lpo_id uuid REFERENCES public.lpos(id),
	lpo_number_snapshot text,
	overridden_driver boolean NOT NULL DEFAULT false,
	override_reason text,
	override_duplicate boolean NOT NULL DEFAULT false,
	status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','cancelled')),
	project_name text,
	supplier_name text,
	site_engineer_name text,
	remarks text,
	created_by uuid REFERENCES auth.users(id),
	approved_by uuid REFERENCES auth.users(id),
	approved_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shifts_vehicle_date_type_uq ON public.shifts(vehicle_id, shift_date, shift_type)
	WHERE status <> 'cancelled' AND NOT override_duplicate;
CREATE INDEX IF NOT EXISTS shifts_status_idx ON public.shifts(status);
CREATE INDEX IF NOT EXISTS shifts_lpo_idx ON public.shifts(lpo_id);

-- Snapshot driver/vehicle-type/plate/LPO-number at insert time so historical
-- shifts never silently change meaning if the vehicle/driver/LPO record changes later.
CREATE OR REPLACE FUNCTION public.snapshot_shift_fields() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
	m record;
	l record;
BEGIN
	SELECT type, operator_name, plate_number INTO m FROM public.machines WHERE id = new.vehicle_id;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'Vehicle % not found', new.vehicle_id;
	END IF;
	new.vehicle_type_snapshot := m.type;
	new.driver_name_snapshot := COALESCE(new.driver_name_snapshot, m.operator_name);
	new.vehicle_plate_snapshot := m.plate_number;

	IF new.lpo_id IS NOT NULL THEN
		SELECT lpo_number INTO l FROM public.lpos WHERE id = new.lpo_id;
		new.lpo_number_snapshot := l.lpo_number;
	END IF;

	RETURN new;
END; $$;

DROP TRIGGER IF EXISTS before_insert_shift_snapshot ON public.shifts;
CREATE TRIGGER before_insert_shift_snapshot BEFORE INSERT ON public.shifts
	FOR EACH ROW EXECUTE PROCEDURE public.snapshot_shift_fields();

-- Deduct/restore 1 unit from the linked LPO's quantity_used when a shift's
-- status transitions into/out of 'approved'.
CREATE OR REPLACE FUNCTION public.adjust_lpo_balance() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
	IF new.status = 'approved' AND old.status <> 'approved' AND new.lpo_id IS NOT NULL THEN
		UPDATE public.lpos SET quantity_used = quantity_used + 1, updated_at = now() WHERE id = new.lpo_id;
	ELSIF old.status = 'approved' AND new.status <> 'approved' AND old.lpo_id IS NOT NULL THEN
		UPDATE public.lpos SET quantity_used = GREATEST(quantity_used - 1, 0), updated_at = now() WHERE id = old.lpo_id;
	END IF;
	RETURN new;
END; $$;

DROP TRIGGER IF EXISTS after_update_shift_adjust_lpo ON public.shifts;
CREATE TRIGGER after_update_shift_adjust_lpo AFTER UPDATE ON public.shifts
	FOR EACH ROW EXECUTE PROCEDURE public.adjust_lpo_balance();

-- Flip LPO status between active/pending_renewal whenever its balance changes.
CREATE OR REPLACE FUNCTION public.update_lpo_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
	IF new.quantity_used >= new.quantity_total AND new.status = 'active' THEN
		new.status := 'pending_renewal';
	ELSIF new.quantity_used < new.quantity_total AND new.status = 'pending_renewal' THEN
		new.status := 'active';
	END IF;
	RETURN new;
END; $$;

DROP TRIGGER IF EXISTS before_update_lpo_status ON public.lpos;
CREATE TRIGGER before_update_lpo_status BEFORE UPDATE ON public.lpos
	FOR EACH ROW EXECUTE PROCEDURE public.update_lpo_status();

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_all" ON public.shifts;
CREATE POLICY "select_all" ON public.shifts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_shifts" ON public.shifts;
CREATE POLICY "insert_shifts" ON public.shifts FOR INSERT TO authenticated
	WITH CHECK (override_duplicate = false OR public.is_admin());
DROP POLICY IF EXISTS "update_non_approved_or_admin" ON public.shifts;
CREATE POLICY "update_non_approved_or_admin" ON public.shifts FOR UPDATE TO authenticated
	USING (status <> 'approved' OR public.is_admin())
	WITH CHECK (public.is_admin() OR status IN ('draft','submitted','cancelled'));
