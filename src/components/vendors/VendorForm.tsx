'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { Vendor } from '@/types/database';

type FormData = Omit<Vendor, 'id' | 'created_at' | 'updated_at'>;

interface Props { initial?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; submitLabel?: string; }

export function VendorForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const [form, setForm] = useState<FormData>({
    name: '', contact_person: '', phone: '', email: '', address: '', notes: '', is_active: true, ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fields = [
    { label: 'Company Name', name: 'name' as const, required: true },
    { label: 'Contact Person', name: 'contact_person' as const },
    { label: 'Phone', name: 'phone' as const, type: 'tel' },
    { label: 'Email', name: 'email' as const, type: 'email' },
    { label: 'Address', name: 'address' as const },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSubmit(form); } catch (err: any) { setError(err.message); }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>
            {f.label}{f.required && <span style={{ color: '#e8762b' }}> *</span>}
          </label>
          <input type={f.type ?? 'text'} required={f.required} value={form[f.name] as string}
            onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none"
            style={{ background: '#0f1117', border: '1px solid #2d3454' }}
            onFocus={e => (e.target.style.borderColor = '#e8762b')}
            onBlur={e => (e.target.style.borderColor = '#2d3454')}
          />
        </div>
      ))}
      <div>
        <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Notes</label>
        <textarea value={form.notes ?? ''} rows={3}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          style={{ background: '#0f1117', border: '1px solid #2d3454' }}
          onFocus={e => (e.target.style.borderColor = '#e8762b')}
          onBlur={e => (e.target.style.borderColor = '#2d3454')}
        />
      </div>
      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
