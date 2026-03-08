'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getLaborerById } from '@/hooks/useLaborers';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { ArrowLeft } from 'lucide-react';
import type { Laborer } from '@/types/database';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function LaborerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [laborer, setLaborer] = useState<Laborer | null>(null);
  const { timesheets, loading: tsLoading } = useTimesheetHistory(id);

  useEffect(() => { getLaborerById(id).then(setLaborer); }, [id]);

  if (!laborer) return <PageSpinner />;

  const initials = laborer.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const info: [string, string][] = [
    ['Labour ID', laborer.id_number || '—'],
    ['Designation', laborer.designation],
    ['Contractor', laborer.supplier_name || '—'],
    ['Phone', laborer.phone || '—'],
    ['Nationality', laborer.nationality || '—'],
    ['Status', laborer.is_active ? 'Active' : 'Left'],
  ];

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      {/* Back button */}
      <Link href="/labor" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 500, color: 'var(--text-light)',
        textDecoration: 'none', padding: '7px 14px', borderRadius: 8,
        border: '1px solid var(--border2)', background: 'var(--bg-card)',
      }}>
        <ArrowLeft size={14} /> Back to Labour List
      </Link>

      {/* Banner Header */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 14, padding: '28px 32px',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14,
          background: 'rgba(255,107,43,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: 'var(--orange)',
          fontFamily: "'Sora', sans-serif",
        }}>{initials}</div>
        <div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: 'var(--text-primary)',
            fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px',
          }}>{laborer.full_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            {laborer.designation} · {laborer.supplier_name || '—'} ·
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
              background: laborer.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              color: laborer.is_active ? '#16a34a' : '#dc2626',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: laborer.is_active ? '#16a34a' : '#dc2626',
              }} />
              {laborer.is_active ? 'Active' : 'Left'}
            </span>
          </div>
        </div>
      </div>

      {/* Info Grid - 3 column cards */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14,
        border: '1px solid var(--border)', padding: '24px',
      }}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {info.map(([label, val]) => (
            <div key={label} style={{
              padding: '14px 18px', borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
            }}>
              <div style={{
                fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6,
              }}>{label}</div>
              <div style={{
                fontSize: 14, fontWeight: 600, color: label === 'Status'
                  ? (val === 'Active' ? '#22c55e' : '#ef4444')
                  : 'var(--text-primary)',
                display: label === 'Status' ? 'flex' : undefined,
                alignItems: label === 'Status' ? 'center' : undefined,
                gap: label === 'Status' ? 5 : undefined,
              }}>
                {label === 'Status' && (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: val === 'Active' ? '#22c55e' : '#ef4444',
                  }} />
                )}
                {val}
              </div>
            </div>
          ))}
        </div>
        {laborer.notes && <p className="text-sm mt-4" style={{ color: 'var(--text-secondary)' }}>{laborer.notes}</p>}
      </div>

      {/* Timesheets & History */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14,
        border: '1px solid var(--border)', padding: '24px',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
        }}>
          📋 Timesheets & History
        </div>
        {tsLoading ? <PageSpinner /> : !timesheets.length ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No timesheets saved for this worker yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Month', 'Hours', 'Status'].map(h => (
                  <th key={h} style={{
                    padding: '10px 13px', fontSize: '10.5px', fontWeight: 600,
                    color: 'var(--text-muted)', textAlign: 'left',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timesheets.map(ts => (
                <tr key={ts.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <Link href={`/timesheet/history/${ts.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {MONTHS[ts.month]} {ts.year}
                    </Link>
                  </td>
                  <td style={{ padding: '10px 13px', color: 'var(--text-light)' }}>{ts.total_actual} hrs</td>
                  <td style={{ padding: '10px 13px' }}>{timesheetStatusBadge(ts.status)}</td>
                </tr>
              ))}
              {timesheets.length > 0 && (
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '10px 13px', fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
                  <td style={{ padding: '10px 13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {timesheets.reduce((sum, ts) => sum + ts.total_actual, 0)} hrs
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
