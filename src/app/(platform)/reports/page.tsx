'use client';
import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileBarChart, Mail } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadPreview() {
    setLoading(true); setMsg('');
    const supabase = createClient();
    const [{ data: ts }, { data: ml }] = await Promise.all([
      supabase.from('timesheets').select('*, laborer:laborers(full_name,designation)').eq('month', month).eq('year', year),
      supabase.from('machine_usage_logs').select('*, machine:machines(name,type)').gte('log_date', `${year}-${String(month+1).padStart(2,'0')}-01`).lt('log_date', `${year}-${String(month+2).padStart(2,'0')}-01`),
    ]);
    setPreview({ timesheets: ts ?? [], machineLogs: ml ?? [] });
    setLoading(false);
  }

  function totalHours(ts: any[]) { return ts.reduce((s: number, t: any) => s + (t.total_actual || 0), 0); }
  function totalMachineHours(ml: any[]) { return ml.reduce((s: number, l: any) => s + (l.hours_used || 0), 0); }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Reports" subtitle="Generate monthly summaries" />

      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Select Report Period</h3>
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs mb-1" style={{ color: '#94a3b8' }}>Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: '#0f1117', border: '1px solid #2d3454' }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: '#94a3b8' }}>Year</label>
            <input type="number" value={year} min="2020" max="2040" onChange={e => setYear(Number(e.target.value))}
              className="w-24 px-3 py-2 rounded-lg text-sm text-white outline-none"
              style={{ background: '#0f1117', border: '1px solid #2d3454' }} />
          </div>
          <Button onClick={loadPreview} loading={loading} icon={<FileBarChart size={14}/>}>
            Generate Preview
          </Button>
        </div>
      </Card>

      {preview && (
        <>
          {/* KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Timesheets', preview.timesheets.length],
              ['Total Labor Hours', `${totalHours(preview.timesheets)}h`],
              ['Machine Log Entries', preview.machineLogs.length],
              ['Total Machine Hours', `${totalMachineHours(preview.machineLogs).toFixed(1)}h`],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-xl p-4" style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
                <div className="text-xs mb-1" style={{ color: '#64748b' }}>{label}</div>
                <div className="text-xl font-bold text-white">{val}</div>
              </div>
            ))}
          </div>

          {/* Labor Summary */}
          {preview.timesheets.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">
                Labor Summary — {MONTHS[month]} {year}
              </h3>
              <table className="w-full text-sm">
                <thead><tr style={{ color: '#64748b' }}>
                  {['Laborer','Designation','Worked (h)','OT (h)','Total (h)'].map(h => <th key={h} className="text-left pb-2 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.timesheets.map((ts: any) => (
                    <tr key={ts.id} style={{ borderTop: '1px solid #2d3454' }}>
                      <td className="py-2 text-white">{ts.laborer?.full_name ?? '—'}</td>
                      <td className="py-2" style={{ color: '#94a3b8' }}>{ts.laborer?.designation ?? ts.designation}</td>
                      <td className="py-2 text-white">{ts.total_worked}</td>
                      <td className="py-2" style={{ color: ts.total_ot > 0 ? '#e8762b' : '#94a3b8' }}>{ts.total_ot || '—'}</td>
                      <td className="py-2 font-semibold text-white">{ts.total_actual}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Machine Summary */}
          {preview.machineLogs.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold text-white mb-4">Machine Usage — {MONTHS[month]} {year}</h3>
              <table className="w-full text-sm">
                <thead><tr style={{ color: '#64748b' }}>
                  {['Date','Machine','Type','Operator','Hours','Fuel'].map(h => <th key={h} className="text-left pb-2 font-medium">{h}</th>)}
                </tr></thead>
                <tbody>
                  {preview.machineLogs.map((log: any) => (
                    <tr key={log.id} style={{ borderTop: '1px solid #2d3454' }}>
                      <td className="py-2" style={{ color: '#94a3b8' }}>{log.log_date}</td>
                      <td className="py-2 text-white">{log.machine?.name ?? '—'}</td>
                      <td className="py-2" style={{ color: '#94a3b8' }}>{log.machine?.type ?? '—'}</td>
                      <td className="py-2" style={{ color: '#94a3b8' }}>{log.operator_name || '—'}</td>
                      <td className="py-2 font-medium" style={{ color: '#e8762b' }}>{log.hours_used}h</td>
                      <td className="py-2" style={{ color: '#94a3b8' }}>{log.fuel_consumed ? `${log.fuel_consumed}L` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Email button (placeholder for when Resend is configured) */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Email This Report</h3>
                <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>
                  Add RESEND_API_KEY and REPORT_RECIPIENT_EMAIL to .env.local to enable email sending.
                </p>
              </div>
              <Button variant="secondary" icon={<Mail size={14}/>} disabled>
                Send via Email
              </Button>
            </div>
            {msg && <p className="text-sm mt-2" style={{ color: msg.startsWith('Error') ? '#ef4444' : '#22c55e' }}>{msg}</p>}
          </Card>
        </>
      )}
    </div>
  );
}
