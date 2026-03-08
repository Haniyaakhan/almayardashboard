'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMachineById } from '@/hooks/useMachines';
import { useMachineUsage } from '@/hooks/useMachineUsage';
import { PageSpinner } from '@/components/ui/Spinner';
import { machineStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Edit, Plus } from 'lucide-react';
import type { Machine } from '@/types/database';

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine | null>(null);
  const { logs, loading: logsLoading } = useMachineUsage(id);
  const totalHours = logs.reduce((s, l) => s + l.hours_used, 0);

  useEffect(() => { getMachineById(id).then(setMachine); }, [id]);
  if (!machine) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      <PageHeader title={machine.name}
        subtitle={`${machine.type}${machine.model ? ' · ' + machine.model : ''}`}
        action={
          <div className="flex gap-2 items-center">
            {machineStatusBadge(machine.status)}
            <Link href={`/machines/${id}/edit`}><Button size="sm" variant="secondary" icon={<Edit size={13}/>}>Edit</Button></Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Company', (machine.vendor as any)?.name ?? '—'],
          ['Plate No.', machine.plate_number || '—'],
          ['Daily Rate', machine.daily_rate ? `AED ${machine.daily_rate}` : '—'],
          ['Total Hours Logged', `${totalHours.toFixed(1)}h`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="text-base font-semibold text-[var(--text-primary)]">{val}</div>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Usage Log ({logs.length} entries)</h3>
          <Link href={`/machines/${id}/usage/new`}><Button size="sm" icon={<Plus size={13}/>}>Log Usage</Button></Link>
        </div>
        {logsLoading ? <PageSpinner /> : !logs.length ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No usage logged yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr style={{ color: 'var(--text-muted)' }}>
              {['Date','Hours','Operator','Task','Fuel','Remarks'].map(h => <th key={h} className="text-left pb-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2 text-[var(--text-primary)]">{log.log_date}</td>
                  <td className="py-2 font-medium" style={{ color: '#e8762b' }}>{log.hours_used}h</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{log.operator_name || '—'}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{log.task_description || '—'}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{log.fuel_consumed ? `${log.fuel_consumed}L` : '—'}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{log.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
