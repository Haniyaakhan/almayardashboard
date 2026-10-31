'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLpos } from '@/hooks/useLpos';
import { useProfile } from '@/hooks/useProfile';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Plus, FileText } from 'lucide-react';
import type { LpoStatus } from '@/types/database';

function lpoStatusBadge(status: LpoStatus) {
  const map: Record<LpoStatus, 'green' | 'red' | 'gray'> = { active: 'green', pending_renewal: 'red', closed: 'gray' };
  const label: Record<LpoStatus, string> = { active: 'Active', pending_renewal: 'Pending Renewal', closed: 'Closed' };
  return <Badge color={map[status]}>{label[status]}</Badge>;
}

export default function LpoListPage() {
  const [statusFilter, setStatusFilter] = useState<LpoStatus | ''>('');
  const { lpos, loading } = useLpos(statusFilter || undefined);
  const { isAdmin } = useProfile();

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {([
            { label: 'All', value: '' },
            { label: 'Active', value: 'active' },
            { label: 'Pending Renewal', value: 'pending_renewal' },
            { label: 'Closed', value: 'closed' },
          ] as const).map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              border: statusFilter === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: statusFilter === t.value ? 'var(--navy)' : 'var(--bg-card)',
              color: statusFilter === t.value ? '#fff' : 'var(--text-light)',
            }}>{t.label}</button>
          ))}
        </div>
        {isAdmin && (
          <Link href="/vehicle-lpo/lpos/new" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Plus size={14} /> New LPO
          </Link>
        )}
      </div>

      {loading ? <PageSpinner /> : !lpos.length ? (
        <EmptyState icon={<FileText size={24} />} title="No LPOs found" description={isAdmin ? 'Create an LPO to link against a vehicle type.' : 'No LPOs have been created yet.'} />
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['LPO Number', 'Vehicle Type', 'Original', 'Used', 'Remaining', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 13px', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lpos.map(l => {
                const remaining = l.quantity_total - l.quantity_used;
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                    <td style={{ padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{l.lpo_number}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.vehicle_type?.name ?? '—'}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.quantity_total}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.quantity_used}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 700, color: remaining <= 0 ? '#dc2626' : 'var(--text-primary)' }}>{remaining}</td>
                    <td style={{ padding: '10px 13px' }}>{lpoStatusBadge(l.status)}</td>
                    <td style={{ padding: '10px 13px' }}>
                      <Link href={`/vehicle-lpo/lpos/${l.id}`} style={{
                        fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                        border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)', textDecoration: 'none',
                      }}>VIEW</Link>
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
