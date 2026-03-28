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
	full_name text NOT NULL,
	id_number text NOT NULL DEFAULT '',
	phone text NOT NULL DEFAULT '',
	email text NOT NULL DEFAULT '',
	is_active boolean NOT NULL DEFAULT true,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

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

-- 9. Labor advances
CREATE TABLE IF NOT EXISTS public.labor_advances (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	laborer_id uuid NOT NULL REFERENCES public.laborers(id) ON DELETE CASCADE,
	advance_date date NOT NULL,
	amount numeric(10,2) NOT NULL CHECK (amount >= 0),
	notes text,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS labor_advances_laborer_date_idx ON public.labor_advances(laborer_id, advance_date);

-- 10. Salary records (computed from approved labor timesheets only)
CREATE TABLE IF NOT EXISTS public.salary_records (
	id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
	laborer_id uuid NOT NULL REFERENCES public.laborers(id) ON DELETE CASCADE,
	timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
	month int NOT NULL CHECK (month between 0 and 11),
	year int NOT NULL,
	regular_hours numeric(8,2) NOT NULL DEFAULT 0,
	overtime_hours numeric(8,2) NOT NULL DEFAULT 0,
	total_worked_hours numeric(8,2) NOT NULL DEFAULT 0,
	hourly_rate numeric(10,4) NOT NULL DEFAULT 0,
	basic_salary numeric(10,2) NOT NULL DEFAULT 0,
	advances_amount numeric(10,2) NOT NULL DEFAULT 0,
	foreman_commission numeric(10,2) NOT NULL DEFAULT 0,
	net_salary numeric(10,2) NOT NULL DEFAULT 0,
	status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
	approved_at timestamptz,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (timesheet_id)
);
CREATE INDEX IF NOT EXISTS salary_records_month_year_idx ON public.salary_records(month, year);
CREATE INDEX IF NOT EXISTS salary_records_laborer_month_year_idx ON public.salary_records(laborer_id, month, year);

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

	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'labor_advances_updated_at') THEN
		CREATE TRIGGER labor_advances_updated_at BEFORE UPDATE ON public.labor_advances
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'salary_records_updated_at') THEN
		CREATE TRIGGER salary_records_updated_at BEFORE UPDATE ON public.salary_records
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'npc_invoices_updated_at') THEN
		CREATE TRIGGER npc_invoices_updated_at BEFORE UPDATE ON public.npc_invoices
		FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
	END IF;
END $$;

-- 13. RLS + policy for new tables
ALTER TABLE public.foremen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.npc_invoice_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'foremen' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.foremen FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'labor_advances' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.labor_advances FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'salary_records' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.salary_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'npc_invoices' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.npc_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
	IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'npc_invoice_items' AND policyname = 'auth_all') THEN
		CREATE POLICY "auth_all" ON public.npc_invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
	END IF;
END $$;
