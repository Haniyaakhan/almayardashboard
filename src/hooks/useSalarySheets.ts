'use client';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Laborer, SalarySheet, SalarySheetEntry } from '@/types/database';

type Mode = 'db' | 'local';

type LocalSalarySheetStore = Record<string, { sheet: SalarySheet; entries: SalarySheetEntry[] }>;

const LOCAL_STORE_KEY = 'salary-sheet-local-store-v1';

function monthStoreKey(month: number, year: number) {
  return `${year}-${month}`;
}

function localSheetId(month: number, year: number) {
  return `local-${year}-${month}`;
}

function parseLocalSheetId(sheetId: string): { year: number; month: number } | null {
  const match = /^local-(\d+)-(\d+)$/.exec(sheetId);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function parseLocalEntryId(entryId: string): { year: number; month: number } | null {
  const match = /^local-(\d+)-(\d+)-/.exec(entryId);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) };
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function readLocalStore(): LocalSalarySheetStore {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = window.localStorage.getItem(LOCAL_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalSalarySheetStore;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function writeLocalStore(store: LocalSalarySheetStore) {
  if (!canUseLocalStorage()) return;
  window.localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
}

function localFallbackMessage() {
  return 'Salary DB tables are missing. Running in local mode until migration is applied.';
}

function isMissingSalaryTableError(err: any) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '');
  return code === '42P01' || msg.includes('salary_sheets') || msg.includes('salary_sheet_entries');
}

type UpsertEntryInput = {
  sheetId: string;
  laborer: Laborer;
  monthlySalary: number;
  actualWorkedHours: number;
  deduction?: number;
};

function calc(monthlySalary: number, actualWorkedHours: number) {
  const safeSalary = Number(monthlySalary) || 0;
  const safeActualHours = Number(actualWorkedHours) || 0;
  const totalWorkedHours = Math.min(safeActualHours, 260);
  const overtimeHours = Math.max(safeActualHours - 260, 0);
  const hourlyRate = safeSalary / 260;
  const totalSalary = hourlyRate * safeActualHours;

  return {
    monthlySalary: safeSalary,
    actualWorkedHours: safeActualHours,
    totalWorkedHours,
    overtimeHours,
    hourlyRate,
    totalSalary,
  };
}

export function useSalarySheet(month: number, year: number) {
  const [sheet, setSheet] = useState<SalarySheet | null>(null);
  const [entries, setEntries] = useState<SalarySheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<Mode>('db');

  const loadFromLocal = useCallback(() => {
    const store = readLocalStore();
    const key = monthStoreKey(month, year);
    const now = new Date().toISOString();

    if (!store[key]) {
      store[key] = {
        sheet: {
          id: localSheetId(month, year),
          month,
          year,
          status: 'draft',
          approved_at: null,
          created_at: now,
          updated_at: now,
        },
        entries: [],
      };
      writeLocalStore(store);
    }

    setMode('local');
    setError(localFallbackMessage());
    setSheet(store[key].sheet);
    setEntries([...store[key].entries].sort((a, b) => a.labor_name.localeCompare(b.labor_name)));
    setLoading(false);
  }, [month, year]);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { data: existingSheet, error: sheetError } = await supabase
      .from('salary_sheets')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (sheetError) {
      if (isMissingSalaryTableError(sheetError)) {
        loadFromLocal();
        return;
      }
      setError(sheetError.message);
      setLoading(false);
      return;
    }

    let effectiveSheet = existingSheet as SalarySheet | null;

    if (!effectiveSheet) {
      const { data: createdSheet, error: createError } = await supabase
        .from('salary_sheets')
        .insert({ month, year, status: 'draft' })
        .select('*')
        .single();

      if (createError) {
        if (isMissingSalaryTableError(createError)) {
          loadFromLocal();
          return;
        }
        setError(createError.message);
        setLoading(false);
        return;
      }

      effectiveSheet = createdSheet as SalarySheet;
    }

    const { data: sheetEntries, error: entriesError } = await supabase
      .from('salary_sheet_entries')
      .select('*')
      .eq('sheet_id', effectiveSheet.id)
      .order('labor_name', { ascending: true });

    if (entriesError) {
      if (isMissingSalaryTableError(entriesError)) {
        loadFromLocal();
        return;
      }
      setError(entriesError.message);
      setLoading(false);
      return;
    }

    setMode('db');
    setSheet(effectiveSheet);
    setEntries((sheetEntries ?? []) as SalarySheetEntry[]);
    setLoading(false);
  }, [loadFromLocal, month, year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { sheet, entries, loading, error, mode, refetch, setEntries };
}

