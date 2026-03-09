'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Vendor } from '@/types/database';

type FormData = Omit<Vendor, 'id' | 'created_at' | 'updated_at'>;

interface Props { initial?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; submitLabel?: string; }

export function VendorForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormData>({
    name: '', contact_person: '', contact_person_phone: '', company_phone: '', email: '', address: '', notes: '', is_active: true, ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fields = [
    { label: 'Company Name', name: 'name' as const, required: true },
    { label: 'Contact Person', name: 'contact_person' as const },
    { label: 'Contact Person Phone', name: 'contact_person_phone' as const, type: 'tel' },
    { label: 'Company Phone', name: 'company_phone' as const, type: 'tel' },
    { label: 'Email', name: 'email' as const, type: 'email' },
    { label: 'Address', name: 'address' as const },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSubmit(form); } catch (err: any) { setError(err.message); toast.error(err.message); }
    setLoading(false);
  }

  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
            {f.label}{f.required && <span style={{ color: '#e8762b' }}> *</span>}
          </label>
          <input type={f.type ?? 'text'} required={f.required} value={form[f.name] as string}
            onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
            onFocus={e => (e.target.style.borderColor = '#e8762b')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>
      ))}
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
        <textarea value={form.notes ?? ''} rows={3}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = '#e8762b')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>
      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
