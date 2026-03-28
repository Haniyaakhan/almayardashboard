'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Timesheet } from '@/types/database';

export function useApprovedLaborTimesheets(month?: number, year?: number) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('timesheets')
      .select('id, laborer_id, sheet_type, labor_name, month, year, project_name, supplier_name, site_engineer_name, designation, total_worked, total_ot, total_actual, status, created_at, updated_at')
      .eq('status', 'approved')
      .eq('sheet_type', 'labor')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .order('created_at', { ascending: false });

    if (typeof month === 'number') q = q.eq('month', month);
    if (typeof year === 'number') q = q.eq('year', year);

    const { data } = await q;
    setTimesheets((data ?? []) as Timesheet[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);
  return { timesheets, loading, refetch: fetch };
}