export async function upsertSalarySheetEntry(input: UpsertEntryInput) {
  const supabase = createClient();
  const computed = calc(input.monthlySalary, input.actualWorkedHours);

  const localMeta = parseLocalSheetId(input.sheetId);
  if (localMeta) {
    const key = monthStoreKey(localMeta.month, localMeta.year);
    const store = readLocalStore();
    const now = new Date().toISOString();
    const entryId = `local-${localMeta.year}-${localMeta.month}-${input.laborer.id}`;

    if (!store[key]) {
      store[key] = {
        sheet: {
          id: input.sheetId,
          month: localMeta.month,
          year: localMeta.year,
          status: 'draft',
          approved_at: null,
          created_at: now,
          updated_at: now,
        },
        entries: [],
      };
    }

    const nextEntry: SalarySheetEntry = {
      id: entryId,
      sheet_id: input.sheetId,
      laborer_id: input.laborer.id,
      labor_name: input.laborer.full_name || '-',
      labor_code: input.laborer.id_number || input.laborer.id,
      designation: input.laborer.designation || 'Unspecified',
      bank_name: input.laborer.bank_name || '-',
      bank_account_number: input.laborer.bank_account_number || '-',
      monthly_salary: computed.monthlySalary,
      actual_worked_hours: computed.actualWorkedHours,
      overtime_hours: computed.overtimeHours,
      total_worked_hours: computed.totalWorkedHours,
      hourly_rate: computed.hourlyRate,
      total_salary: computed.totalSalary,
      deduction: Number(input.deduction ?? 0),
      created_at: now,
      updated_at: now,
    };

    const idx = store[key].entries.findIndex((entry) => entry.id === entryId);
    if (idx >= 0) store[key].entries[idx] = { ...store[key].entries[idx], ...nextEntry, updated_at: now };
    else store[key].entries.push(nextEntry);

    store[key].sheet.updated_at = now;
    writeLocalStore(store);
    return null;
  }

  const payload = {
    sheet_id: input.sheetId,
    laborer_id: input.laborer.id,
    labor_name: input.laborer.full_name || '-',
    labor_code: input.laborer.id_number || input.laborer.id,
    designation: input.laborer.designation || 'Unspecified',
    bank_name: input.laborer.bank_name || '-',
    bank_account_number: input.laborer.bank_account_number || '-',
    monthly_salary: computed.monthlySalary,
    actual_worked_hours: computed.actualWorkedHours,
    overtime_hours: computed.overtimeHours,
    total_worked_hours: computed.totalWorkedHours,
    hourly_rate: computed.hourlyRate,
    total_salary: computed.totalSalary,
    deduction: Number(input.deduction ?? 0),
  };

  const { error } = await supabase
    .from('salary_sheet_entries')
    .upsert(payload, { onConflict: 'sheet_id,laborer_id' });

  if (error && isMissingSalaryTableError(error)) {
    return { message: localFallbackMessage() };
  }

  return error;
}

export async function updateSalarySheetEntry(entryId: string, input: { monthlySalary: number; actualWorkedHours: number; deduction?: number }) {
  const supabase = createClient();
  const computed = calc(input.monthlySalary, input.actualWorkedHours);

  const localMeta = parseLocalEntryId(entryId);
  if (localMeta) {
    const key = monthStoreKey(localMeta.month, localMeta.year);
    const store = readLocalStore();
    const now = new Date().toISOString();
    const row = store[key]?.entries.find((entry) => entry.id === entryId);
    if (!row) return null;

    row.monthly_salary = computed.monthlySalary;
    row.actual_worked_hours = computed.actualWorkedHours;
    row.overtime_hours = computed.overtimeHours;
    row.total_worked_hours = computed.totalWorkedHours;
    row.hourly_rate = computed.hourlyRate;
    row.total_salary = computed.totalSalary;
    row.deduction = Number(input.deduction ?? 0);
    row.updated_at = now;
    if (store[key]?.sheet) store[key].sheet.updated_at = now;

    writeLocalStore(store);
    return null;
  }

  const { error } = await supabase
    .from('salary_sheet_entries')
    .update({
      monthly_salary: computed.monthlySalary,
      actual_worked_hours: computed.actualWorkedHours,
      overtime_hours: computed.overtimeHours,
      total_worked_hours: computed.totalWorkedHours,
      hourly_rate: computed.hourlyRate,
      total_salary: computed.totalSalary,
      deduction: Number(input.deduction ?? 0),
    })
    .eq('id', entryId);

  if (error && isMissingSalaryTableError(error)) {
    return { message: localFallbackMessage() };
  }

  return error;
}

