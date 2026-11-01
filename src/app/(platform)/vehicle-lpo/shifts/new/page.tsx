'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMachines } from '@/hooks/useMachines';
import { useProfile } from '@/hooks/useProfile';
import { createShift, findActiveLpoForVehicle, hasExistingShift } from '@/hooks/useShifts';
import { computeShiftTimes, DAY_TEMPLATE, NIGHT_TEMPLATE } from '@/lib/shiftTemplates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useToast } from '@/components/ui/Toast';
import { Truck, AlertTriangle, CalendarRange } from 'lucide-react';
import type { Machine, Lpo, ShiftType } from '@/types/database';

const inputClass = 'w-full px-3 py-2 rounded-lg text-sm outline-none';
const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = '#e8762b';
  e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)';
};
const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
  e.target.style.borderColor = 'var(--border)';
  e.target.style.boxShadow = 'none';
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  if (end < start) return dates;
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export default function NewShiftPage() {
  const router = useRouter();
  const toast = useToast();
  const { machines, loading: machinesLoading } = useMachines();
  const { isAdmin } = useProfile();
  const vehicles = useMemo(() => machines.filter(m => m.category === 'vehicle'), [machines]);
  const vehicleOptions = useMemo(() => vehicles.map(v => ({
    value: v.id,
    label: `${v.name}${v.plate_number ? ` (${v.plate_number})` : ''}`,
    sublabel: v.type,
  })), [vehicles]);

  const [bulkMode, setBulkMode] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [shiftDate, setShiftDate] = useState(todayDate());
  const [rangeFrom, setRangeFrom] = useState(todayDate());
  const [rangeTo, setRangeTo] = useState(todayDate());
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [driverOverride, setDriverOverride] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lpo, setLpo] = useState<Lpo | null>(null);
  const [lpoLoading, setLpoLoading] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);
  const [overrideDuplicate, setOverrideDuplicate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedVehicle: Machine | undefined = vehicles.find(v => v.id === vehicleId);
  const times = !bulkMode && shiftDate ? computeShiftTimes(shiftDate, shiftType) : null;
  const template = shiftType === 'day' ? DAY_TEMPLATE : NIGHT_TEMPLATE;
  const rangeDates = bulkMode ? dateRange(rangeFrom, rangeTo) : [];

  useEffect(() => {
    setDriverOverride('');
    setLpo(null);
    if (!vehicleId) return;
    setLpoLoading(true);
    findActiveLpoForVehicle(vehicleId).then(l => { setLpo(l); setLpoLoading(false); });
  }, [vehicleId]);

  useEffect(() => {
    setOverrideDuplicate(false);
    if (bulkMode || !vehicleId || !shiftDate) { setDuplicateExists(false); return; }
    hasExistingShift(vehicleId, shiftDate, shiftType).then(setDuplicateExists);
  }, [vehicleId, shiftDate, shiftType, bulkMode]);

  const remainingQty = lpo ? lpo.quantity_total - lpo.quantity_used : null;
  const canSubmit = bulkMode
    ? Boolean(vehicleId && lpo && rangeDates.length > 0)
    : Boolean(vehicleId && shiftDate && lpo && (!duplicateExists || (isAdmin && overrideDuplicate)));

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);

    if (!bulkMode) {
      const { error } = await createShift({
        vehicleId,
        shiftDate,
        shiftType,
        driverNameOverride: driverOverride.trim() || undefined,
        overrideReason: driverOverride.trim() ? overrideReason.trim() || undefined : undefined,
        overrideDuplicate: duplicateExists ? overrideDuplicate : false,
        remarks: remarks.trim() || undefined,
      });
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }
      toast.success('Shift created as draft');
      router.push('/vehicle-lpo/shifts');
      return;
    }

    // Bulk/date-range mode: one shift per day, silently skipping days that
    // already have a shift (duplicate-key errors) rather than failing the batch.
    let created = 0, skipped = 0, failed = 0;
    for (const date of rangeDates) {
      const { error } = await createShift({
        vehicleId,
        shiftDate: date,
        shiftType,
        driverNameOverride: driverOverride.trim() || undefined,
        overrideReason: driverOverride.trim() ? overrideReason.trim() || undefined : undefined,
        remarks: remarks.trim() || undefined,
      });
      if (!error) created++;
      else if (/duplicate|unique/i.test(error.message)) skipped++;
      else failed++;
    }
    setSubmitting(false);
    if (created > 0) toast.success(`Created ${created} shift(s)${skipped ? `, skipped ${skipped} already existing` : ''}${failed ? `, ${failed} failed` : ''}`);
    else toast.error(skipped > 0 ? 'All days in this range already have a shift' : 'No shifts were created');
    if (created > 0) router.push('/vehicle-lpo/shifts');
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>New Shift</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>
        Select a vehicle — driver, vehicle type and the applicable LPO auto-fill from its record.
      </p>

      <div className="flex items-center gap-1.5 mb-4">
        {([
          { label: 'Single Day', value: false },
          { label: 'Date Range', value: true },
        ] as const).map(t => (
          <button key={String(t.value)} onClick={() => setBulkMode(t.value)} style={{
            fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
            border: bulkMode === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
            background: bulkMode === t.value ? 'var(--navy)' : 'var(--bg-card)',
            color: bulkMode === t.value ? '#fff' : 'var(--text-light)',
          }}>{t.label}</button>
        ))}
      </div>

      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Vehicle <span style={{ color: '#e8762b' }}>*</span></label>
            <SearchableSelect
              options={vehicleOptions}
              value={vehicleId}
              onChange={setVehicleId}
              disabled={machinesLoading}
              placeholder="Type to search vehicles…"
            />
          </div>

          {selectedVehicle && (
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
              padding: '12px 14px', borderRadius: 10, background: 'var(--bg-canvas)', border: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vehicle Type</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVehicle.type || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Driver</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{selectedVehicle.operator_name || '—'}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Linked LPO</div>
                {lpoLoading ? (
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Checking…</div>
                ) : lpo ? (
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {lpo.lpo_number} <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>({remainingQty} of {lpo.quantity_total} remaining)</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#dc2626' }}>
                    <AlertTriangle size={13} /> No active LPO covers this vehicle&apos;s type — submission is blocked until one is linked.
                  </div>
                )}
              </div>
            </div>
          )}

          {bulkMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>From <span style={{ color: '#e8762b' }}>*</span></label>
                <input type="date" required value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
                  className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>To <span style={{ color: '#e8762b' }}>*</span></label>
                <input type="date" required value={rangeTo} onChange={e => setRangeTo(e.target.value)}
                  className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Shift <span style={{ color: '#e8762b' }}>*</span></label>
                <select required value={shiftType} onChange={e => setShiftType(e.target.value as ShiftType)}
                  className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
                  <option value="day">☀ Day</option>
                  <option value="night">🌙 Night</option>
                </select>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Shift Date <span style={{ color: '#e8762b' }}>*</span></label>
                <input type="date" required value={shiftDate} onChange={e => setShiftDate(e.target.value)}
                  className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Shift <span style={{ color: '#e8762b' }}>*</span></label>
                <select required value={shiftType} onChange={e => setShiftType(e.target.value as ShiftType)}
                  className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
                  <option value="day">☀ Day</option>
                  <option value="night">🌙 Night</option>
                </select>
              </div>
            </div>
          )}

          {bulkMode && rangeDates.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 10, background: 'var(--orange-lt)', border: '1px solid var(--orange)33' }}>
              <CalendarRange size={13} style={{ color: 'var(--orange)' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>
                Will create up to {rangeDates.length} {shiftType} shift(s), one per day — days that already have one are skipped automatically.
              </span>
            </div>
          )}

          {times && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--orange-lt)', border: '1px solid var(--orange)33' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--orange)' }}>
                {template.firstIn}–{template.firstOut}, break {template.breakStart}–{template.breakEnd}, {template.secondIn}–{template.secondOut}
                {shiftType === 'night' ? ' (next day)' : ''} — calculated {(times as { netHours: number }).netHours} net hours
              </div>
            </div>
          )}

          {!bulkMode && duplicateExists && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: '#dc2626' }}>
                <AlertTriangle size={13} /> A {shiftType} shift already exists for this vehicle on this date.
              </div>
              {isAdmin ? (
                <label className="flex items-center gap-2" style={{ marginTop: 8, fontSize: 12, color: 'var(--text-light)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={overrideDuplicate} onChange={e => setOverrideDuplicate(e.target.checked)} />
                  Override and create anyway
                </label>
              ) : (
                <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)' }}>Only an administrator can override this.</div>
              )}
            </div>
          )}

          {isAdmin && selectedVehicle && (
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                Driver Override <span style={{ fontWeight: 400 }}>(leave blank to use {selectedVehicle.operator_name || 'the assigned driver'})</span>
              </label>
              <input value={driverOverride} onChange={e => setDriverOverride(e.target.value)}
                placeholder={selectedVehicle.operator_name || 'Driver name'}
                className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
              {driverOverride.trim() && (
                <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Reason for change (optional)"
                  className={inputClass} style={{ ...inputStyle, marginTop: 8 }} onFocus={focus} onBlur={blur} />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Remarks {bulkMode && <span style={{ fontWeight: 400 }}>(applied to every day created)</span>}</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2}
              className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => router.push('/vehicle-lpo/shifts')}>Cancel</Button>
            <Button variant="primary" icon={<Truck size={14} />} loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
              {bulkMode ? `Create ${rangeDates.length || ''} Shifts` : 'Create Shift'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
