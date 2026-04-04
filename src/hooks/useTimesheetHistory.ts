'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types/database';

function isApprovedStatus(status?: string | null) {
  return (status ?? '').toLowerCase() === 'approved';
}

export function useTimesheetHistory(laborerId?: string, limit?: number) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('timesheets')
      .select('id, laborer_id, sheet_type, labor_name, month, year, project_name, supplier_name, site_engineer_name, designation, total_worked, total_ot, total_actual, status, created_at, updated_at')
      .order('year', { ascending: false }).order('month', { ascending: false });
    if (laborerId) q = q.eq('laborer_id', laborerId);
    if (limit) q = q.limit(limit);
    const { data } = await q;
    setTimesheets((data ?? []) as Timesheet[]);
    setLoading(false);
  }, [laborerId, limit]);

  useEffect(() => { fetch(); }, [fetch]);
  return { timesheets, loading, refetch: fetch };
}

export async function getTimesheetWithEntries(id: string): Promise<Timesheet | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('timesheets')
    .select('*, entries:timesheet_entries(*)')
    .eq('id', id).single();
  return data as Timesheet | null;
}

export async function getTimesheetByLaborer(laborerId: string, month: number, year: number): Promise<Timesheet | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('timesheets')
    .select('*, entries:timesheet_entries(*)')
    .eq('laborer_id', laborerId)
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false })
    .limit(1);
  return (data && data.length > 0 ? data[0] : null) as Timesheet | null;
}

export async function approveTimesheet(id: string): Promise<Error | null> {
  const supabase = createClient();
  const { error } = await supabase.from('timesheets').update({ status: 'approved' }).eq('id', id);
  return error;
}

export async function deleteTimesheet(id: string): Promise<Error | null> {
  const supabase = createClient();
  await supabase.from('timesheet_entries').delete().eq('timesheet_id', id);
  const { error } = await supabase.from('timesheets').delete().eq('id', id);
  return error;
}

export async function countTimesheetsForEntity(entityId: string, month: number, year: number): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('timesheets')
    .select('*', { count: 'exact', head: true })
    .eq('laborer_id', entityId)
    .eq('month', month)
    .eq('year', year);
  return count ?? 0;
}

export async function saveTimesheet(payload: {
  timesheetId?: string | null;   // pass to update a specific existing record (vehicle/equipment edits)
  laborer_id: string | null;
  sheet_type?: 'labor' | 'vehicle' | 'equipment';
  labor_name?: string;
  month: number; year: number;
  project_name: string; supplier_name: string;
  site_engineer_name: string; designation: string;
  total_worked: number; total_ot: number; total_actual: number;
  entries: Array<{
    day: number; time_in: string; time_out_lunch: string; lunch_break: string;
    time_in_2: string; time_out_2: string; total_duration: number;
    over_time: number; actual_worked: number; approver_sig: string; remarks: string;
  }>;
}) {
  const supabase = createClient();
  const { entries, timesheetId, ...header } = payload;

  let tsId: string;

  if (timesheetId) {
    // Edit a specific existing timesheet (used by vehicle/equipment edits)
    const { data: existingTs } = await supabase
      .from('timesheets')
      .select('id, status')
      .eq('id', timesheetId)
      .maybeSingle();

    if (isApprovedStatus(existingTs?.status)) {
      return new Error('Approved timesheets cannot be edited');
    }

    const { data: ts, error: tsErr } = await supabase
      .from('timesheets').update(header).eq('id', timesheetId).select().single();
    if (tsErr || !ts) return tsErr ?? new Error('Failed to update timesheet');
    tsId = ts.id;
  } else if (payload.sheet_type === 'labor' && payload.laborer_id) {
    // Labour: 1 per person per month — find existing and update, or insert
    const { data: existing } = await supabase
      .from('timesheets').select('id, status')
      .eq('laborer_id', payload.laborer_id)
      .eq('month', payload.month)
      .eq('year', payload.year)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (isApprovedStatus(existing.status)) {
        return new Error('Approved timesheets cannot be edited');
      }

      const { data: ts, error: tsErr } = await supabase
        .from('timesheets').update(header).eq('id', existing.id).select().single();
      if (tsErr || !ts) return tsErr ?? new Error('Failed to update timesheet');
      tsId = ts.id;
    } else {
      const { data: ts, error: tsErr } = await supabase
        .from('timesheets').insert(header).select().single();
      if (tsErr || !ts) return tsErr ?? new Error('Failed to save timesheet');
      tsId = ts.id;
    }
  } else {
    // Vehicle/equipment new insert (count-limit already validated by caller)
    const { data: ts, error: tsErr } = await supabase
      .from('timesheets').insert(header).select().single();
    if (tsErr || !ts) return tsErr ?? new Error('Failed to save timesheet');
    tsId = ts.id;
  }

  await supabase.from('timesheet_entries').delete().eq('timesheet_id', tsId);
  const { error: entErr } = await supabase.from('timesheet_entries').insert(
    entries.map(e => ({ ...e, timesheet_id: tsId }))
  );
  return entErr;
}
