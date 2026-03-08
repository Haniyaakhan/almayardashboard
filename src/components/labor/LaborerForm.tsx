'use client';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
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

const bankFields = [
  field('Bank Name',           'bank_name'),
  field('Bank Account Number', 'bank_account_number'),
];

async function uploadPhoto(file: File, folder: string): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('laborer-photos').upload(fileName, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabase.storage.from('laborer-photos').getPublicUrl(fileName);
  return data.publicUrl;
}

function PhotoUpload({ label, value, onChange }: { label: string; value: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadPhoto(file, label.toLowerCase().replace(/\s+/g, '-'));
    if (url) onChange(url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{label}</label>
      {value ? (
        <div style={{
          position: 'relative', width: 160, height: 120, borderRadius: 10,
          overflow: 'hidden', border: '1px solid var(--border)',
        }}>
          <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              position: 'absolute', top: 4, right: 4,
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', border: 'none',
              color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 160, height: 120, borderRadius: 10,
            border: '2px dashed var(--border)',
            background: 'var(--input-bg)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 6, fontSize: 12, fontWeight: 500,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange)'; e.currentTarget.style.color = 'var(--orange)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          {uploading ? (
            <span>Uploading...</span>
          ) : (
            <>
              <Upload size={20} />
              <span>Upload Photo</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}

export function LaborerForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const toast = useToast();
  const [form, setForm] = useState<FormData>({
    full_name: '', designation: '', supplier_name: '', id_number: '',
    nationality: '', phone: '', daily_rate: null, is_active: true, notes: '',
    front_photo: null, back_photo: null, bank_name: null, bank_account_number: null,
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
    try { await onSubmit(form); } catch (err: any) { setError(err.message); toast.error(err.message); }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* Basic Fields */}
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

      {/* Photos Section */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <ImageIcon size={14} /> ID Photos
        </div>
        <div className="flex gap-4">
          <PhotoUpload label="Front Photo" value={form.front_photo} onChange={url => set('front_photo', url)} />
          <PhotoUpload label="Back Photo" value={form.back_photo} onChange={url => set('back_photo', url)} />
        </div>
      </div>

      {/* Bank Details */}
      <div>
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Bank Details
        </div>
        {bankFields.map(f => (
          <div key={f.name} className="mb-3">
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>{f.label}</label>
            <input
              type="text"
              value={(form[f.name] ?? '') as string}
              onChange={e => set(f.name, e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        ))}
      </div>

      {/* Notes */}
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

      {/* Active Toggle */}
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
