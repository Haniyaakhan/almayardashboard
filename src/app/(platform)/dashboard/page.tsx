'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { RecentTimesheets } from '@/components/dashboard/RecentTimesheets';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useLaborers } from '@/hooks/useLaborers';
import { useMachines } from '@/hooks/useMachines';
import { useVendors } from '@/hooks/useVendors';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { useLaborAdvances, createLaborAdvance } from '@/hooks/useLaborAdvances';
import { useSalaryRecords } from '@/hooks/useSalaryRecords';
import { MONTH_NAMES } from '@/lib/dateUtils';

// ─── Style helpers ────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 13,
  border: '1px solid var(--border)',
  overflow: 'hidden',
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};
const cardHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};
const cardTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-primary)',
};
const viewAllStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  background: 'var(--bg-canvas)',
  color: 'var(--text-muted)',
  padding: '4px 9px',
  borderRadius: 6,
  textDecoration: 'none',
  border: '1px solid var(--border)',
};
const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 12,
  background: 'var(--bg-canvas)',
  color: 'var(--text-primary)',
  width: '100%',
  outline: 'none',
};
function actionBtnStyle(color: string, bg: string): React.CSSProperties {
  return {
    flex: 1,
    textAlign: 'center' as const,
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color,
    background: bg,
    border: `1px solid ${color}33`,
    borderRadius: 8,
    padding: '8px 10px',
    textDecoration: 'none',
  };
}

