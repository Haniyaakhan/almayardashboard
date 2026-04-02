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
    basic_salary: number;
    overtime_hours: number;
    advances_amount: number;
    foreman_commission: number;
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
      const { data, error: err } = await supabase
        .from('salary_records')
        .select('id, laborer_id, basic_salary, overtime_hours, advances_amount, foreman_commission, net_salary, status, laborer:laborers(full_name, designation)')
        .eq('month', month)
        .eq('year', year)
        .order('net_salary', { ascending: false });

      if (err) throw err;

      const salaryDetails = (data || []).map((sr: any) => ({
        salary_id: sr.id,
        laborer_id: sr.laborer_id,
        full_name: sr.laborer?.full_name || 'Unknown',
        designation: sr.laborer?.designation || 'Unspecified',
        basic_salary: sr.basic_salary || 0,
        overtime_hours: sr.overtime_hours || 0,
        advances_amount: sr.advances_amount || 0,
        foreman_commission: sr.foreman_commission || 0,
        net_salary: sr.net_salary || 0,
        status: sr.status || 'draft',
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
