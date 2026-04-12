import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface SalaryPerMonthReport {
  month: number;
  year: number;
  totalSalaries: number;
  employeeCount: number;
  averageSalary: number;
  salaryDetails: Array<{
    salary_id: string;
    laborer_id: string;
    full_name: string;
    designation: string;
    gross_salary: number;
    overtime_hours: number;
    deduction: number;
    net_salary: number;
    status: string;
  }>;
}

export function useSalaryPerMonth(month: number, year: number) {
  const [report, setReport] = useState<SalaryPerMonthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: sheetData, error: sheetError } = await supabase
        .from('salary_sheets')
        .select('id')
        .eq('month', month)
        .eq('year', year)
        .eq('status', 'approved')
        .maybeSingle();

      if (sheetError) throw sheetError;

      if (!sheetData) {
        setReport({
          month,
          year,
          totalSalaries: 0,
          employeeCount: 0,
          averageSalary: 0,
          salaryDetails: [],
        });
        return;
      }

      const { data, error: err } = await supabase
        .from('salary_sheet_entries')
        .select('id, laborer_id, labor_name, designation, total_salary, overtime_hours, deduction')
        .eq('sheet_id', sheetData.id)
        .order('labor_name', { ascending: true });

      if (err) throw err;

      const salaryDetails = (data || []).map((sr: any) => ({
        salary_id: sr.id,
        laborer_id: sr.laborer_id,
        full_name: sr.labor_name || 'Unknown',
        designation: sr.designation || 'Unspecified',
        gross_salary: Number(sr.total_salary || 0),
        overtime_hours: sr.overtime_hours || 0,
        deduction: Number(sr.deduction || 0),
        net_salary: Number(sr.total_salary || 0) - Number(sr.deduction || 0),
        status: 'approved',
      }));

      const totalSalaries = salaryDetails.reduce((sum, sd) => sum + sd.net_salary, 0);
      const avgSalary = salaryDetails.length > 0 ? totalSalaries / salaryDetails.length : 0;

      setReport({
        month,
        year,
        totalSalaries,
        employeeCount: salaryDetails.length,
        averageSalary: avgSalary,
        salaryDetails,
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
