'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck } from 'lucide-react';
import { useApprovedLaborTimesheets } from '@/hooks/useOperationsTimesheets';
import { useLaborers } from '@/hooks/useLaborers';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { MONTH_NAMES } from '@/lib/dateUtils';

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function OperationsTimesheetPage() {
  const now = currentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);

  const { timesheets, loading } = useApprovedLaborTimesheets(month, year);
  const { laborers } = useLaborers(false);

  const laborerById = useMemo(() => new Map(laborers.map((l) => [l.id, l])), [laborers]);

  if (loading) return <PageSpinner />;

  return (
    <div>


      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
            {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
          </select>
          <input value={year} onChange={(e) => setYear(Number(e.target.value) || now.year)} style={inputStyle} />
        </div>
      </Card>

      {!timesheets.length ? (
        <Card>
          <EmptyState
            icon={<ClipboardCheck size={24} />}
            title="No approved labor timesheets"
            description="Approve timesheets in the existing timesheet module; approved records will appear here."
          />
        </Card>
      ) : (
        <Card padding="p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Labor Name', 'ID', 'Designation', 'Working Hours', 'Overtime Hours', 'Total Worked Hours', 'Source'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timesheets.map((ts) => {
                const laborer = ts.laborer_id ? laborerById.get(ts.laborer_id) : undefined;
                return (
                  <tr key={ts.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                    <td style={tdStyle}>{laborer?.full_name ?? ts.labor_name ?? '—'}</td>
                    <td style={tdStyle}>{laborer?.id_number ?? '—'}</td>
                    <td style={tdStyle}>{laborer?.designation ?? ts.designation ?? '—'}</td>
                    <td style={tdStyle}>{Number(ts.total_worked ?? 0).toFixed(2)}</td>
                    <td style={tdStyle}>{Number(ts.total_ot ?? 0).toFixed(2)}</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{Number(ts.total_actual ?? 0).toFixed(2)}</td>
                    <td style={tdStyle}><Link href={`/timesheet/history/${ts.id}`} style={linkTextStyle}>View approved sheet</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  borderRadius: 9,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const linkTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontWeight: 600,
};
