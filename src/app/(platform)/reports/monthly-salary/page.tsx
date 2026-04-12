'use client';
import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useSalaryPerMonth } from '@/hooks/useSalaryPerMonth';
import { ReportExportButtons } from '@/components/ReportExportButtons';
import { DollarSign } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function SalaryPerMonthPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const { report, loading, error } = useSalaryPerMonth(month, year);

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
        <PageHeader title="Monthly Salary Report" subtitle="Salaries per month" />
        <Card className="border-red-200">
          <p className="text-red-600">{error || 'Failed to load report'}</p>
        </Card>
      </div>
    );
  }

  const reportData = {
    headers: ['Employee Name', 'Designation', 'Gross Salary', 'OT Hours', 'Deduction', 'Net Salary', 'Status'],
    rows: report.salaryDetails.map((s, idx) => ({
      cells: [
        s.full_name,
        s.designation || 'Unspecified',
        s.gross_salary.toFixed(2),
        s.overtime_hours.toFixed(2),
        s.deduction.toFixed(2),
        s.net_salary.toFixed(2),
        s.status,
      ],
      key: s.salary_id,
    })),
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' ? 'green' : 'amber';
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Monthly Salary Report" 
        subtitle="Salaries breakdown and details"
      />

      {/* Period Selection */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Month</label>
            <select 
              value={month} 
              onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Year</label>
            <input 
              type="number" 
              value={year} 
              min="2020" 
              max="2040" 
              onChange={e => setYear(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Total Salaries
              </p>
              <p className="text-2xl font-bold mt-2">
                {report.totalSalaries.toFixed(2)}
              </p>
            </div>
            <DollarSign className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Employees Paid
            </p>
            <p className="text-2xl font-bold mt-2">
              {report.employeeCount}
            </p>
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Average Salary
            </p>
            <p className="text-2xl font-bold mt-2">
              {report.averageSalary.toFixed(2)}
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
            filename={`salary-report-${year}-${String(month + 1).padStart(2, '0')}`}
          />
        </div>
      </Card>

      {/* Details Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Salary Details</h2>
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
              {reportData.rows.map((row) => (
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
                      {cidx === 6 ? (
                        <Badge color={getStatusColor(cell as string)}>
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
