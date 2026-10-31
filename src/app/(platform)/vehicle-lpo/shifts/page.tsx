'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useShifts, submitShift, approveShift, cancelShift } from '@/hooks/useShifts';
import { useMachines } from '@/hooks/useMachines';
import { useProfile } from '@/hooks/useProfile';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Plus, ClipboardList } from 'lucide-react';
import type { ShiftStatus, ShiftType } from '@/types/database';

function shiftStatusBadge(status: ShiftStatus) {
  const map: Record<ShiftStatus, 'gray' | 'blue' | 'green' | 'red'> = {
    draft: 'gray', submitted: 'blue', approved: 'green', cancelled: 'red',
  };
  return <Badge color={map[status]}>{status}</Badge>;
}

export default function ShiftHistoryPage() {
  const [vehicleId, setVehicleId] = useState('');
  const [shiftType, setShiftType] = useState<ShiftType | ''>('');
  const [status, setStatus] = useState<ShiftStatus | ''>('');
  const { shifts, loading, refetch } = useShifts({
    vehicleId: vehicleId || undefined,
    shiftType: shiftType || undefined,
    status: status || undefined,
  });
  const { machines } = useMachines();
  const { isAdmin } = useProfile();
  const toast = useToast();
  const vehicles = machines.filter(m => m.category === 'vehicle');

  async function handleSubmit(id: string) {
    const err = await submitShift(id);
    if (err) toast.error(err.message); else { toast.success('Shift submitted'); refetch(); }
  }
  async function handleApprove(id: string) {
    const err = await approveShift(id);
    if (err) toast.error(err.message); else { toast.success('Shift approved — LPO balance updated'); refetch(); }
  }
  async function handleCancel(id: string) {
    if (!window.confirm('Cancel this shift?')) return;
    const err = await cancelShift(id);
    if (err) toast.error(err.message); else { toast.success('Shift cancelled'); refetch(); }
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{
            fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9,
            border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)', cursor: 'pointer', outline: 'none',
          }}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.type})</option>)}
          </select>
          <select value={shiftType} onChange={e => setShiftType(e.target.value as ShiftType | '')} style={{
            fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9,
            border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)', cursor: 'pointer', outline: 'none',
          }}>
            <option value="">Day &amp; Night</option>
            <option value="day">☀ Day</option>
            <option value="night">🌙 Night</option>
          </select>
          <select value={status} onChange={e => setStatus(e.target.value as ShiftStatus | '')} style={{
            fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9,
            border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)', cursor: 'pointer', outline: 'none',
          }}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <Link href="/vehicle-lpo/shifts/new" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--orange)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 9,
          fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          <Plus size={14} /> New Shift
        </Link>
      </div>

      {loading ? <PageSpinner /> : !shifts.length ? (
        <EmptyState icon={<ClipboardList size={24} />} title="No shifts found" description="Create a shift to get started." />
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Date', 'Shift', 'Vehicle', 'Driver', 'LPO', 'Hrs', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 13px', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-secondary)' }}>{s.shift_date}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12 }}>{s.shift_type === 'day' ? '☀ Day' : '🌙 Night'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {s.vehicle?.name ?? s.vehicle_type_snapshot} {s.vehicle_plate_snapshot ? `(${s.vehicle_plate_snapshot})` : ''}
                  </td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>
                    {s.driver_name_snapshot || '—'}{s.overridden_driver && <span title={s.override_reason ?? ''} style={{ marginLeft: 4, fontSize: 10, color: 'var(--orange)' }}>(changed)</span>}
                  </td>
                  <td style={{ padding: '10px 13px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-light)' }}>{s.lpo_number_snapshot || '—'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.net_hours}</td>
                  <td style={{ padding: '10px 13px' }}>{shiftStatusBadge(s.status)}</td>
                  <td style={{ padding: '10px 13px' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.status === 'draft' && (
                        <button onClick={() => handleSubmit(s.id)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none', background: 'rgba(37,99,235,0.1)', color: '#2563eb', cursor: 'pointer' }}>SUBMIT</button>
                      )}
                      {isAdmin && (s.status === 'submitted' || s.status === 'draft') && (
                        <button onClick={() => handleApprove(s.id)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none', background: 'var(--orange)', color: '#fff', cursor: 'pointer' }}>APPROVE</button>
                      )}
                      {s.status !== 'cancelled' && (isAdmin || s.status === 'draft') && (
                        <button onClick={() => handleCancel(s.id)} style={{ fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}>CANCEL</button>
                      )}
                    </div>
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
