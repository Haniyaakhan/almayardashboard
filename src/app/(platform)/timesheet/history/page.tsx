'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { ClipboardList, Plus } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TimesheetHistoryPage() {
  const { timesheets, loading } = useTimesheetHistory();
  const [filter, setFilter] = useState<'All' | 'approved' | 'draft'>('All');

  const filtered = filter === 'All'
    ? timesheets
    : timesheets.filter(ts => ts.status === filter);

  if (loading) return <PageSpinner />;

  const tabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All', value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft', value: 'draft' },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
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
          <Link href="/timesheet" style={{
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

      {!filtered.length ? (
        <EmptyState icon={<ClipboardList size={24}/>} title="No timesheets found"
          description="Fill a timesheet and click Save to store it here." />
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Worker', 'Designation', 'Total Hours', 'Total Salary', 'Status', 'Actions'].map(h => (
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
                const laborerData = ts.laborer as any;
                const dailyRate = laborerData?.daily_rate ?? 0;
                const salary = dailyRate > 0 ? Math.round(dailyRate * (ts.total_actual / 10)) : 0;
                return (
                  <tr key={ts.id} style={{
                    borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 13px' }}>
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 30, height: 30, borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                          background: 'rgba(59,130,246,0.08)', color: 'var(--blue)',
                        }}>
                          {(laborerData?.full_name ?? '—').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {laborerData?.full_name ?? '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>
                      {laborerData?.designation ?? ts.designation ?? '—'}
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ts.total_actual} hrs
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>
                      {salary > 0 ? `${salary} AED` : '—'}
                    </td>
                    <td style={{ padding: '10px 13px' }}>{timesheetStatusBadge(ts.status)}</td>
                    <td style={{ padding: '10px 13px' }}>
                      <div className="flex items-center gap-2">
                        <Link href={`/timesheet?laborer=${ts.laborer_id}&ts=${ts.id}`} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                          border: '1px solid var(--border2)', background: 'var(--bg-card)',
                          color: 'var(--text-light)', textDecoration: 'none',
                        }}>EDIT</Link>
                        <Link href={`/timesheet/history/${ts.id}`} style={{
                          fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                          border: 'none', background: 'var(--orange)', color: '#fff',
                          textDecoration: 'none',
                        }}>VIEW</Link>
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
  );
}
