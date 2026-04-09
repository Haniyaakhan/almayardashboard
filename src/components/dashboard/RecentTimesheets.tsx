'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import type { Timesheet, Laborer, Machine } from '@/types/database';
import { toDisplayDesignation } from '@/lib/designation';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface Props {
  timesheets: Timesheet[];
  laborers: Laborer[];
  machines: Machine[];
}

export function RecentTimesheets({ timesheets, laborers, machines }: Props) {
  const [filter, setFilter] = useState<'All' | 'approved' | 'draft'>('All');

  const laborerMap = new Map(laborers.map(l => [l.id, l]));
  const machineMap = new Map(machines.map(m => [m.id, m]));
  const laborerIds = new Set(laborers.map(l => l.id));
  const vehicleIds = new Set(machines.filter(m => m.category === 'vehicle').map(m => m.id));
  const equipmentIds = new Set(machines.filter(m => m.category === 'equipment').map(m => m.id));

  function resolveEntry(ts: Timesheet) {
    const id = ts.laborer_id ?? '';
    if (laborerIds.has(id)) {
      const l = laborerMap.get(id);
      return {
        name: l?.full_name ?? '—',
        sub: toDisplayDesignation(l?.designation ?? ts.designation ?? 'Unspecified'),
        type: 'Labor',
        color: '#ff6b2b',
        href: `/timesheet/history/${ts.id}`,
      };
    }
    if (vehicleIds.has(id)) {
      const m = machineMap.get(id);
      return { name: m?.name ?? '—', sub: m?.plate_number ?? '—', type: 'Vehicle', color: '#3b82f6', href: `/vehicle-timesheet?vehicle=${id}&ts=${ts.id}` };
    }
    if (equipmentIds.has(id)) {
      const m = machineMap.get(id);
      return { name: m?.name ?? '—', sub: m?.plate_number ?? '—', type: 'Equipment', color: '#14b8a6', href: `/equipment-timesheet?equipment=${id}&ts=${ts.id}` };
    }
    return { name: '—', sub: '—', type: 'Unknown', color: '#9ca3af', href: '#' };
  }

  const filtered = (filter === 'All' ? timesheets : timesheets.filter(ts => ts.status === filter))
    .slice(0, 10);

  const tabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft', value: 'draft' },
  ];

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 13,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Timesheets</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {tabs.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)} style={{
              fontSize: 11, fontWeight: 600,
              padding: '4px 9px', borderRadius: 6,
              cursor: 'pointer', transition: 'all 0.14s',
              border: filter === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: filter === t.value ? 'var(--navy)' : 'var(--bg-card)',
              color: filter === t.value ? '#fff' : 'var(--text-light)',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {!filtered.length ? (
        <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          No timesheets found.
        </div>
      ) : (
        <div>
          {filtered.map(ts => {
            const { name, sub, type, color, href } = resolveEntry(ts);
            return (
              <div key={ts.id} style={{
                padding: '10px 14px',
                borderBottom: '1px solid #f5f2ee',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                    <span style={{
                      fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: `${color}18`, color, flexShrink: 0,
                    }}>{type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', flexShrink: 0, marginLeft: 8 }}>
                    {ts.total_actual}h
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {sub} · {MONTHS[ts.month]} {ts.year}
                  </span>
                  <Link href={href} className="inline-flex">
                    {timesheetStatusBadge(ts.status)}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
