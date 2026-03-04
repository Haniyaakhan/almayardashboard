'use client';
import React from 'react';
import Link from 'next/link';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import type { Timesheet } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function RecentTimesheets({ timesheets }: { timesheets: Timesheet[] }) {
  if (!timesheets.length) {
    return (
      <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h3 className="text-sm font-semibold text-white mb-4">Recent Timesheets</h3>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No timesheets saved yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Recent Timesheets</h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }}>
            <th className="text-left pb-2 font-medium">Laborer</th>
            <th className="text-left pb-2 font-medium">Period</th>
            <th className="text-right pb-2 font-medium">Hours</th>
            <th className="text-right pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {timesheets.slice(0, 5).map(ts => (
            <tr key={ts.id} style={{ borderTop: '1px solid var(--border)' }}>
              <td className="py-2 text-white">{(ts.laborer as any)?.full_name ?? '—'}</td>
              <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{MONTHS[ts.month]} {ts.year}</td>
              <td className="py-2 text-right text-white">{ts.total_actual}h</td>
              <td className="py-2 text-right">
                <Link href={`/timesheet/history/${ts.id}`} className="inline-flex">
                  {timesheetStatusBadge(ts.status)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