export async function deleteSalarySheetEntry(entryId: string) {
  const supabase = createClient();

  const localMeta = parseLocalEntryId(entryId);
  if (localMeta) {
    const key = monthStoreKey(localMeta.month, localMeta.year);
    const store = readLocalStore();
    if (store[key]) {
      store[key].entries = store[key].entries.filter((entry) => entry.id !== entryId);
      store[key].sheet.updated_at = new Date().toISOString();
      writeLocalStore(store);
    }
    return null;
  }

  const { error } = await supabase
    .from('salary_sheet_entries')
    .delete()
    .eq('id', entryId);

  if (error && isMissingSalaryTableError(error)) {
    return { message: localFallbackMessage() };
  }

  return error;
}

export async function clearSalarySheetEntries(sheetId: string) {
  const supabase = createClient();

  const localMeta = parseLocalSheetId(sheetId);
  if (localMeta) {
    const key = monthStoreKey(localMeta.month, localMeta.year);
    const store = readLocalStore();
    if (store[key]) {
      store[key].entries = [];
      store[key].sheet.updated_at = new Date().toISOString();
      writeLocalStore(store);
    }
    return null;
  }

  const { error } = await supabase
    .from('salary_sheet_entries')
    .delete()
    .eq('sheet_id', sheetId);

  if (error && isMissingSalaryTableError(error)) {
    return { message: localFallbackMessage() };
  }

  return error;
}

export async function approveSalarySheet(sheetId: string) {
  const supabase = createClient();

  const localMeta = parseLocalSheetId(sheetId);
  if (localMeta) {
    const key = monthStoreKey(localMeta.month, localMeta.year);
    const store = readLocalStore();
    if (store[key]) {
      store[key].sheet.status = 'approved';
      store[key].sheet.approved_at = new Date().toISOString();
      store[key].sheet.updated_at = new Date().toISOString();
      writeLocalStore(store);
    }
    return null;
  }

  const { error } = await supabase
    .from('salary_sheets')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', sheetId);

  if (error && isMissingSalaryTableError(error)) {
    return { message: localFallbackMessage() };
  }

  return error;
}

export async function seedSalaryDemoLaborers() {
  const supabase = createClient();

  const samples = [
    { id_number: 'LBR-001', full_name: 'Aamir Khan', designation: 'Operator', monthly_salary: 380 },
    { id_number: 'LBR-002', full_name: 'Bilal Ahmed', designation: 'Helper', monthly_salary: 220 },
    { id_number: 'LBR-003', full_name: 'Chandan Roy', designation: 'Supervisor', monthly_salary: 520 },
    { id_number: 'LBR-004', full_name: 'Deepak Singh', designation: 'Technician', monthly_salary: 460 },
    { id_number: 'LBR-005', full_name: 'Ehsan Ullah', designation: 'Driver', monthly_salary: 300 },
    { id_number: 'LBR-006', full_name: 'Faisal Raza', designation: 'Operator', monthly_salary: 400 },
    { id_number: 'LBR-007', full_name: 'Girish Kumar', designation: 'Helper', monthly_salary: 210 },
    { id_number: 'LBR-008', full_name: 'Haroon Ali', designation: 'Technician', monthly_salary: 470 },
  ];

  const ids = samples.map((sample) => sample.id_number);
  const { data: existing, error: existingError } = await supabase
    .from('laborers')
    .select('id_number')
    .in('id_number', ids);

  if (existingError) return existingError;

  const existingSet = new Set((existing ?? []).map((item) => item.id_number));
  const toInsert = samples
    .filter((sample) => !existingSet.has(sample.id_number))
    .map((sample) => ({
      full_name: sample.full_name,
      designation: sample.designation,
      supplier_name: 'Salary Demo',
      id_number: sample.id_number,
      nationality: 'N/A',
      phone: '',
      daily_rate: null,
      foreman_id: null,
      site_number: null,
      room_number: null,
      start_date: null,
      monthly_salary: sample.monthly_salary,
      foreman_commission: 0,
      is_active: true,
      notes: 'Auto seeded from salary generation module',
      front_photo: null,
      back_photo: null,
      bank_name: 'Bank Muscat',
      bank_account_number: `OMR-${sample.id_number}`,
    }));

  if (!toInsert.length) return null;

  const { error } = await supabase
    .from('laborers')
    .insert(toInsert);

  return error;
}
