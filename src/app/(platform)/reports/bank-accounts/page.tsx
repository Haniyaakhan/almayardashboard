'use client';
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useBankAccountReport } from '@/hooks/useBankAccountReport';
import { CheckCircle, AlertCircle, Download, Search } from 'lucide-react';
import { exportToXLSX } from '@/lib/exportUtils';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';

export default function BankAccountReportPage() {
  const { report, loading, error } = useBankAccountReport();
  const [search, setSearch] = useState('');

  const details = report?.details ?? [];
  const filteredDetails = useMemo(() => {
    const q = search.trim().toLowerCase();
    const normalizedQuery = normalizeDesignationKey(q);
    if (!q) return details;

    return details.filter((emp) => {
      const name = (emp.full_name || '').toLowerCase();
      const designation = normalizeDesignationKey(emp.designation);
      const designationLabel = toDisplayDesignation(emp.designation).toLowerCase();
      const bankName = (emp.bank_name || '').toLowerCase();
      const account = (emp.bank_account_number || '').toLowerCase();
      return (
        name.includes(q)
        || designation.includes(normalizedQuery)
        || designationLabel.includes(q)
        || bankName.includes(q)
        || account.includes(q)
      );
    });
  }, [details, search]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <p className="text-red-600">{error || 'Failed to load report'}</p>
        </Card>
      </div>
    );
  }

  const withBankAccounts = filteredDetails.filter((emp) => emp.hasBankAccount);
  const withoutBankAccounts = filteredDetails.filter((emp) => !emp.hasBankAccount);

  const exportHeaders = ['Employee Name', 'Designation', 'Bank Name', 'Account Number', 'Status'];

  const withBankRows = withBankAccounts.map((emp) => [
    emp.full_name,
    toDisplayDesignation(emp.designation),
    emp.bank_name || '-',
    emp.bank_account_number || '-',
    'Active',
  ]);

  const withoutBankRows = withoutBankAccounts.map((emp) => [
    emp.full_name,
    toDisplayDesignation(emp.designation),
    '-',
    '-',
    'Missing',
  ]);

  return (
    <div className="p-6 space-y-6">

      <Card>
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
        >
          <Search className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee by name, designation, bank, or account number"
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="overflow-hidden" padding="p-0">
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Employees With Bank Accounts</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="green">{withBankAccounts.length}</Badge>
              <button
                onClick={() => exportToXLSX(exportHeaders, withBankRows, 'employees-with-bank-accounts')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                title="Export with bank accounts as Excel"
              >
                <Download className="w-4 h-4 inline-block mr-2" />
                Excel
              </button>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto p-4 space-y-3">
            {withBankAccounts.length ? withBankAccounts.map((emp) => (
              <div key={emp.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{toDisplayDesignation(emp.designation)}</p>
                  </div>
                  <Badge color="green">Active</Badge>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <div>Bank: {emp.bank_name || '-'}</div>
                  <div>Account: {emp.bank_account_number ? `****${emp.bank_account_number.slice(-4)}` : '-'}</div>
                </div>
              </div>
            )) : (
              <div className="rounded-xl p-4 text-sm" style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
                No employees with bank accounts.
              </div>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden" padding="p-0">
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Employees Without Bank Accounts</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="orange">{withoutBankAccounts.length}</Badge>
              <button
                onClick={() => exportToXLSX(exportHeaders, withoutBankRows, 'employees-without-bank-accounts')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                title="Export without bank accounts as Excel"
              >
                <Download className="w-4 h-4 inline-block mr-2" />
                Excel
              </button>
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto p-4 space-y-3">
            {withoutBankAccounts.length ? withoutBankAccounts.map((emp) => (
              <div key={emp.id} className="rounded-xl p-3" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{toDisplayDesignation(emp.designation)}</p>
                  </div>
                  <Badge color="amber">Missing</Badge>
                </div>
              </div>
            )) : (
              <div className="rounded-xl p-4 text-sm" style={{ border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
                No employees missing bank accounts.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

