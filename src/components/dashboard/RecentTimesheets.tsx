'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import type { Timesheet } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function RecentTimesheets({ timesheets }: { timesheets: Timesheet[] }) {
  const [filter, setFilter] = useState<'All' | 'approved' | 'draft'>('All');

  const filtered = filter === 'All'
    ? timesheets
    : timesheets.filter(ts => ts.status === filter);

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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Timesheets</span>
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
          {filtered.slice(0, 8).map(ts => {
            const laborerData = ts.laborer as any;
            const dailyRate = laborerData?.daily_rate ?? 0;
            const salary = dailyRate > 0 ? Math.round(dailyRate * (ts.total_actual / 10)) : 0;
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {laborerData?.full_name ?? '—'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>
                    {salary > 0 ? `${salary} AED` : `${ts.total_actual}h`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                    {laborerData?.designation ?? '—'} · {ts.total_actual}hrs · {MONTHS[ts.month]} {ts.year}
                  </span>
                  <Link href={`/timesheet/history/${ts.id}`} className="inline-flex">
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
