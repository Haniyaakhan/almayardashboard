'use client';
import React from 'react';
import Link from 'next/link';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { ClipboardList, Plus } from 'lucide-react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TimesheetHistoryPage() {
  const { timesheets, loading } = useTimesheetHistory();

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6">
      <PageHeader title="Timesheet History" subtitle="All saved timesheets"
        action={<Link href="/timesheet"><Button size="sm" icon={<Plus size={13}/>}>New Timesheet</Button></Link>} />

      {!timesheets.length ? (
        <EmptyState icon={<ClipboardList size={24}/>} title="No timesheets saved yet"
          description="Fill a timesheet and click Save to store it here." />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d3454' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1a1f2e' }}>
              <tr>
                {['Laborer','Period','Project','Total Hours','OT','Status',''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timesheets.map((ts, i) => (
                <tr key={ts.id} style={{ background: i % 2 === 0 ? '#1e2336' : '#1a1f2e', borderTop: '1px solid #2d3454' }}>
                  <td className="px-4 py-3 text-white">{(ts.laborer as any)?.full_name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{MONTHS[ts.month]} {ts.year}</td>
                  <td className="px-4 py-3 text-white max-w-[200px] truncate">{ts.project_name || '—'}</td>
                  <td className="px-4 py-3 text-white font-medium">{ts.total_actual}h</td>
                  <td className="px-4 py-3" style={{ color: ts.total_ot > 0 ? '#e8762b' : '#94a3b8' }}>{ts.total_ot > 0 ? `+${ts.total_ot}h` : '—'}</td>
                  <td className="px-4 py-3">{timesheetStatusBadge(ts.status)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/timesheet/history/${ts.id}`} className="text-xs font-medium" style={{ color: '#e8762b' }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
