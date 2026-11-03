'use client';
import React, { useMemo, useState } from 'react';
import { useMachines } from '@/hooks/useMachines';
import { useVehicleRegisterReviews, submitVehicleReview } from '@/hooks/useVehicleRegisterReview';
import { useProfile } from '@/hooks/useProfile';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { CalendarCheck, AlertTriangle } from 'lucide-react';
import type { VehicleReviewClassification } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function todayDate(): string { return new Date().toISOString().slice(0, 10); }

export default function MonthlyReviewPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const { machines, loading: machinesLoading } = useMachines(false);
  const { reviews, loading: reviewsLoading, refetch } = useVehicleRegisterReviews(month, year);
  const { isAdmin, loading: profileLoading } = useProfile();
  const toast = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  const vehicles = useMemo(() => machines.filter(m => m.category === 'vehicle'), [machines]);
  const reviewByVehicle = useMemo(() => new Map(reviews.map(r => [r.vehicle_id, r])), [reviews]);
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const reminderDue = isCurrentMonth && now.getDate() >= 29 && reviews.length < vehicles.length;

  async function handleClassify(vehicleId: string, classification: VehicleReviewClassification, newDriverName?: string) {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setSaving(vehicleId);
    const err = await submitVehicleReview({
      vehicleId,
      month,
      year,
      classification,
      previousDriverName: vehicle?.operator_name ?? null,
      newDriverName: classification === 'driver_changed' ? (newDriverName || null) : null,
      effectiveDate: todayDate(),
    });
    setSaving(null);
    if (err) { toast.error(err.message); return; }
    toast.success('Review recorded');
    refetch();
  }

  if (profileLoading) return <PageSpinner />;
  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Monthly Vehicle Register Review is an administrator-only screen.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Monthly Vehicle Register Review</h1>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Classify every vehicle as unchanged, driver changed, or left the fleet. Past shifts always keep the driver name as it was at the time.</p>
      </div>

      {reminderDue && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 16 }}>
          <AlertTriangle size={14} color="#dc2626" />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#dc2626' }}>
            It&apos;s the {now.getDate()}th — {vehicles.length - reviews.length} vehicle(s) still need a review for {MONTHS[month]} {year}.
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)' }}>
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)', width: 90 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{reviews.length} / {vehicles.length} reviewed</span>
      </div>

      {machinesLoading || reviewsLoading ? <PageSpinner /> : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Vehicle', 'Type', 'Current Driver', 'Active', 'Review'].map(h => (
                  <th key={h} style={{ padding: '10px 13px', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => {
                const existing = reviewByVehicle.get(v.id);
                return (
                  <tr key={v.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                    <td style={{ padding: '10px 13px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{v.name} {v.plate_number ? `(${v.plate_number})` : ''}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.type}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.operator_name || '—'}</td>
                    <td style={{ padding: '10px 13px' }}><Badge color={v.is_active ? 'green' : 'gray'}>{v.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td style={{ padding: '10px 13px' }}>
                      {existing ? (
                        <Badge color={existing.classification === 'unchanged' ? 'green' : existing.classification === 'driver_changed' ? 'amber' : 'red'}>
                          {existing.classification.replace('_', ' ')}{existing.new_driver_name ? `: ${existing.new_driver_name}` : ''}
                        </Badge>
                      ) : (
                        <ReviewControls vehicleId={v.id} disabled={saving === v.id} onClassify={handleClassify} />
                      )}
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

function ReviewControls({ vehicleId, disabled, onClassify }: {
  vehicleId: string;
  disabled: boolean;
  onClassify: (vehicleId: string, classification: VehicleReviewClassification, newDriverName?: string) => void;
}) {
  const [newDriver, setNewDriver] = useState('');
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button disabled={disabled} onClick={() => onClassify(vehicleId, 'unchanged')} style={{
        fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none',
        background: 'rgba(34,197,94,0.1)', color: '#16a34a', cursor: disabled ? 'default' : 'pointer',
      }}><CalendarCheck size={11} style={{ display: 'inline', marginRight: 3 }} /> Unchanged</button>
      <input value={newDriver} onChange={e => setNewDriver(e.target.value)} placeholder="New driver…" disabled={disabled}
        style={{ fontSize: 11, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--input-bg)', width: 100 }} />
      <button disabled={disabled || !newDriver.trim()} onClick={() => onClassify(vehicleId, 'driver_changed', newDriver.trim())} style={{
        fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none',
        background: 'rgba(245,158,11,0.12)', color: '#d97706', cursor: disabled ? 'default' : 'pointer', opacity: newDriver.trim() ? 1 : 0.5,
      }}>Driver Changed</button>
      <button disabled={disabled} onClick={() => onClassify(vehicleId, 'left_fleet')} style={{
        fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6, border: 'none',
        background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: disabled ? 'default' : 'pointer',
      }}>Left Fleet</button>
    </div>
  );
}
