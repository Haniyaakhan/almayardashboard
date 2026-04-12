'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
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

export default function VehicleTimesheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ts, setTs] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimesheetWithEntries(id).then(data => { setTs(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (searchParams.get('print') !== '1') return;
    router.replace(`/vehicle-timesheet?ts=${id}&print=1`);
  }, [id, router, searchParams]);

  if (loading) return <PageSpinner />;
  if (!ts) return (
    <div className="p-6">
      <p className="text-sm" style={{ color: 'var(--text-light)' }}>Timesheet not found.</p>
    </div>
  );

  const entries: TimesheetEntry[] = (ts.entries ?? []).sort((a, b) => a.day - b.day);
  const entryByDay: Record<number, TimesheetEntry> = {};
  entries.forEach(e => { entryByDay[e.day] = e; });
  const days = DAYS_IN_MONTH(ts.month, ts.year);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        action={
          <div className="flex gap-2 items-center">
            {timesheetStatusBadge(ts.status)}
            <Button size="sm" variant="secondary" icon={<Printer size={13}/>} onClick={() => window.open(`/vehicle-timesheet?ts=${id}&print=1`, '_blank', 'noopener,noreferrer')}>Print</Button>
            <Link href="/vehicle-timesheet/history"><Button size="sm" variant="ghost" icon={<ArrowLeft size={13}/>}>Back</Button></Link>
          </div>
        }
      />

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Project', ts.project_name || '—'],
          ['Contractor', ts.supplier_name || '—'],
          ['Reg No', ts.designation || '—'],
          ['Site Engineer', ts.site_engineer_name || '—'],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10.5px', fontWeight: 600 }}>{label}</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{val}</div>
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
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10.5px', fontWeight: 600 }}>{label}</div>
            <div className="text-2xl font-bold" style={{ color: 'var(--orange)' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Entries Table */}
      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Daily Entries</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                {['Day','Time In','Out (Lunch)','Break','In (PM)','Time Out','Duration','OT','Actual','Remarks'].map(h => (
                  <th key={h} className="pb-2 text-left font-medium pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: days }, (_, i) => i + 1).map(day => {
                const e = entryByDay[day];
                if (!e) return (
                  <tr key={day} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-[var(--text-primary)] pr-3">{day}</td>
                    {Array(9).fill(null).map((_, j) => (
                      <td key={j} className="py-1.5 pr-3" style={{ color: 'var(--text-muted)' }}>—</td>
                    ))}
                  </tr>
                );
                return (
                  <tr key={day} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="py-1.5 text-[var(--text-primary)] pr-3">{day}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--text-light)' }}>{e.time_in || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--text-light)' }}>{e.time_out_lunch || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--text-light)' }}>{e.lunch_break || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--text-light)' }}>{e.time_in_2 || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: 'var(--text-light)' }}>{e.time_out_2 || '—'}</td>
                    <td className="py-1.5 pr-3 font-medium text-[var(--text-primary)]">{e.total_duration || '—'}</td>
                    <td className="py-1.5 pr-3" style={{ color: e.over_time > 0 ? '#e8762b' : 'var(--text-light)' }}>{e.over_time > 0 ? e.over_time : '—'}</td>
                    <td className="py-1.5 pr-3 font-semibold text-[var(--text-primary)]">{e.actual_worked || '—'}</td>
                    <td className="py-1.5 truncate" style={{ color: 'var(--text-light)', maxWidth: '120px' }}>{e.remarks || '—'}</td>
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
