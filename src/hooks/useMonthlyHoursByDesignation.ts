import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';

export interface MonthlyHoursByDesignation {
  month: number;
  year: number;
  designations: Array<{
    designation: string;
    totalHours: number;
    employeeCount: number;
  }>;
}

export function useMonthlyHoursByDesignation(month: number, year: number) {
  const [report, setReport] = useState<MonthlyHoursByDesignation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('timesheets')
        .select('designation, total_actual, laborer_id, labor_name')
        .eq('month', month)
        .eq('year', year)
        .eq('sheet_type', 'labor');

      if (err) throw err;

      // Group by normalized designation and count unique workers in that designation.
      const grouped: { [key: string]: { hours: number; workers: Set<string> } } = {};
      
      (data || []).forEach(ts => {
        const designationKey = normalizeDesignationKey(ts.designation);
        if (!grouped[designationKey]) {
          grouped[designationKey] = { hours: 0, workers: new Set() };
        }

        grouped[designationKey].hours += Number(ts.total_actual) || 0;

        const workerKey = (ts.laborer_id || ts.labor_name || '').toString().trim();
        if (workerKey) {
          grouped[designationKey].workers.add(workerKey.toLowerCase());
        }
      });

      const designations = Object.entries(grouped).map(([designationKey, { hours, workers }]) => ({
        designation: toDisplayDesignation(designationKey),
        totalHours: hours,
        employeeCount: workers.size,
      }));

      setReport({
        month,
        year,
        designations: designations.sort((a, b) => b.totalHours - a.totalHours),
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  return { report, loading, error, refetch: fetchReport };
}
