'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getMachineById, deactivateMachine, reactivateMachine } from '@/hooks/useMachines';
import { useMachineUsage } from '@/hooks/useMachineUsage';
import { PageSpinner } from '@/components/ui/Spinner';
import { machineStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Edit, Plus, Power } from 'lucide-react';
import type { Machine } from '@/types/database';

export default function MachineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine | null>(null);
  const { logs, loading: logsLoading } = useMachineUsage(id);
  const totalHours = logs.reduce((s, l) => s + l.hours_used, 0);

  const { confirm, dialog } = useConfirmDialog();
  const toast = useToast();

  useEffect(() => { getMachineById(id).then(setMachine); }, [id]);

  async function handleToggleActive() {
    const isActive = machine!.is_active;
    const ok = await confirm({
      title: isActive ? 'Deactivate Vehicle' : 'Reactivate Vehicle',
      message: isActive
        ? `Are you sure you want to deactivate "${machine!.name}"? It will be hidden from the equipment list.`
        : `Are you sure you want to reactivate "${machine!.name}"?`,
      confirmLabel: isActive ? 'Deactivate' : 'Reactivate',
      variant: isActive ? 'danger' : 'info',
    });
    if (!ok) return;
    const err = isActive ? await deactivateMachine(id) : await reactivateMachine(id);
    if (!err) {
      setMachine(prev => prev ? { ...prev, is_active: !isActive } : prev);
      toast.success(isActive ? 'Vehicle deactivated' : 'Vehicle reactivated');
    } else {
      toast.error('Failed to update vehicle status');
    }
  }

  if (!machine) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      <PageHeader title={machine.name}
        subtitle={`${machine.type}${machine.model ? ' · ' + machine.model : ''}`}
        action={
          <div className="flex gap-2 items-center">
            {machineStatusBadge(machine.status)}
            <Link href={`/machines/${id}/edit`}><Button size="sm" variant="secondary" icon={<Edit size={13}/>}>Edit</Button></Link>
            <Button size="sm" variant={machine.is_active ? 'danger' : 'secondary'} icon={<Power size={13}/>} onClick={handleToggleActive}>
              {machine.is_active ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          ['Company', (machine.vendor as any)?.name ?? '—'],
          ['Contact Person', machine.contact_person || '—'],
          ['Contact Number', machine.contact_number || '—'],
          ['Vehicle Number', machine.plate_number || '—'],
          ['Operator Name', machine.operator_name || '—'],
          ['Operator ID', machine.operator_id || '—'],
          ['Daily Rate', machine.daily_rate ? `AED ${machine.daily_rate}` : '—'],
          ['Total Hours Logged', `${totalHours.toFixed(1)}h`],
        ].map(([label, val]) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10.5px', fontWeight: 600 }}>{label}</div>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{val}</div>
          </div>
        ))}
      </div>

      {/* Photos & Cards */}
      {(machine.vehicle_photo || machine.vehicle_card || machine.operator_card) && (
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Photos & Cards</div>
          <div className="flex gap-6 flex-wrap">
            {machine.vehicle_photo && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Vehicle Photo</div>
                <img src={machine.vehicle_photo} alt="Vehicle" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
            )}
            {machine.vehicle_card && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Vehicle Card</div>
                <img src={machine.vehicle_card} alt="Vehicle Card" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
            )}
            {machine.operator_card && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Operator Card</div>
                <img src={machine.operator_card} alt="Operator Card" style={{ width: 200, height: 150, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
              </div>
            )}
          </div>
        </div>
      )}

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
      {dialog}
    </div>
  );
}
