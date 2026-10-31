'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useLpos } from '@/hooks/useLpos';
import { useShifts } from '@/hooks/useShifts';
import { useMachines } from '@/hooks/useMachines';
import { useVehicleRegisterReviews } from '@/hooks/useVehicleRegisterReview';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, FileText, ClipboardList, Truck, Plus } from 'lucide-react';

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)',
  overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};
const cardHeaderStyle: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid var(--border)',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const cardTitleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' };
const viewAllStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, background: 'var(--bg-canvas)', color: 'var(--text-muted)',
  padding: '4px 9px', borderRadius: 6, textDecoration: 'none', border: '1px solid var(--border)',
};

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{ ...cardStyle, padding: '16px 18px' }}>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? 'var(--text-primary)', marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function VehicleLpoDashboardPage() {
  const now = new Date();
  const { lpos, loading: lposLoading } = useLpos();
  const { machines, loading: machinesLoading } = useMachines();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { shifts, loading: shiftsLoading } = useShifts({ dateFrom: monthStart });
  const { reviews } = useVehicleRegisterReviews(now.getMonth(), now.getFullYear());

  const vehicles = useMemo(() => machines.filter(m => m.category === 'vehicle'), [machines]);
  const activeLpos = lpos.filter(l => l.status === 'active');
  const pendingRenewal = lpos.filter(l => l.status === 'pending_renewal');
  const approvedThisMonth = shifts.filter(s => s.status === 'approved').length;
  const pendingApproval = shifts.filter(s => s.status === 'submitted').length;
  const reviewDue = now.getDate() >= 29 && reviews.length < vehicles.length;

  const loading = lposLoading || machinesLoading || shiftsLoading;

  return (
    <div style={{ padding: '20px 24px' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Vehicle LPO &amp; Shift Management</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>LPO balances, shift approvals and the monthly vehicle register review.</p>

      {reviewDue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#dc2626' }}>
            Monthly vehicle register review is due — {vehicles.length - reviews.length} vehicle(s) not yet reviewed this month.
          </span>
          <Link href="/vehicle-lpo/monthly-review" style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: '#dc2626', textDecoration: 'underline' }}>Review now →</Link>
        </div>
      )}

      {loading ? <PageSpinner /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="Active LPOs" value={activeLpos.length} />
            <StatCard label="Pending Renewal" value={pendingRenewal.length} color={pendingRenewal.length ? '#dc2626' : undefined} />
            <StatCard label="Approved Shifts (this month)" value={approvedThisMonth} />
            <StatCard label="Awaiting Approval" value={pendingApproval} color={pendingApproval ? 'var(--orange)' : undefined} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={cardTitleStyle}>⚠ Pending Renewal</span>
                <Link href="/vehicle-lpo/lpos" style={viewAllStyle}>View All →</Link>
              </div>
              {!pendingRenewal.length ? (
                <div style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No LPOs need renewal.</div>
              ) : (
                <div>
                  {pendingRenewal.map(l => (
                    <Link key={l.id} href={`/vehicle-lpo/lpos/${l.id}`} style={{
                      padding: '9px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      borderBottom: '1px solid #f8f6f2', textDecoration: 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{l.lpo_number}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{l.vehicle_type?.name}</div>
                      </div>
                      <Badge color="red">{l.quantity_total - l.quantity_used} remaining</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <span style={cardTitleStyle}>📋 Quick Actions</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/vehicle-lpo/shifts/new" style={{ flex: 1, minWidth: 140, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#ff6b2b', background: 'rgba(255,107,43,0.08)', border: '1px solid #ff6b2b33', borderRadius: 8, padding: '10px 12px', textDecoration: 'none' }}>
                  <Plus size={13} /> New Shift
                </Link>
                <Link href="/vehicle-lpo/lpos/new" style={{ flex: 1, minWidth: 140, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.08)', border: '1px solid #3b82f633', borderRadius: 8, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={13} /> New LPO
                </Link>
                <Link href="/vehicle-lpo/shifts" style={{ flex: 1, minWidth: 140, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#16a34a', background: 'rgba(34,197,94,0.1)', border: '1px solid #16a34a33', borderRadius: 8, padding: '10px 12px', textDecoration: 'none' }}>
                  <ClipboardList size={13} /> Shift History
                </Link>
                <Link href="/vehicle-lpo/monthly-review" style={{ flex: 1, minWidth: 140, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'rgba(124,58,237,0.1)', border: '1px solid #7c3aed33', borderRadius: 8, padding: '10px 12px', textDecoration: 'none' }}>
                  <Truck size={13} /> Monthly Review
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
