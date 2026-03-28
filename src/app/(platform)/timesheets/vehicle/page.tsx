'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMachines } from '@/hooks/useMachines';
import { useTimesheetHistory, approveTimesheet } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function VehicleTimesheetPage() {
  const { machines, loading: machinesLoading } = useMachines();
  const { timesheets, loading: tsLoading, refetch } = useTimesheetHistory();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | 'approved' | 'draft'>('All');
  const [monthFilter, setMonthFilter] = useState('All');

  const vehicleMachineIds = new Set(machines.filter(m => m.category === 'vehicle').map(m => m.id));
  const vehicleTimesheets = timesheets.filter(ts =>
    (ts.laborer_id && vehicleMachineIds.has(ts.laborer_id)) || ts.sheet_type === 'vehicle'
  );

  const monthOptions = Array.from(
    new Set(vehicleTimesheets.map(ts => `${MONTHS[ts.month]} ${ts.year}`))
  );

  const filtered = vehicleTimesheets.filter(ts => {
    const matchStatus = filter === 'All' || ts.status === filter;
    const matchMonth = monthFilter === 'All' || `${MONTHS[ts.month]} ${ts.year}` === monthFilter;
    const machine = machines.find(m => m.id === ts.laborer_id);
    const displayName = machine?.name ?? ts.labor_name ?? '';
    const matchSearch = !search || displayName.toLowerCase().includes(search.toLowerCase()) ||
      (machine?.plate_number ?? ts.designation ?? '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchMonth && matchSearch;
  });

  if (machinesLoading || tsLoading) return <PageSpinner />;

  const tabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft', value: 'draft' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 10,
      }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 13px', borderRadius: 8,
              cursor: 'pointer', transition: 'all 0.14s',
              border: filter === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: filter === t.value ? 'var(--navy)' : 'var(--bg-card)',
              color: filter === t.value ? '#fff' : 'var(--text-light)',
            }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 150, outline: 'none',
              }} />
          </div>
          {monthOptions.length > 0 && (
            <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9,
              border: '1px solid var(--border2)', background: 'var(--bg-card)',
              color: 'var(--text-light)', cursor: 'pointer', outline: 'none',
            }}>
              <option value="All">All Months</option>
              {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          <Link href="/vehicle-timesheet" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff',
            border: 'none', padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Plus size={14} /> ADD NEW SHEET
          </Link>
        </div>
      </div>

      <div style={{
        background: 'var(--bg-card)', borderRadius: 13,
        border: '1px solid var(--border)', overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No saved timesheets yet. Click <strong>ADD NEW SHEET</strong> to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Vehicle', 'Reg No', 'Operator', 'Month', 'Total Hours', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 13px', fontSize: '10.5px', fontWeight: 600,
                    color: 'var(--text-muted)', textAlign: 'left',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(ts => {
                const machine = machines.find(m => m.id === ts.laborer_id);
                return (
                  <tr key={ts.id} style={{ borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 13px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {machine?.name ?? ts.labor_name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace', fontWeight: 700 }}>
                      {machine?.plate_number ?? ts.designation ?? '—'}
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>
                      {machine?.operator_name ?? ts.labor_name ?? ts.designation ?? '—'}
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>
                      {MONTHS[ts.month]} {ts.year}
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ts.total_actual} hrs
                    </td>
                    <td style={{ padding: '10px 13px' }}>{timesheetStatusBadge(ts.status)}</td>
                    <td style={{ padding: '10px 13px' }}>
                      <div className="flex items-center gap-2">
                        <Link href={`/vehicle-timesheet?vehicle=${ts.laborer_id}&ts=${ts.id}`} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                          border: '1px solid var(--border2)', background: 'var(--bg-card)',
                          color: 'var(--text-light)', textDecoration: 'none',
                        }}>EDIT</Link>
                        <button onClick={async () => {
                          if (ts.status === 'approved') return;
                          await approveTimesheet(ts.id);
                          refetch(); toast.success('Timesheet approved');
                        }} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                          border: 'none', cursor: ts.status === 'approved' ? 'default' : 'pointer',
                          background: ts.status === 'approved' ? '#d1d5db' : 'var(--orange)',
                          color: ts.status === 'approved' ? '#6b7280' : '#fff',
                          opacity: ts.status === 'approved' ? 0.7 : 1,
                        }}>{ts.status === 'approved' ? 'SAVED' : 'SAVE'}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
