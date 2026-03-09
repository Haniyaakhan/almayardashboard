'use client';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useVendors } from '@/hooks/useVendors';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import type { Machine } from '@/types/database';

type FormData = Omit<Machine, 'id' | 'created_at' | 'updated_at' | 'vendor'>;

interface Props { initial?: Partial<FormData>; onSubmit: (data: FormData) => Promise<void>; submitLabel?: string; }

const machineTypes = [
  'Bob Cat','Bus','Compactor','Compressor','Crane','Diesel Tanker',
  'Excavator','Flat Bed','Forklift','Generator','Grader','Hiab',
  'JCB','Low Bed','Manlift','Pick Up','Roller','Shovel',
  'Six Wheel Truck','Water Tanker','Other',
];

async function uploadPhoto(file: File, folder: string): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('vehicle-photos').upload(fileName, file, { upsert: true });
  if (error) { console.error('Upload error:', error); return null; }
  const { data } = supabase.storage.from('vehicle-photos').getPublicUrl(fileName);
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
              <span>Upload</span>
            </>
          )}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
    </div>
  );
}

export function MachineForm({ initial, onSubmit, submitLabel = 'Save' }: Props) {
  const toast = useToast();
  const { vendors } = useVendors();
  const [form, setForm] = useState<FormData>({
    vendor_id: null, name: '', type: '', plate_number: '', model: '',
    year: null, daily_rate: null, status: 'available', notes: '', is_active: true,
    contact_person: null, contact_number: null,
    operator_name: null, operator_id: null,
    vehicle_photo: null, vehicle_card: null, operator_card: null,
    ...initial,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof FormData, value: unknown) { setForm(p => ({ ...p, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    try { await onSubmit(form); } catch (err: any) { setError(err.message); toast.error(err.message); }
    setLoading(false);
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#e8762b';
    e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = 'var(--border)';
    e.target.style.boxShadow = 'none';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {/* Company / Vendor */}
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Company Name</label>
        <select value={form.vendor_id ?? ''} onChange={e => set('vendor_id', e.target.value || null)}
          className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
          <option value="">— No vendor —</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </div>

      {/* Contact Person & Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Contact Person</label>
          <input value={form.contact_person ?? ''} onChange={e => set('contact_person', e.target.value || null)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Contact Number</label>
          <input type="tel" value={form.contact_number ?? ''} onChange={e => set('contact_number', e.target.value || null)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Vehicle Type <span style={{ color: '#e8762b' }}>*</span></label>
        <select required value={form.type} onChange={e => set('type', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
          <option value="">Select type…</option>
          {machineTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Vehicle Name & Number */}
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Vehicle Name <span style={{ color: '#e8762b' }}>*</span></label>
        <input required value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Vehicle Number</label>
          <input value={form.plate_number} onChange={e => set('plate_number', e.target.value)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Model</label>
          <input value={form.model} onChange={e => set('model', e.target.value)}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {/* Operator Info */}
      <div>
        <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Operator Details</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Operator Name</label>
            <input value={form.operator_name ?? ''} onChange={e => set('operator_name', e.target.value || null)}
              className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Operator ID</label>
            <input value={form.operator_id ?? ''} onChange={e => set('operator_id', e.target.value || null)}
              className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
        </div>
      </div>

      {/* Year, Rate, Status */}
      <div className="grid grid-cols-3 gap-4">
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
        <div>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value as Machine['status'])}
            className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
            {['available','in_use','maintenance','returned'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Photos Section */}
      <div>
        <div className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
          <ImageIcon size={14} /> Photos & Cards
        </div>
        <div className="flex gap-4 flex-wrap">
          <PhotoUpload label="Vehicle Photo" value={form.vehicle_photo} onChange={url => set('vehicle_photo', url)} />
          <PhotoUpload label="Vehicle Card" value={form.vehicle_card} onChange={url => set('vehicle_card', url)} />
          <PhotoUpload label="Operator Card" value={form.operator_card} onChange={url => set('operator_card', url)} />
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
