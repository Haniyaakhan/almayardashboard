'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { createUsageLog } from '@/hooks/useMachineUsage';

interface Props { machineId: string; onSuccess: () => void; }

export function UsageLogForm({ machineId, onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    log_date: today, hours_used: '', operator_name: '',
    fuel_consumed: '', task_description: '', site_location: '', remarks: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key: string, value: string) { setForm(p => ({ ...p, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const err = await createUsageLog({
      machine_id: machineId,
      log_date: form.log_date,
      hours_used: Number(form.hours_used),
      operator_name: form.operator_name,
      fuel_consumed: form.fuel_consumed ? Number(form.fuel_consumed) : null,
      task_description: form.task_description || null,
      site_location: form.site_location || null,
      remarks: form.remarks || null,
    });
    setLoading(false);
    if (err) setError(err.message);
    else onSuccess();
  }

  const inputClass = "w-full px-3 py-2 rounded-lg text-sm text-white outline-none";
  const inputStyle = { background: '#0f1117', border: '1px solid #2d3454' };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#e8762b');
  const blur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#2d3454');

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Date <span style={{ color: '#e8762b' }}>*</span></label>
          <input type="date" required value={form.log_date} onChange={e => set('log_date', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
        <div>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Hours Used <span style={{ color: '#e8762b' }}>*</span></label>
          <input type="number" step="0.5" min="0" required value={form.hours_used} onChange={e => set('hours_used', e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      </div>

      {[
        { label: 'Operator Name', name: 'operator_name' },
        { label: 'Fuel Consumed (L)', name: 'fuel_consumed', type: 'number' },
        { label: 'Task Description', name: 'task_description' },
        { label: 'Site Location', name: 'site_location' },
      ].map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>{f.label}</label>
          <input type={f.type ?? 'text'} value={(form as any)[f.name]}
            onChange={e => set(f.name, e.target.value)} className={inputClass} style={inputStyle} onFocus={focus} onBlur={blur} />
        </div>
      ))}

      <div>
        <label className="block text-sm mb-1" style={{ color: '#94a3b8' }}>Remarks</label>
        <textarea value={form.remarks} rows={2} onChange={e => set('remarks', e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none resize-none"
          style={inputStyle} onFocus={focus} onBlur={blur} />
      </div>

      {error && <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>}
      <Button type="submit" loading={loading}>Log Usage</Button>
    </form>
  );
}
