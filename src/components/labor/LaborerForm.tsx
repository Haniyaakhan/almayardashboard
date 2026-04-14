'use client';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useForemen } from '@/hooks/useForemen';
import { createClient } from '@/lib/supabase/client';
import { Upload, X, Image as ImageIcon, Plus } from 'lucide-react';
import type { Laborer } from '@/types/database';
import { createForeman } from '@/hooks/useForemen';
import { useLaborers } from '@/hooks/useLaborers';
import { OMAN_BANK_LIST, resolveSwift } from '@/lib/omanBanks';

// Oman bank list for the dropdown
const OMAN_BANKS = OMAN_BANK_LIST.map((b) => b.name);

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
  field('ID / Iqama No.',   'id_number'),
  field('Nationality',      'nationality'),
  field('Phone',            'phone',         'tel'),
  field('Site Number',      'site_number'),
  field('Room Number',      'room_number'),
  field('Starting Date',    'start_date',    'date'),
  field('Monthly Salary (OMR)', 'monthly_salary', 'number'),
  field('Foreman Commission (OMR)', 'foreman_commission', 'number'),
  field('Daily Rate (Legacy OMR)', 'daily_rate', 'number'),
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
  const { foremen, refetch: refetchForemen } = useForemen(true);
  const { laborers } = useLaborers(false);
  const [showAddForeman, setShowAddForeman] = useState(false);
  const [newForemanLaborerId, setNewForemanLaborerId] = useState('');
  const [newForemanName, setNewForemanName] = useState('');
  const [newForemanIdNumber, setNewForemanIdNumber] = useState('');
  const [newForemanPhone, setNewForemanPhone] = useState('');
  const [newForemanEmail, setNewForemanEmail] = useState('');
  const [addingForeman, setAddingForeman] = useState(false);
  const [form, setForm] = useState<FormData>({
    full_name: '', designation: '', supplier_name: '', id_number: '',
    nationality: '', phone: '', daily_rate: null, is_active: true, notes: '',
    foreman_id: null, site_number: null, room_number: null, start_date: null,
    monthly_salary: null, foreman_commission: 0,
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
    const idNumber = (form.id_number || '').trim();
    if (!idNumber) {
      const msg = 'Labour ID is required';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!/^\d+$/.test(idNumber)) {
      const msg = 'Labour ID must be numeric only';
      setError(msg);
      toast.error(msg);
      return;
    }
    setLoading(true); setError('');
    try { await onSubmit({ ...form, id_number: idNumber }); } catch (err: any) { setError(err.message); toast.error(err.message); }
    setLoading(false);
  }

  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = 'var(--orange)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,43,0.1)'; };
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">

      {/* ── Personal Info ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          Personal Info
        </h3>
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Full Name <span style={{ color: '#e8762b' }}>*</span></label>
            <input type="text" required value={form.full_name} onChange={e => set('full_name', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          {/* ID | Nationality */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>ID / Iqama No. <span style={{ color: '#e8762b' }}>*</span></label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                value={form.id_number ?? ''}
                onChange={e => set('id_number', e.target.value.replace(/\D/g, '') || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Nationality</label>
              <input type="text" value={form.nationality ?? ''} onChange={e => set('nationality', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          {/* Phone | Monthly Salary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Phone</label>
              <input type="tel" value={form.phone ?? ''} onChange={e => set('phone', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Monthly Salary (OMR)</label>
              <input type="number" value={form.monthly_salary ?? ''} onChange={e => set('monthly_salary', e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Hourly rate = Monthly Salary / 260</p>
            </div>
          </div>
          {/* Designation | Start Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Designation <span style={{ color: '#e8762b' }}>*</span></label>
              <select required value={form.designation ?? ''} onChange={e => set('designation', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Select —</option>
                {['Mason', 'Carpenter', 'Rigger', 'Helper', 'Trojan Helpers', 'Electrician', 'Scaffolder', 'Steelfixer', 'Other'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Start Date</label>
              <input type="date" value={form.start_date ?? ''} onChange={e => set('start_date', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Site Info ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          Site Info
        </h3>
        <div className="space-y-4">
          {/* Foreman */}
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Foreman</label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
              Select an existing foreman, or add a new foreman here.
            </p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select value={form.foreman_id ?? ''} onChange={e => set('foreman_id', e.target.value || null)}
                className="px-3 py-2 rounded-lg text-sm outline-none" style={{ ...inputStyle, flex: 1 }} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Select Foreman —</option>
                {foremen.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
              </select>
              <button type="button" onClick={() => setShowAddForeman(v => !v)} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8,
                background: showAddForeman ? 'var(--orange-lt)' : 'var(--bg-card)',
                color: 'var(--orange)', border: '1px solid var(--orange)',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                <Plus size={13} /> Add Foreman
              </button>
            </div>
            {showAddForeman && (
              <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--input-bg)' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>New Foreman</p>
                <select
                  value={newForemanLaborerId}
                  onChange={e => {
                    const nextId = e.target.value;
                    setNewForemanLaborerId(nextId);
                    if (!nextId) return;
                    const laborer = laborers.find(l => l.id === nextId);
                    if (!laborer) return;
                    setNewForemanName(laborer.full_name || '');
                    setNewForemanIdNumber(laborer.id_number || '');
                    setNewForemanPhone(laborer.phone || '');
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ ...inputStyle, marginBottom: 8 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <option value="">Link existing labourer (optional)</option>
                  {laborers
                    .filter(l => l.is_active)
                    .filter(l => !foremen.some(f => f.laborer_id === l.id))
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.full_name} ({l.id_number || 'No ID'})</option>
                    ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input type="text" placeholder="Foreman full name *" value={newForemanName}
                    onChange={e => setNewForemanName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <input type="text" placeholder="ID Number" value={newForemanIdNumber}
                    onChange={e => setNewForemanIdNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <input type="tel" placeholder="Phone" value={newForemanPhone}
                    onChange={e => setNewForemanPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                  <input type="email" placeholder="Email" value={newForemanEmail}
                    onChange={e => setNewForemanEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" disabled={addingForeman} onClick={async () => {
                    if (!newForemanName.trim()) { toast.error('Foreman name is required'); return; }
                    if (newForemanLaborerId && foremen.some(f => f.laborer_id === newForemanLaborerId)) {
                      toast.error('This labourer is already linked to a foreman');
                      return;
                    }
                    setAddingForeman(true);
                    const { error: err, id } = await createForeman({
                      laborer_id: newForemanLaborerId || null,
                      full_name: newForemanName.trim(),
                      id_number: newForemanIdNumber.trim(),
                      phone: newForemanPhone.trim(),
                      email: newForemanEmail.trim(),
                    });
                    setAddingForeman(false);
                    if (err) { toast.error(err.message); return; }
                    await refetchForemen();
                    if (id) set('foreman_id', id);
                    toast.success(`Foreman "${newForemanName.trim()}" added`);
                    setNewForemanLaborerId('');
                    setNewForemanName('');
                    setNewForemanIdNumber('');
                    setNewForemanPhone('');
                    setNewForemanEmail('');
                    setShowAddForeman(false);
                  }} style={{
                    fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 7,
                    background: 'var(--orange)', color: '#fff', border: 'none', cursor: 'pointer',
                    opacity: addingForeman ? 0.6 : 1,
                  }}>
                    {addingForeman ? 'Saving...' : 'Save'}
                  </button>
                  <button type="button" onClick={() => {
                    setShowAddForeman(false);
                    setNewForemanLaborerId('');
                    setNewForemanName('');
                    setNewForemanIdNumber('');
                    setNewForemanPhone('');
                    setNewForemanEmail('');
                  }} style={{
                    fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 7,
                    background: 'var(--bg-card)', color: 'var(--text-light)',
                    border: '1px solid var(--border)', cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          {/* Foreman Commission | Site No. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Foreman Commission (OMR)</label>
              <input type="number" value={form.foreman_commission ?? ''} onChange={e => set('foreman_commission', e.target.value ? Number(e.target.value) : 0)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Site No.</label>
              <input type="text" value={form.site_number ?? ''} onChange={e => set('site_number', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          {/* Room No. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Room No.</label>
              <input type="text" value={form.room_number ?? ''} onChange={e => set('room_number', e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Bank Details ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          Bank Details
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Bank Name</label>
            <select value={form.bank_name ?? ''} onChange={e => set('bank_name', e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
              <option value="">— Select Bank —</option>
              {OMAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>SWIFT Code</label>
            <input
              type="text"
              readOnly
              value={resolveSwift(form.bank_name)}
              placeholder="Auto-resolved from bank name"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ ...inputStyle, background: 'var(--bg-subtle, #f8fafc)', color: resolveSwift(form.bank_name) ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'default', fontFamily: 'monospace' }}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Account No.</label>
          <input type="text" value={form.bank_account_number ?? ''} onChange={e => set('bank_account_number', e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
      </section>

      {/* ── ID Photos ── */}
      <section>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
          ID Photos
        </h3>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <PhotoUpload label="Front Photo" value={form.front_photo} onChange={url => set('front_photo', url)} />
          <PhotoUpload label="Back Photo" value={form.back_photo} onChange={url => set('back_photo', url)} />
        </div>
      </section>

      {/* ── Notes ── */}
      <div>
        <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
        <textarea value={form.notes ?? ''} rows={3} onChange={e => set('notes', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => (e.target.style.borderColor = '#e8762b')}
          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* ── Active Toggle ── */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => set('is_active', !form.is_active)} style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
          background: form.is_active ? '#16a34a' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
          <span style={{
            position: 'absolute', top: 3, left: form.is_active ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s',
          }} />
        </button>
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{form.is_active ? 'Active' : 'Inactive'}</span>
      </div>

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>{submitLabel}</Button>
    </form>
  );
}
