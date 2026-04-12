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

-- 5. Ensure sheet_type only allows supported values
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'timesheets_sheet_type_check'
			AND conrelid = 'public.timesheets'::regclass
	) THEN
		ALTER TABLE public.timesheets
			ADD CONSTRAINT timesheets_sheet_type_check
			CHECK (sheet_type IN ('labor','vehicle','equipment'));
	END IF;
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
