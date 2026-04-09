import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';

export interface EmployeesByDesignation {
  designation: string;
  count: number;
  employees: Array<{
    id: string;
    full_name: string;
    id_number: string;
    phone: string;
    bank_name: string;
    bank_account_number: string;
    designation: string;
    supplier_name: string;
    daily_rate: number | null;
    monthly_salary: number | null;
    is_active: boolean;
    start_date: string | null;
  }>;
}

export interface EmployeesByDesignationReport {
  totalEmployees: number;
  designationGroups: EmployeesByDesignation[];
}

export function useEmployeesByDesignation() {
  const [report, setReport] = useState<EmployeesByDesignationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('laborers')
        .select('id, full_name, id_number, phone, bank_name, bank_account_number, designation, supplier_name, daily_rate, monthly_salary, is_active, start_date')
        .order('designation, full_name');

      if (err) throw err;

      // Build groups from real designation values in labor records (case-insensitive).
      const grouped: { [key: string]: EmployeesByDesignation } = {};

      (data || []).forEach(emp => {
        const designationKey = normalizeDesignationKey(emp.designation);
        if (!grouped[designationKey]) {
          grouped[designationKey] = {
            designation: toDisplayDesignation(designationKey),
            count: 0,
            employees: [],
          };
        }
        grouped[designationKey].employees.push(emp);
      });

      const designationGroups = Object.values(grouped)
        .map((group) => ({
          ...group,
          count: group.employees.length,
        }))
        .sort((a, b) => a.designation.localeCompare(b.designation));

      const totalEmployees = (data || []).length;

      setReport({
        totalEmployees,
        designationGroups,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, []);

  return { report, loading, error, refetch: fetchReport };
}
