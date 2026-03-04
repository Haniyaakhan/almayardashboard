'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getTimesheetWithEntries } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Printer } from 'lucide-react';
import type { Timesheet, TimesheetEntry } from '@/types/database';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_IN_MONTH = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

export default function TimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ts, setTs] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimesheetWithEntries(id).then(data => { setTs(data); setLoading(false); });
  }, [id]);

  if (loading) return <PageSpinner />;
  if (!ts) return (
    <div className="p-6">
      <p className="text-sm" style={{ color: '#94a3b8' }}>Timesheet not found.</p>
    </div>
  );

  const entries: TimesheetEntry[] = (ts.entries ?? []).sort((a, b) => a.day - b.day);
  const entryByDay: Record<number, TimesheetEntry> = {};
  entries.forEach(e => { entryByDay[e.day] = e; });
  const days = DAYS_IN_MONTH(ts.month, ts.year);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={`${MONTHS[ts.month]} ${ts.year}`}
        subtitle={(ts.laborer as any)?.full_name ?? ts.supplier_name ?? 'Timesheet'}
        action={
          <div className="flex gap-2 items-center">
            {timesheetStatusBadge(ts.status)}
            <Button size="sm" variant="secondary" icon={<Printer size={13}/>} onClick={() => window.print()}>Print</Button>
            <Link href="/timesheet/history"><Button size="sm" variant="ghost" icon={<ArrowLeft size={13}/>}>Back</Button></Link>
          </div>
        }
      />

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Project', ts.project_name || '—'],
          ['Supplier', ts.supplier_name || '—'],
          ['Designation', ts.designation || '—'],
          ['Site Engineer', ts.site_engineer_name || '—'],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
            <div className="text-sm font-semibold text-white">{val}</div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        {[
          ['Total Worked', `${ts.total_worked}h`],
          ['Overtime', `${ts.total_ot}h`],
          ['Total Actual', `${ts.total_actual}h`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
            <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color: '#e8762b' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Entries Table */}
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Daily Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #2d3454' }}>
                {['Day','Time In','Out (Lunch)','Break','In (PM)','Time Out','Duration','OT','Actual','Remarks'].map(h => (
                  <th key={h} className="pb-2 text-left font-medium pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                const e = entryByDay[day];
                if (!e) return (
                  <tr key={day} style={{ borderTop: '1px solid #2d3454' }}>
                    <td className="py-1.5 text-white pr-3">{day}</td>
                    {Array(9).fill(null).map((_, j) => (
                      <td key={j} className="py-1.5 pr-3" style={{ color: '#374151' }}>—</td>
                    ))}
                  </tr>
                );
                return (
                  <tr key={day} style={{ borderTop: '1px solid #2d3454' }}>
                    <td className="py-1.5 text-white pr-3">{day}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{e.time_in || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{e.time_out_lunch || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{e.lunch_break || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{e.time_in_2 || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: '#94a3b8' }}>{e.time_out_2 || '—'}</td>
                    <td className="py-1.5 pr-3 font-medium text-white">{e.total_duration || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: e.over_time > 0 ? '#e8762b' : '#94a3b8' }}>{e.over_time > 0 ? e.over_time : '—'}</td>
                    <td className="py-1.5 pr-3 font-semibold text-white">{e.actual_worked || '—'}</td>
                    <td className="py-1.5 truncate" style={{ color: '#94a3b8', maxWidth: '120px' }}>{e.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
