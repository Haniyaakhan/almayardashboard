'use client';
import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useMonthlyHoursByDesignation } from '@/hooks/useMonthlyHoursByDesignation';
import { ReportExportButtons } from '@/components/ReportExportButtons';
import { Clock } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MonthlyHoursByDesignationPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const { report, loading, error } = useMonthlyHoursByDesignation(month, year);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

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

  const reportData = {
    headers: ['Designation', 'Total Hours', 'Employee Count', 'Avg Hours/Employee'],
    rows: report.designations.map((d, idx) => ({
      cells: [
        d.designation,
        d.totalHours.toFixed(2),
        d.employeeCount.toString(),
        (d.totalHours / d.employeeCount).toFixed(2),
      ],
      key: idx,
    })),
  };

  const totalHours = report.designations.reduce((sum, d) => sum + d.totalHours, 0);

  return (
    <div className="p-6 space-y-6">

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

      {/* Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Hours Worked
            </p>
            <p className="text-2xl font-bold mt-2">
              {totalHours.toFixed(2)} hrs
            </p>
            <p className="text-xs mt-2">
              {report.designations.length} designations
            </p>
          </div>
          <Clock className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
        </div>
      </Card>

      {/* Export */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Export Options</h2>
          <ReportExportButtons 
            headers={reportData.headers}
            rows={reportData.rows.map(r => r.cells)}
            filename={`hours-by-designation-${year}-${String(month + 1).padStart(2, '0')}`}
          />
        </div>
      </Card>

      {/* Details Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Breakdown by Designation</h2>
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
                      {cell}
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

