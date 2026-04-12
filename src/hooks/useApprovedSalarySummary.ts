import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface ApprovedSalarySummaryRow {
  id: string;
  labor_name: string;
  month: number;
  year: number;
  net_salary: number;
  status: 'approved';
}

interface SheetLite {
  id: string;
  month: number;
  year: number;
}

interface EntryLite {
  id: string;
  sheet_id: string;
  labor_name: string;
  total_salary: number;
  deduction: number;
}

export function useApprovedSalarySummary(limit = 6) {
  const [salaryRows, setSalaryRows] = useState<ApprovedSalarySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: sheetsData, error: sheetsError } = await supabase
      .from('salary_sheets')
      .select('id, month, year')
      .eq('status', 'approved')
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(6);

    if (sheetsError) {
      setError(sheetsError.message);
      setSalaryRows([]);
      setLoading(false);
      return;
    }

    const sheets = (sheetsData ?? []) as SheetLite[];
    if (!sheets.length) {
      setSalaryRows([]);
      setLoading(false);
      return;
    }

    const sheetMap = new Map(sheets.map((sheet) => [sheet.id, sheet]));
    const { data: entriesData, error: entriesError } = await supabase
      .from('salary_sheet_entries')
      .select('id, sheet_id, labor_name, total_salary, deduction')
      .in('sheet_id', sheets.map((sheet) => sheet.id));

    if (entriesError) {
      setError(entriesError.message);
      setSalaryRows([]);
      setLoading(false);
      return;
    }

    const rows = ((entriesData ?? []) as EntryLite[])
      .map((entry) => {
        const sheet = sheetMap.get(entry.sheet_id);
        if (!sheet) return null;
        return {
          id: entry.id,
          labor_name: entry.labor_name || '-',
          month: sheet.month,
          year: sheet.year,
          net_salary: Number(entry.total_salary || 0) - Number(entry.deduction || 0),
          status: 'approved' as const,
        };
      })
      .filter((item): item is ApprovedSalarySummaryRow => !!item)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        if (a.month !== b.month) return b.month - a.month;
        return b.net_salary - a.net_salary;
      })
      .slice(0, limit);

    setSalaryRows(rows);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { salaryRows, loading, error, refetch: fetch };
}
