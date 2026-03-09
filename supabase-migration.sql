-- ============================================================
-- MIGRATION: Run this in Supabase → SQL Editor → New query
-- ============================================================

-- 1. Remove FK constraint on timesheets.laborer_id
--    This allows machine UUIDs to be stored (vehicle/equipment timesheets)
ALTER TABLE public.timesheets DROP CONSTRAINT IF EXISTS timesheets_laborer_id_fkey;

-- 2. Add company_phone field to vendors
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS company_phone text NOT NULL DEFAULT '';
