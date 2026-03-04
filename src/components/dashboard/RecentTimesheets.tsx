'use client';
import React from 'react';
import Link from 'next/link';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import type { Timesheet } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function RecentTimesheets({ timesheets }: { timesheets: Timesheet[] }) {
  if (!timesheets.length) {
    return (
      <div className="rounded-xl p-5" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
        <h3 className="text-sm font-semibold text-white mb-4">Recent Timesheets</h3>
        <p className="text-sm" style={{ color: '#94a3b8' }}>No timesheets saved yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-5" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
      <h3 className="text-sm font-semibold text-white mb-4">Recent Timesheets</h3>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: '#64748b' }}>
            <th className="text-left pb-2 font-medium">Laborer</th>
            <th className="text-left pb-2 font-medium">Period</th>
            <th className="text-right pb-2 font-medium">Hours</th>
            <th className="text-right pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {timesheets.slice(0, 5).map(ts => (
            <tr key={ts.id} style={{ borderTop: '1px solid #2d3454' }}>
              <td className="py-2 text-white">{(ts.laborer as any)?.full_name ?? '—'}</td>
              <td className="py-2" style={{ color: '#94a3b8' }}>{MONTHS[ts.month]} {ts.year}</td>
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
