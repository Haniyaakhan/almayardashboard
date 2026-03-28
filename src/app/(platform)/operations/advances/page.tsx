'use client';
import React, { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useLaborers } from '@/hooks/useLaborers';
import { useLaborAdvances, createLaborAdvance } from '@/hooks/useLaborAdvances';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function OperationsAdvancesPage() {
  const now = currentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const { laborers } = useLaborers(true);
  const { advances, loading, refetch } = useLaborAdvances(month, year);
  const toast = useToast();

  const [laborerId, setLaborerId] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const totalMonth = useMemo(() => advances.reduce((sum, row) => sum + Number(row.amount ?? 0), 0), [advances]);

  async function onSave() {
    const parsed = Number(amount);
    if (!laborerId) {
      toast.error('Select laborer');
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error('Enter valid amount');
      return;
    }

    setSaving(true);
    const error = await createLaborAdvance({
      laborer_id: laborerId,
      advance_date: advanceDate,
      amount: parsed,
      notes,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setAmount('');
    setNotes('');
    refetch();
    toast.success('Advance recorded');
  }

  if (loading) return <PageSpinner />;

  return (
    <div>


      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <select value={laborerId} onChange={(e) => setLaborerId(e.target.value)} style={inputStyle}>
            <option value="">Select laborer</option>
            {laborers.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </select>
          <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} style={inputStyle} />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (OMR)" style={inputStyle} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" style={inputStyle} />
          <Button onClick={onSave} loading={saving}>Record Advance</Button>
        </div>
      </Card>

      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
            {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
          </select>
          <input value={year} onChange={(e) => setYear(Number(e.target.value) || now.year)} style={inputStyle} />
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>
            Monthly Total: {totalMonth.toFixed(2)} OMR
          </div>
        </div>
      </Card>

      {!advances.length ? (
        <Card>
          <EmptyState icon={<Wallet size={24} />} title="No advances for selected month" description="Record advances to track salary deductions." />
        </Card>
      ) : (
        <Card padding="p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Date', 'Labor', 'Amount', 'Notes'].map((h) => <th key={h} style={thStyle}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {advances.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={tdStyle}>{a.advance_date}</td>
                  <td style={tdStyle}>{a.laborer?.full_name ?? '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{Number(a.amount).toFixed(2)} OMR</td>
                  <td style={tdStyle}>{a.notes || '—'}</td>
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
