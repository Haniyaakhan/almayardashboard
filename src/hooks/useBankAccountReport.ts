import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface BankAccountReport {
  withBankAccounts: number;
  withoutBankAccounts: number;
  total: number;
  details: Array<{
    id: string;
    full_name: string;
    designation: string;
    bank_name: string | null;
    bank_account_number: string | null;
    hasBankAccount: boolean;
  }>;
}

export function useBankAccountReport() {
  const [report, setReport] = useState<BankAccountReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: err } = await supabase
        .from('laborers')
        .select('id, full_name, designation, bank_name, bank_account_number, is_active')
        .eq('is_active', true)
        .order('full_name');

      if (err) throw err;

      const details = (data || []).map(laborer => ({
        ...laborer,
        hasBankAccount: !!(laborer.bank_name && laborer.bank_account_number),
      }));

      const withBankAccounts = details.filter(d => d.hasBankAccount).length;
      const withoutBankAccounts = details.filter(d => !d.hasBankAccount).length;

      setReport({
        withBankAccounts,
        withoutBankAccounts,
        total: details.length,
        details,
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
