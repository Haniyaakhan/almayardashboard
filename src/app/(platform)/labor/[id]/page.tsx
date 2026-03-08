'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getLaborerById } from '@/hooks/useLaborers';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge, timesheetStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Edit, Plus, FileEdit } from 'lucide-react';
import type { Laborer } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function LaborerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [laborer, setLaborer] = useState<Laborer | null>(null);
  const { timesheets, loading: tsLoading } = useTimesheetHistory(id);

  useEffect(() => { getLaborerById(id).then(setLaborer); }, [id]);

  if (!laborer) return <PageSpinner />;

  const info: [string, string][] = [
    ['Designation', laborer.designation],
    ['Contractor', laborer.supplier_name || '—'],
    ['ID / Iqama', laborer.id_number || '—'],
    ['Nationality', laborer.nationality || '—'],
    ['Phone', laborer.phone || '—'],
    ['Status', laborer.is_active ? 'Active' : 'Left'],
    ['Daily Rate', laborer.daily_rate ? `AED ${laborer.daily_rate}` : '—'],
  ];

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      <PageHeader title={laborer.full_name}
        subtitle={laborer.designation}
        action={
          <div className="flex gap-2">
            <Badge color={laborer.is_active ? 'green' : 'gray'}>{laborer.is_active ? 'Active' : 'Inactive'}</Badge>
            <Link href={`/labor/${id}/edit`}><Button size="sm" variant="secondary" icon={<Edit size={13}/>}>Edit</Button></Link>
          </div>
        }
      />

      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Worker Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {info.map(([label, val]) => (
            <div key={label}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</div>
              <div className="text-sm text-[var(--text-primary)]">{val}</div>
            </div>
          ))}
        </div>
        {laborer.notes && <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{laborer.notes}</p>}
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Timesheet History</h3>
          <Link href={`/timesheet?laborer=${id}`}>
            <Button size="sm" icon={<Plus size={13}/>}>New Timesheet</Button>
          </Link>
        </div>
        {tsLoading ? <PageSpinner /> : !timesheets.length ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No timesheets saved for this worker yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                <th className="text-left pb-2 font-medium">Period</th>
                <th className="text-right pb-2 font-medium">Worked</th>
                <th className="text-right pb-2 font-medium">OT</th>
                <th className="text-right pb-2 font-medium">Total</th>
                <th className="text-right pb-2 font-medium">Status</th>
                <th className="text-right pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(ts => (
                <tr key={ts.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2 text-[var(--text-primary)]">{MONTHS[ts.month]} {ts.year}</td>
                  <td className="py-2 text-right text-[var(--text-primary)]">{ts.total_worked}h</td>
                  <td className="py-2 text-right" style={{ color: '#e8762b' }}>{ts.total_ot > 0 ? `+${ts.total_ot}h` : '—'}</td>
                  <td className="py-2 text-right font-medium text-[var(--text-primary)]">{ts.total_actual}h</td>
                  <td className="py-2 text-right">{timesheetStatusBadge(ts.status)}</td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/timesheet?laborer=${id}&ts=${ts.id}`}
                        className="text-xs inline-flex items-center gap-1 font-medium"
                        style={{ color: '#e8762b' }}>
                        <FileEdit size={11} /> Edit
                      </Link>
                      <Link href={`/timesheet/history/${ts.id}`}
                        className="text-xs"
                        style={{ color: 'var(--text-secondary)' }}>
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