export default function DashboardPage() {
  const { loading } = useDashboardKPIs();
  const { laborers } = useLaborers(false);
  const { machines } = useMachines();
  const { vendors } = useVendors();
  const { timesheets } = useTimesheetHistory(undefined, 10);
  const { advances, refetch: refetchAdvances } = useLaborAdvances();
  const { salaryRecords } = useSalaryRecords();
  const toast = useToast();

  // Advance form state
  const [advLaborerId, setAdvLaborerId] = useState('');
  const [advDate, setAdvDate] = useState(new Date().toISOString().slice(0, 10));
  const [advAmount, setAdvAmount] = useState('');
  const [advNotes, setAdvNotes] = useState('');
  const [advSaving, setAdvSaving] = useState(false);

  if (loading) return <PageSpinner />;

  const activeLaborers = laborers.filter(l => l.is_active);
  const vehicles = machines.filter(m => m.category === 'vehicle');
  const equipment = machines.filter(m => m.category === 'equipment');
  const activeVehicles = vehicles.filter(m => m.status !== 'returned');
  const activeEquipment = equipment.filter(m => m.status !== 'returned');
  const totalVendors = vendors.length;

  const recentSalary = [...salaryRecords]
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month)
    .slice(0, 6);

  const today = new Date().toISOString().slice(0, 10);
  const todayAdvances = advances.filter(a => a.advance_date === today);
  const todayTotal = todayAdvances.reduce((s, a) => s + Number(a.amount ?? 0), 0);

  async function handleRecordAdvance() {
    const parsed = Number(advAmount);
    if (!advLaborerId) { toast.error('Select a laborer'); return; }
    if (!Number.isFinite(parsed) || parsed <= 0) { toast.error('Enter a valid amount'); return; }
    setAdvSaving(true);
    const err = await createLaborAdvance({ laborer_id: advLaborerId, advance_date: advDate, amount: parsed, notes: advNotes });
    setAdvSaving(false);
    if (err) { toast.error(err.message); return; }
    setAdvAmount('');
    setAdvNotes('');
    refetchAdvances();
    toast.success('Advance recorded');
  }

  return (
    <div style={{ padding: '20px 24px' }}>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <KPIGrid
        activeLaborers={activeLaborers.length}
        totalLaborers={laborers.length}
        activeMachines={activeVehicles.length}
        totalMachines={vehicles.length}
        activeEquipment={activeEquipment.length}
        totalEquipment={equipment.length}
        totalVendors={totalVendors}
      />

      {/* ── Two equal columns ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16, alignItems: 'start' }}>

        {/* ═══════════════ COLUMN 1 ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Card: Record Advance */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>💰 Record Advance</span>
              <Link href="/operations/advances" style={viewAllStyle}>View All →</Link>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <select value={advLaborerId} onChange={e => setAdvLaborerId(e.target.value)} style={inputStyle}>
                  <option value="">Select laborer…</option>
                  {activeLaborers.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
                <input type="date" value={advDate} onChange={e => setAdvDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  type="number"
                  value={advAmount}
                  onChange={e => setAdvAmount(e.target.value)}
                  placeholder="Amount (OMR)"
                  style={inputStyle}
                />
                <input
                  value={advNotes}
                  onChange={e => setAdvNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Today: <strong style={{ color: 'var(--orange)' }}>{todayTotal.toFixed(2)} OMR</strong>
                  <span style={{ marginLeft: 4 }}>({todayAdvances.length} entr{todayAdvances.length === 1 ? 'y' : 'ies'})</span>
                </span>
                <button
                  onClick={handleRecordAdvance}
                  disabled={advSaving}
                  style={{
                    background: 'var(--orange)', color: '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '7px 18px', fontSize: 12, fontWeight: 700,
                    cursor: advSaving ? 'not-allowed' : 'pointer',
                    opacity: advSaving ? 0.7 : 1,
                  }}
                >
                  {advSaving ? 'Saving…' : 'Record Advance'}
                </button>
              </div>
            </div>
          </div>

          {/* Card: Labour */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>👷 Labour</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link href="/operations/labor" style={viewAllStyle}>View All →</Link>
                <Link href="/labor/new" style={{ ...viewAllStyle, background: 'var(--orange-lt)', color: 'var(--orange)', border: '1px solid var(--orange)33' }}>+ Add</Link>
              </div>
            </div>
            {activeLaborers.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No active labourers.</div>
            ) : (
              <div>
                {activeLaborers.slice(0, 5).map((l, idx) => (
                  <div key={l.id} style={{
                    padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: idx < Math.min(activeLaborers.length, 5) - 1 ? '1px solid #f8f6f2' : 'none',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'rgba(255,107,43,0.08)', color: 'var(--orange)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {l.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/labor/${l.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        {l.full_name}
                      </Link>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{l.designation} · {l.supplier_name || '—'}</div>
                    </div>
                    <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Left'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Salary Summary */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>📊 Salary Summary</span>
              <Link href="/operations/salary" style={viewAllStyle}>View All →</Link>
            </div>
            {recentSalary.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No salary records found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--thead-bg, #faf8f5)' }}>
                    {['Name', 'Month', 'Net Salary', 'Status'].map(h => (
                      <th key={h} style={{ padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentSalary.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f8f6f2' }}>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{r.laborer?.full_name ?? '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>{MONTH_NAMES[r.month]} {r.year}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>{Number(r.net_salary).toFixed(2)} OMR</td>
                      <td style={{ padding: '8px 12px' }}>
                        <Badge color={r.status === 'approved' ? 'green' : 'amber'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Card: Vehicles & Contractors */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>🚛 Vehicles & Contractors</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link href="/vehicle-operations" style={viewAllStyle}>View All →</Link>
                <Link href="/machines/new" style={{ ...viewAllStyle, background: 'var(--blue-bg)', color: 'var(--blue)', border: '1px solid #3b82f633' }}>+ Vehicle</Link>
                <Link href="/vendors/new" style={{ ...viewAllStyle, background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid #8b5cf633' }}>+ Contractor</Link>
              </div>
            </div>
            {vehicles.length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No vehicles added.</div>
            ) : (
              <div>
                {vehicles.slice(0, 4).map((m, idx) => (
                  <div key={m.id} style={{
                    padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10,
                    borderBottom: idx < Math.min(vehicles.length, 4) - 1 ? '1px solid #f8f6f2' : 'none',
                  }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'var(--blue-bg)', color: 'var(--blue)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, flexShrink: 0,
                    }}>
                      {m.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/machines/${m.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                        {m.name}
                      </Link>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        {m.plate_number || '—'} · {(m.vendor as any)?.name ?? '—'}
                      </div>
                    </div>
                    <Badge color={m.status === 'available' ? 'green' : m.status === 'in_use' ? 'amber' : 'red'}>{m.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ═══════════════ COLUMN 2: Timesheets ═══════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quick-add timesheet buttons */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <span style={cardTitleStyle}>📋 New Timesheet</span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
              <Link href="/timesheet" style={actionBtnStyle('#ff6b2b', 'rgba(255,107,43,0.08)')}>+ Labour</Link>
              <Link href="/vehicle-timesheet" style={actionBtnStyle('#3b82f6', 'rgba(59,130,246,0.08)')}>+ Vehicle</Link>
              <Link href="/equipment-timesheet" style={actionBtnStyle('#14b8a6', 'rgba(20,184,166,0.08)')}>+ Equipment</Link>
            </div>
          </div>

          {/* All timesheets with status filter */}
          <RecentTimesheets timesheets={timesheets} laborers={laborers} machines={machines} />

        </div>

      </div>
    </div>
  );
}
