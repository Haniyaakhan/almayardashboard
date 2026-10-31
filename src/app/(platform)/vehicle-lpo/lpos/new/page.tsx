'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { createLpo } from '@/hooks/useLpos';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { FileText } from 'lucide-react';

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

export default function NewLpoPage() {
  const router = useRouter();
  const toast = useToast();
  const { vehicleTypes } = useVehicleTypes();
  const [lpoNumber, setLpoNumber] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = lpoNumber.trim() && vehicleTypeId && Number(quantity) > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    const { error } = await createLpo({
      lpo_number: lpoNumber.trim(),
      vehicle_type_id: vehicleTypeId,
      quantity_total: Number(quantity),
      valid_from: validFrom || null,
      valid_to: validTo || null,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('LPO created');
    router.push('/vehicle-lpo/lpos');
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 560 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>New LPO</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20 }}>
        Any vehicle of the selected type will be able to draw shifts against this LPO.
      </p>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>LPO Number <span style={{ color: '#e8762b' }}>*</span></label>
            <input value={lpoNumber} onChange={e => setLpoNumber(e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Vehicle Type <span style={{ color: '#e8762b' }}>*</span></label>
            <select value={vehicleTypeId} onChange={e => setVehicleTypeId(e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur}>
              <option value="">Select type…</option>
              {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Quantity (number of shifts) <span style={{ color: '#e8762b' }}>*</span></label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Each approved Day or Night shift consumes 1 unit.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Valid From</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Valid To</label>
              <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-muted)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={{ ...inputStyle, resize: 'vertical' }} onFocus={focus} onBlur={blur} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => router.push('/vehicle-lpo/lpos')}>Cancel</Button>
            <Button variant="primary" icon={<FileText size={14} />} loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>Create LPO</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
