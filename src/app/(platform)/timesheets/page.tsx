'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLaborers } from '@/hooks/useLaborers';
import { useMachines } from '@/hooks/useMachines';
import { useTimesheetHistory, approveTimesheet, deleteTimesheet } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, Trash2 } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type SheetType = 'labor' | 'vehicle' | 'equipment';

const TYPE_COLORS: Record<SheetType, { bg: string; color: string }> = {
  labor:     { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
  vehicle:   { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  equipment: { bg: 'rgba(34,197,94,0.1)',    color: '#16a34a' },
};

export default function TimesheetsPage() {
  const { timesheets, loading: tsLoading, refetch } = useTimesheetHistory();
  const { laborers, loading: labLoading } = useLaborers(false);
  const { machines, loading: machLoading } = useMachines();
  const toast = useToast();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'All' | SheetType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'approved' | 'draft'>('All');
  const [search, setSearch] = useState('');

  const laborerMap  = new Map(laborers.map(l => [l.id, l]));
  const vehicleMap  = new Map(machines.filter(m => m.category === 'vehicle').map(m => [m.id, m]));
  const equipMap    = new Map(machines.filter(m => m.category === 'equipment').map(m => [m.id, m]));
  const laborerIds  = new Set(laborers.map(l => l.id));
  const vehicleIds  = new Set(machines.filter(m => m.category === 'vehicle').map(m => m.id));
  const equipIds    = new Set(machines.filter(m => m.category === 'equipment').map(m => m.id));

  function resolveType(ts: (typeof timesheets)[0]): SheetType {
    if (ts.sheet_type) return ts.sheet_type as SheetType;
    const id = ts.laborer_id ?? '';
    if (laborerIds.has(id)) return 'labor';
    if (vehicleIds.has(id)) return 'vehicle';
    if (equipIds.has(id))   return 'equipment';
    return 'labor';
  }

  function resolveName(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id ?? '';
    if (type === 'labor')     return laborerMap.get(id)?.full_name ?? ts.labor_name ?? ts.designation ?? '—';
    if (type === 'vehicle')   return vehicleMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    if (type === 'equipment') return equipMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    return '—';
  }

  function editLink(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id;
    if (type === 'labor')     return `/timesheet?laborer=${id ?? ''}&ts=${ts.id}`;
    if (type === 'vehicle')   return `/vehicle-timesheet?vehicle=${id ?? ''}&ts=${ts.id}`;
    if (type === 'equipment') return `/equipment-timesheet?equipment=${id ?? ''}&ts=${ts.id}`;
    return `/timesheet?ts=${ts.id}`;
  }

  const filtered = timesheets.filter(ts => {
    const type = resolveType(ts);
    const name = resolveName(ts, type).toLowerCase();
    const matchType   = typeFilter === 'All' || type === typeFilter;
    const matchStatus = statusFilter === 'All' || ts.status === statusFilter;
    const matchSearch = !search || name.includes(search.toLowerCase()) ||
      `${MONTHS[ts.month]} ${ts.year}`.toLowerCase().includes(search.toLowerCase());
    return matchType && matchStatus && matchSearch;
  });

  if (tsLoading || labLoading || machLoading) return <PageSpinner />;

  const typeTabs: { label: string; value: 'All' | SheetType }[] = [
    { label: 'All',       value: 'All' },
    { label: 'Labor',     value: 'labor' },
    { label: 'Vehicle',   value: 'vehicle' },
    { label: 'Equipment', value: 'equipment' },
  ];

  const statusTabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All',      value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft',    value: 'draft' },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
          Timesheets
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Create and manage timesheets for Labor, Vehicles, and Equipment — no pre-registration required.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { label: 'New Labor Timesheet',     href: '/timesheet',           color: '#3b82f6' },
          { label: 'New Vehicle Timesheet',   href: '/vehicle-timesheet',   color: '#d97706' },
          { label: 'New Equipment Timesheet', href: '/equipment-timesheet', color: '#16a34a' },
        ] as const).map(btn => (
          <Link key={btn.href} href={btn.href} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#fff', border: 'none',
            padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
            background: btn.color,
          }}>
            <Plus size={13} /> {btn.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeTabs.map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              border: typeFilter === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: typeFilter === t.value ? 'var(--navy)' : 'var(--bg-card)',
              color: typeFilter === t.value ? '#fff' : 'var(--text-light)',
            }}>{t.label}</button>
          ))}
          <span style={{ color: 'var(--border2)', margin: '0 4px' }}>|</span>
          {statusTabs.map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              border: statusFilter === t.value ? '1px solid var(--orange)' : '1px solid var(--border2)',
              background: statusFilter === t.value ? 'var(--orange)' : 'var(--bg-card)',
              color: statusFilter === t.value ? '#fff' : 'var(--text-light)',
            }}>{t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{
          background: 'var(--bg-card)', borderRadius: 9,
          padding: '7px 13px', border: '1px solid var(--border2)',
        }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or month..."
            style={{ border: 'none', background: 'transparent', fontSize: '12.5px', color: 'var(--text-light)', width: 190, outline: 'none' }} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          All Timesheets ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No timesheets found. Use the buttons above to create one.
          </div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  {['Type', 'Name', 'ID / Reg No', 'Month', 'Total Hours', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 13px', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase', background: 'var(--thead-bg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ts => {
                  const type = resolveType(ts);
                  const name = resolveName(ts, type);
                  const colors = TYPE_COLORS[type];
                  return (
                    <tr key={ts.id}
                      style={{ borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 6,
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: colors.bg, color: colors.color,
                        }}>{type}</span>
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {name}
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {ts.designation || '—'}
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
                          <Link href={editLink(ts, type)} style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            border: '1px solid var(--border2)', background: 'var(--bg-card)',
                            color: 'var(--text-light)', textDecoration: 'none',
                          }}>EDIT</Link>
                          <button onClick={() => setConfirmDeleteId(ts.id)} style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            border: 'none', cursor: 'pointer',
                            background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}><Trash2 size={11} /> DEL</button>
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
          </div>
        )}
      </div>
      {confirmDeleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: 340,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <Trash2 size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Delete Timesheet?</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 24 }}>This action cannot be undone. All entries will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{
                padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)',
              }}>Cancel</button>
              <button onClick={async () => {
                const err = await deleteTimesheet(confirmDeleteId);
                setConfirmDeleteId(null);
                if (err) { toast.error('Failed to delete timesheet'); return; }
                refetch(); toast.success('Timesheet deleted');
              }} style={{
                padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: 'none', background: '#ef4444', color: '#fff',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
