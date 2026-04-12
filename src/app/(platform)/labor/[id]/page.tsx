'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getLaborerById, updateLaborer } from '@/hooks/useLaborers';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { FormModal } from '@/components/ui/FormModal';
import { useToast } from '@/components/ui/Toast';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { ArrowLeft } from 'lucide-react';
import type { Laborer } from '@/types/database';
import { toDisplayDesignation } from '@/lib/designation';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface SalaryHistoryRow {
  id: string;
  month: number;
  year: number;
  status: 'draft' | 'approved';
  gross: number;
  deduction: number;
  net: number;
}

export default function LaborerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [laborer, setLaborer] = useState<Laborer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const toast = useToast();
  const { timesheets, loading: tsLoading } = useTimesheetHistory(id);
  const [salaryRows, setSalaryRows] = useState<SalaryHistoryRow[]>([]);
  const [salaryLoading, setSalaryLoading] = useState(true);

  useEffect(() => { getLaborerById(id).then(setLaborer); }, [id]);

  useEffect(() => {
    let active = true;

    async function loadSalaryHistory() {
      setSalaryLoading(true);
      const supabase = createClient();

      const { data: entries, error: entriesError } = await supabase
        .from('salary_sheet_entries')
        .select('id, sheet_id, total_salary, deduction, created_at')
        .eq('laborer_id', id)
        .order('created_at', { ascending: false });

      if (entriesError || !entries || !entries.length) {
        if (active) {
          setSalaryRows([]);
          setSalaryLoading(false);
        }
        return;
      }

      const sheetIds = Array.from(new Set(entries.map((entry: any) => entry.sheet_id)));
      const { data: sheets, error: sheetsError } = await supabase
        .from('salary_sheets')
        .select('id, month, year, status')
        .in('id', sheetIds);

      if (sheetsError || !sheets) {
        if (active) {
          setSalaryRows([]);
          setSalaryLoading(false);
        }
        return;
      }

      const sheetMap = new Map(sheets.map((sheet: any) => [sheet.id, sheet]));
      const rows: SalaryHistoryRow[] = entries
        .map((entry: any) => {
          const sheet = sheetMap.get(entry.sheet_id);
          if (!sheet) return null;

          const gross = Number(entry.total_salary || 0);
          const deduction = Number(entry.deduction || 0);

          return {
            id: entry.id,
            month: Number(sheet.month),
            year: Number(sheet.year),
            status: sheet.status === 'approved' ? 'approved' : 'draft',
            gross,
            deduction,
            net: gross - deduction,
          };
        })
        .filter((row): row is SalaryHistoryRow => !!row)
        .sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));

      if (active) {
        setSalaryRows(rows);
        setSalaryLoading(false);
      }
    }

    loadSalaryHistory();
    return () => {
      active = false;
    };
  }, [id]);

  if (!laborer) return <PageSpinner />;

  const initials = laborer.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const profileInfo: [string, string][] = [
    ['Contractor', laborer.supplier_name || '—'],
    ['Phone', laborer.phone || '—'],
    ['Nationality', laborer.nationality || '—'],
    ['Bank Name', laborer.bank_name || '—'],
    ['Account No.', laborer.bank_account_number || '—'],
  ];

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      {/* Back button */}
      <Link href="/operations/labor" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 500, color: 'var(--text-light)',
        textDecoration: 'none', padding: '7px 14px', borderRadius: 8,
        border: '1px solid var(--border2)', background: 'var(--bg-card)',
      }}>
        <ArrowLeft size={14} /> Back to Labour List
      </Link>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-5 items-start">
        {/* Card 1: Labour Data */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 14,
          padding: '18px',
          border: '1px solid var(--border)',
          fontFamily: "'Sora', sans-serif",
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: 4 }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(255,107,43,0.1)',
              border: '1px solid rgba(255,107,43,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--orange)',
            }}>
              {initials}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Labour ID
            </div>
            <div style={{ marginTop: 3, fontSize: 24, fontWeight: 800, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
              {laborer.id_number || '—'}
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
              {laborer.full_name}
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              {toDisplayDesignation(laborer.designation)}
            </div>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              padding: '0 10px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: laborer.is_active ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.12)',
              color: laborer.is_active ? '#16a34a' : '#dc2626',
            }}>
              {laborer.is_active ? 'Active' : 'Left'}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12 }}>
            <div className="grid grid-cols-2 gap-3">
              {profileInfo.map(([label, value]) => (
                <div key={label} style={{ minHeight: 44 }}>
                  <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 14,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: laborer.is_active ? '#16a34a' : '#dc2626',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Status: {laborer.is_active ? 'Active' : 'Left'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 34,
                padding: '0 14px',
                borderRadius: 9,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
          </div>

        {(laborer.front_photo || laborer.back_photo) && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              ID Photos
            </div>
            <div className="flex gap-3 flex-wrap">
              {laborer.front_photo && (
                <img
                  src={laborer.front_photo}
                  alt="Front Photo"
                  style={{ width: 140, height: 96, objectFit: 'cover', borderRadius: 9, border: '1px solid var(--border)' }}
                />
              )}
              {laborer.back_photo && (
                <img
                  src={laborer.back_photo}
                  alt="Back Photo"
                  style={{ width: 140, height: 96, objectFit: 'cover', borderRadius: 9, border: '1px solid var(--border)' }}
                />
              )}
            </div>
          </div>
        )}

        {laborer.notes && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)', marginTop: 12 }}>
            {laborer.notes}
          </p>
        )}
        </div>

        {/* Card 2: Timesheet + Salary History */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14,
          border: '1px solid var(--border)', padding: '24px',
        }}>
          <div style={{
            fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
            marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            Timesheet and Salary History
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Timesheets
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
                  <tr style={{ borderTop: '2px solid var(--border)' }}>
                    <td style={{ padding: '10px 13px', fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
                    <td style={{ padding: '10px 13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {timesheets.reduce((sum, ts) => sum + ts.total_actual, 0)} hrs
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Salary History
            </div>
            {salaryLoading ? <PageSpinner /> : !salaryRows.length ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No salary entries found for this worker.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Month', 'Gross', 'Deduction', 'Net', 'Status'].map(h => (
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
                  {salaryRows.map((row) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 13px', color: 'var(--text-primary)', fontWeight: 500 }}>{MONTHS[row.month]} {row.year}</td>
                      <td style={{ padding: '10px 13px', color: 'var(--text-light)' }}>{row.gross.toFixed(3)} OMR</td>
                      <td style={{ padding: '10px 13px', color: 'var(--text-light)' }}>{row.deduction.toFixed(3)} OMR</td>
                      <td style={{ padding: '10px 13px', fontWeight: 700, color: 'var(--orange)' }}>{row.net.toFixed(3)} OMR</td>
                      <td style={{ padding: '10px 13px' }}>{timesheetStatusBadge(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
      <FormModal open={showEditModal} title="Edit Labour" onClose={() => setShowEditModal(false)}>
        <LaborerForm
          initial={laborer}
          submitLabel="Update Laborer"
          onSubmit={async data => {
            const err = await updateLaborer(id, data);
            if (err) throw err;
            toast.success('Laborer updated successfully');
            const updated = await getLaborerById(id);
            if (updated) setLaborer(updated);
            setShowEditModal(false);
          }}
        />
      </FormModal>
    </div>
  );
}
