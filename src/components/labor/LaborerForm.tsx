'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Laborer } from '@/types/database';

type FormData = Omit<Laborer, 'id' | 'created_at' | 'updated_at'>;

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
}

const field = (label: string, name: keyof FormData, type = 'text', required = false) =>
  ({ label, name, type, required });

const fields = [
  field('Full Name',        'full_name',     'text',   true),
  field('Designation',      'designation',   'text',   true),
  field('Contractor', 'supplier_name'),
  field('ID / Iqama No.',   'id_number'),
  field('Nationality',      'nationality'),
  field('Phone',            'phone',         'tel'),
  field('Daily Rate (AED)', 'daily_rate',    'number'),
];

export function LaborerForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const [form, setForm] = useState<FormData>({
    full_name: '', designation: '', supplier_name: '', id_number: '',
    nationality: '', phone: '', daily_rate: null, is_active: true, notes: '',
    ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof FormData, value: unknown) {
    setForm(p => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try { await onSubmit(form); } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {f.label}{f.required && <span style={{ color: '#e8762b' }}> *</span>}
          </label>
          <input
            type={f.type} required={f.required}
            value={(form[f.name] ?? '') as string}
            onChange={e => set(f.name, f.type === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      ))}

      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
        <textarea
          value={form.notes ?? ''} rows={3}
          onChange={e => set('notes', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = '#e8762b')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('is_active', !form.is_active)}
          style={{
            width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
            background: form.is_active ? '#16a34a' : 'var(--border)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: form.is_active ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {form.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
