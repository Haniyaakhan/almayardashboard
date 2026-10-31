'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLpoById, getLpoRenewals, renewLpo, closeLpo } from '@/hooks/useLpos';
import { useShifts } from '@/hooks/useShifts';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { RefreshCcw, XCircle } from 'lucide-react';
import type { Lpo, LpoRenewal, LpoStatus } from '@/types/database';

function lpoStatusBadge(status: LpoStatus) {
  const map: Record<LpoStatus, 'green' | 'red' | 'gray'> = { active: 'green', pending_renewal: 'red', closed: 'gray' };
  const label: Record<LpoStatus, string> = { active: 'Active', pending_renewal: 'Pending Renewal', closed: 'Closed' };
  return <Badge color={map[status]}>{label[status]}</Badge>;
}

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm outline-none';
const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

export default function LpoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { isAdmin } = useProfile();
  const [lpo, setLpo] = useState<Lpo | null>(null);
  const [renewals, setRenewals] = useState<LpoRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [renewQty, setRenewQty] = useState('');
  const [renewNote, setRenewNote] = useState('');
  const [renewing, setRenewing] = useState(false);
  const { shifts, loading: shiftsLoading } = useShifts({ lpoId: params.id });

  const load = useCallback(async () => {
    setLoading(true);
    const [l, r] = await Promise.all([getLpoById(params.id), getLpoRenewals(params.id)]);
    setLpo(l);
    setRenewals(r);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function handleRenew() {
    const qty = Number(renewQty);
    if (!qty || qty <= 0) return;
    setRenewing(true);
    const err = await renewLpo(params.id, qty, renewNote.trim() || undefined);
    setRenewing(false);
    if (err) { toast.error(err.message); return; }
    toast.success(`LPO renewed with +${qty}`);
    setRenewQty(''); setRenewNote('');
    load();
  }

  async function handleClose() {
    if (!window.confirm('Close this LPO? It will no longer be used for new shifts.')) return;
    const err = await closeLpo(params.id);
    if (err) { toast.error(err.message); return; }
    toast.success('LPO closed');
    load();
  }

  if (loading) return <PageSpinner />;
  if (!lpo) return <div style={{ padding: 24 }}>LPO not found.</div>;

  const remaining = lpo.quantity_total - lpo.quantity_used;

  return (
    <div style={{ padding: '20px 24px', maxWidth: 820 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{lpo.lpo_number}</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{lpo.vehicle_type?.name ?? '—'} vehicles</p>
        </div>
        <div className="flex items-center gap-2">
          {lpoStatusBadge(lpo.status)}
          {isAdmin && lpo.status !== 'closed' && (
            <Button variant="ghost" size="sm" icon={<XCircle size={13} />} onClick={handleClose}>Close LPO</Button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Original Quantity', value: lpo.quantity_total },
          { label: 'Used', value: lpo.quantity_used },
          { label: 'Remaining', value: remaining, color: remaining <= 0 ? '#dc2626' : 'var(--text-primary)' },
        ].map(stat => (
          <Card key={stat.label} padding="p-4">
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color ?? 'var(--text-primary)', marginTop: 4 }}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {isAdmin && lpo.status !== 'closed' && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Renew LPO</div>
          <div className="flex items-end gap-3 flex-wrap">
            <div style={{ width: 140 }}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Add Quantity</label>
              <input type="number" min={1} value={renewQty} onChange={e => setRenewQty(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Note</label>
              <input value={renewNote} onChange={e => setRenewNote(e.target.value)} className={inputClass} style={inputStyle} />
            </div>
            <Button variant="primary" icon={<RefreshCcw size={13} />} loading={renewing} disabled={!renewQty || Number(renewQty) <= 0} onClick={handleRenew}>
              Renew
            </Button>
          </div>
        </Card>
      )}

      {renewals.length > 0 && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Renewal History</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {renewals.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid #f4f1ed' }}>
                <span style={{ color: 'var(--text-light)' }}>+{r.added_quantity} ({r.previous_quantity_total} → {r.new_quantity_total}){r.note ? ` — ${r.note}` : ''}</span>
                <span style={{ color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>Shifts Against This LPO</div>
        {shiftsLoading ? <PageSpinner /> : !shifts.length ? (
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No shifts recorded yet.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Shift', 'Vehicle', 'Status'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} style={{ borderTop: '1px solid #f4f1ed' }}>
                  <td style={{ padding: '6px 8px', fontSize: 12 }}>{s.shift_date}</td>
                  <td style={{ padding: '6px 8px', fontSize: 12 }}>{s.shift_type === 'day' ? '☀ Day' : '🌙 Night'}</td>
                  <td style={{ padding: '6px 8px', fontSize: 12 }}>{s.vehicle?.name ?? s.vehicle_type_snapshot}</td>
                  <td style={{ padding: '6px 8px', fontSize: 12 }}><Badge color={s.status === 'approved' ? 'green' : s.status === 'cancelled' ? 'red' : 'gray'}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ marginTop: 16 }}>
        <Button variant="secondary" onClick={() => router.push('/vehicle-lpo/lpos')}>Back to LPOs</Button>
      </div>
    </div>
  );
}
