'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useVendors } from '@/hooks/useVendors';
import type { Machine } from '@/types/database';

type FormData = Omit<Machine, 'id' | 'created_at' | 'updated_at' | 'vendor'>;

interface Props { initial?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; submitLabel?: string; }

const machineTypes = ['Excavator','Crane','Bulldozer','Compactor','Loader','Grader','Dump Truck','Concrete Mixer','Generator','Pump','Other'];

export function MachineForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const { vendors } = useVendors();
  const [form, setForm] = useState<FormData>({
    vendor_id: null, name: '', type: '', plate_number: '', model: '',
    year: null, daily_rate: null, status: 'available', notes: '', is_active: true, ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof FormData, value: unknown) { setForm(p => ({ ...p, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSubmit(form); } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = '#e8762b');
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => (e.target.style.borderColor = 'var(--border)');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Contractor / Supplier</label>
        <select value={form.vendor_id ?? ''} onChange={e => set('vendor_id', e.target.value || null)}
          className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
          <option value="">— No vendor —</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Machine Name <span style={{ color: '#e8762b' }}>*</span></label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Machine Type <span style={{ color: '#e8762b' }}>*</span></label>
        <select required value={form.type} onChange={e => set('type', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
          <option value="">Select type…</option>
          {machineTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {[
        { label: 'Plate / Unit No.', name: 'plate_number' as const },
        { label: 'Model', name: 'model' as const },
      ].map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
          <input value={form[f.name] as string} onChange={e => set(f.name, e.target.value)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Year</label>
          <input type="number" min="1990" max="2030" value={form.year ?? ''}
            onChange={e => set('year', e.target.value ? Number(e.target.value) : null)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Daily Rate (AED)</label>
          <input type="number" value={form.daily_rate ?? ''}
            onChange={e => set('daily_rate', e.target.value ? Number(e.target.value) : null)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
        <select value={form.status} onChange={e => set('status', e.target.value as Machine['status'])}
          className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
          {['available','in_use','maintenance','returned'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
