'use client';
import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useBankAccountReport } from '@/hooks/useBankAccountReport';
import { ReportExportButtons } from '@/components/ReportExportButtons';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function BankAccountReportPage() {
  const { report, loading, error } = useBankAccountReport();

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
        <PageHeader title="Bank Account Report" subtitle="Employee bank account status" />
        <Card className="border-red-200">
          <p className="text-red-600">{error || 'Failed to load report'}</p>
        </Card>
      </div>
    );
  }

  const reportData = {
    headers: ['Employee Name', 'Designation', 'Bank Name', 'Account Number', 'Status'],
    rows: report.details.map(emp => ({
      cells: [
        emp.full_name,
        emp.designation || 'Unspecified',
        emp.bank_name || '-',
        emp.bank_account_number ? `****${emp.bank_account_number.slice(-4)}` : '-',
        emp.hasBankAccount ? 'Active' : 'Missing',
      ],
      key: emp.id,
    })),
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Bank Account Report" 
        subtitle="Employees with and without bank account information"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                With Bank Accounts
              </p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                {report.withBankAccounts}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Without Bank Accounts
              </p>
              <p className="text-2xl font-bold text-orange-600 mt-2">
                {report.withoutBankAccounts}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-600" />
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Employees
            </p>
            <p className="text-2xl font-bold mt-2">
              {report.total}
            </p>
            <p className="text-xs mt-2">
              {((report.withBankAccounts / report.total) * 100).toFixed(1)}% coverage
            </p>
          </div>
        </Card>
      </div>

      {/* Export */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Export Options</h2>
          <ReportExportButtons 
            headers={reportData.headers}
            rows={reportData.rows.map(r => r.cells)}
            filename="bank-account-report"
          />
        </div>
      </Card>

      {/* Details Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Employee Details</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {reportData.headers.map(header => (
                  <th 
                    key={header}
                    className="text-left py-3 px-4 font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.rows.map((row, idx) => (
                <tr 
                  key={row.key} 
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {row.cells.map((cell, cidx) => (
                    <td 
                      key={cidx} 
                      className="py-3 px-4"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {cidx === 4 ? (
                        <Badge 
                          variant={cell === 'Active' ? 'success' : 'warning'}
                        >
                          {cell}
                        </Badge>
                      ) : (
                        cell
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
