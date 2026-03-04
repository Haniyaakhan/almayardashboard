'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types/database';

export function useTimesheetHistory(laborerId?: string) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('timesheets').select('*, laborer:laborers(full_name, designation)').order('year', { ascending: false }).order('month', { ascending: false });
    if (laborerId) q = q.eq('laborer_id', laborerId);
    const { data } = await q;
    setTimesheets((data ?? []) as Timesheet[]);
    setLoading(false);
  }, [laborerId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { timesheets, loading, refetch: fetch };
}

export async function getTimesheetWithEntries(id: string): Promise<Timesheet | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('timesheets')
    .select('*, laborer:laborers(*), entries:timesheet_entries(*)')
    .eq('id', id).single();
  return data as Timesheet | null;
}

export async function saveTimesheet(payload: {
  laborer_id: string | null;
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
  const { entries, ...header } = payload;

  const { data: ts, error: tsErr } = await supabase
    .from('timesheets').upsert(header, {
      onConflict: payload.laborer_id ? 'laborer_id,month,year' : undefined,
    }).select().single();

  if (tsErr || !ts) return tsErr ?? new Error('Failed to save timesheet');

  await supabase.from('timesheet_entries').delete().eq('timesheet_id', ts.id);
  const { error: entErr } = await supabase.from('timesheet_entries').insert(
    entries.map(e => ({ ...e, timesheet_id: ts.id }))
  );
  return entErr;
}
