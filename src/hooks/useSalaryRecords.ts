'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SalaryRecord } from '@/types/database';

export function useSalaryRecords(month?: number, year?: number) {
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('salary_records')
      .select('*, laborer:laborers(*), timesheet:timesheets(*)')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('created_at', { ascending: false });

    if (typeof month === 'number') q = q.eq('month', month);
    if (typeof year === 'number') q = q.eq('year', year);

    const { data, error } = await q;
    if (error) setError(error.message);
    else setSalaryRecords((data ?? []) as SalaryRecord[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);
  return { salaryRecords, loading, error, refetch: fetch };
}

export async function upsertSalaryRecord(data: {
  laborer_id: string;
  timesheet_id: string;
  month: number;
  year: number;
  regular_hours: number;
  overtime_hours: number;
  total_worked_hours: number;
  hourly_rate: number;
  basic_salary: number;
  advances_amount: number;
  foreman_commission: number;
  net_salary: number;
}) {
  const supabase = createClient();

  const payload = {
    ...data,
    status: 'draft' as const,
    approved_at: null,
  };

  const { error } = await supabase
    .from('salary_records')
    .upsert(payload, { onConflict: 'timesheet_id' });

  return error;
}

export async function approveSalaryRecord(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('salary_records')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', id);
  return error;
}
