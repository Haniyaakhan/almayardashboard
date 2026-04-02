import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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
        .select('designation, total_actual')
        .eq('month', month)
        .eq('year', year)
        .eq('sheet_type', 'labor');

      if (err) throw err;

      // Group by designation
      const grouped: { [key: string]: { hours: number; count: Set<string> } } = {};
      
      (data || []).forEach(ts => {
        if (!grouped[ts.designation]) {
          grouped[ts.designation] = { hours: 0, count: new Set() };
        }
        grouped[ts.designation].hours += ts.total_actual || 0;
        grouped[ts.designation].count.add(ts.designation); // Use for counting unique entries
      });

      const designations = Object.entries(grouped).map(([designation, { hours, count }]) => ({
        designation: designation || 'Unspecified',
        totalHours: hours,
        employeeCount: count.size,
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
