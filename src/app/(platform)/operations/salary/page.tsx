'use client';
import React, { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { useApprovedLaborTimesheets } from '@/hooks/useOperationsTimesheets';
import { useLaborers } from '@/hooks/useLaborers';
import { useSalaryRecords, upsertSalaryRecord, approveSalaryRecord } from '@/hooks/useSalaryRecords';
import { getTotalAdvancesForLaborer } from '@/hooks/useLaborAdvances';
import { computeSalaryFromApprovedTimesheet } from '@/lib/salary';
import { exportSalaryReportToExcel } from '@/lib/excelExport';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function OperationsSalaryPage() {
  const now = currentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [running, setRunning] = useState(false);

  const { timesheets, loading: loadingTs } = useApprovedLaborTimesheets(month, year);
  const { laborers, loading: loadingLabor } = useLaborers(false);
  const { salaryRecords, loading: loadingSalary, refetch } = useSalaryRecords(month, year);
  const toast = useToast();

  const laborerById = useMemo(() => new Map(laborers.map((l) => [l.id, l])), [laborers]);

  const readyRows = useMemo(() => {
    const rows: Array<{ ts: (typeof timesheets)[number]; laborer: (typeof laborers)[number] }> = [];
    timesheets.forEach((ts) => {
      if (!ts.laborer_id) return;
      const laborer = laborerById.get(ts.laborer_id);
      if (!laborer) return;
      rows.push({ ts, laborer });
    });
    return rows;
  }, [timesheets, laborerById, laborers]);

  async function calculateAndSaveAll() {
    setRunning(true);
    let success = 0;
    let skipped = 0;

    await Promise.all(
      readyRows.map(async ({ ts, laborer }) => {
        if (!laborer.monthly_salary || laborer.monthly_salary <= 0) {
          skipped += 1;
          return;
        }

        const { total } = await getTotalAdvancesForLaborer(laborer.id, month, year);
        const computed = computeSalaryFromApprovedTimesheet(ts, laborer, total);
        const error = await upsertSalaryRecord(computed);
        if (!error) success += 1;
      })
    );

    setRunning(false);
    refetch();
    toast.success(`Salary generated for ${success} records${skipped ? `, skipped ${skipped}` : ''}`);
  }

  async function approveOne(id: string) {
    const error = await approveSalaryRecord(id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refetch();
    toast.success('Salary approved');
  }

  function onExport() {
    exportSalaryReportToExcel(month, year, salaryRecords);
  }

  if (loadingTs || loadingLabor || loadingSalary) return <PageSpinner />;

  return (
    <div>


      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
              {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
            <input value={year} onChange={(e) => setYear(Number(e.target.value) || now.year)} style={inputStyle} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Approved source sheets: {readyRows.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onExport} disabled={!salaryRecords.length}>Export Excel</Button>
            <Button onClick={calculateAndSaveAll} loading={running}>Calculate From Approved</Button>
          </div>
        </div>
      </Card>

      {!salaryRecords.length ? (
        <Card>
          <EmptyState
            icon={<Calculator size={24} />}
            title="No salary records"
            description="Click Calculate From Approved to generate salary from approved timesheets only."
          />
        </Card>
      ) : (
        <Card padding="p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Labor', 'Bank', 'Account No', 'Worked Hrs', 'Hourly Rate', 'Basic', 'Advances', 'Commission', 'Net Salary', 'Status', 'Action'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salaryRecords.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={tdStyle}>{row.laborer?.full_name ?? '—'}</td>
                  <td style={tdStyle}>{row.laborer?.bank_name ?? '—'}</td>
                  <td style={tdStyle}>{row.laborer?.bank_account_number ?? '—'}</td>
                  <td style={tdStyle}>{Number(row.total_worked_hours).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(row.hourly_rate).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(row.basic_salary).toFixed(2)} OMR</td>
                  <td style={tdStyle}>{Number(row.advances_amount).toFixed(2)} OMR</td>
                  <td style={tdStyle}>{Number(row.foreman_commission).toFixed(2)} OMR</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{Number(row.net_salary).toFixed(2)} OMR</td>
                  <td style={tdStyle}>
                    <Badge color={row.status === 'approved' ? 'green' : 'gray'}>{row.status}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <Button size="sm" onClick={() => approveOne(row.id)} disabled={row.status === 'approved'}>
                      {row.status === 'approved' ? 'Approved' : 'Approve'}
                    </Button>
                  </td>
                </tr>
              ))}
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
