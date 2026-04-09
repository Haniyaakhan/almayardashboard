'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Pencil, Trash2, RotateCcw, X, Download } from 'lucide-react';
import { exportLaborersToExcel } from '@/lib/excelExport';
import { useLaborers, createLaborer, deactivateLaborer, reactivateLaborer } from '@/hooks/useLaborers';
import { useForemen } from '@/hooks/useForemen';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';

export function LaborRegistryPage() {
  const { laborers, loading, refetch } = useLaborers(false);
  const { foremen } = useForemen(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [designationFilter, setDesignationFilter] = useState('All');

  const foremanNameById = useMemo(
    () => new Map(foremen.map((f) => [f.id, f.full_name])),
    [foremen]
  );

  const designationOptions = useMemo(() => {
    const unique = new Set<string>();
    laborers.forEach((l) => unique.add(normalizeDesignationKey(l.designation)));

    return ['All', ...Array.from(unique)
      .filter((key) => key !== 'unspecified')
      .map((key) => toDisplayDesignation(key))
      .sort((a, b) => a.localeCompare(b))];
  }, [laborers]);

  const filtered = laborers.filter((l) => {
    const q = search.trim().toLowerCase();
    const normalizedQuery = normalizeDesignationKey(q);
    const designationKey = normalizeDesignationKey(l.designation);
    const designationLabel = toDisplayDesignation(l.designation).toLowerCase();
    const matchSearch =
      l.full_name.toLowerCase().includes(q) ||
      l.id_number.toLowerCase().includes(q) ||
      designationLabel.includes(q) ||
      designationKey.includes(normalizedQuery) ||
      (l.supplier_name ?? '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'All' || (statusFilter === 'Active' ? l.is_active : !l.is_active);
    const matchDesignation =
      designationFilter === 'All' ||
      normalizeDesignationKey(l.designation) === normalizeDesignationKey(designationFilter);
    return matchSearch && matchStatus && matchDesignation;
  });

  async function handleExportFiltered() {
    if (!filtered.length) { toast.error('No records to export'); return; }
    const parts: string[] = [];
    if (designationFilter !== 'All') parts.push(designationFilter);
    if (statusFilter !== 'All') parts.push(statusFilter);
    if (search.trim()) parts.push(`"${search.trim()}"`);
    const label = parts.length ? parts.join(' · ') : 'All Labour';
    setExporting(true);
    try {
      await exportLaborersToExcel(filtered, label, foremanNameById);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, flexWrap: 'wrap', marginBottom: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px',
      }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Active', 'Inactive'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              transition: 'all 0.14s',
              border: statusFilter === s ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: statusFilter === s ? 'var(--navy)' : 'var(--bg-card)',
              color: statusFilter === s ? '#fff' : 'var(--text-light)',
            }}>{s}</button>
          ))}
          <select
            value={designationFilter}
            onChange={e => setDesignationFilter(e.target.value)}
            style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
              border: designationFilter !== 'All' ? '1px solid var(--orange)' : '1px solid var(--border2)',
              background: designationFilter !== 'All' ? 'var(--orange-lt)' : 'var(--bg-card)',
              color: designationFilter !== 'All' ? 'var(--orange)' : 'var(--text-light)',
              outline: 'none',
            }}
          >
            {designationOptions.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Designations' : d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, role, contractor…"
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 220, outline: 'none',
              }}
            />
          </div>
          <button
            onClick={handleExportFiltered}
            disabled={exporting || !filtered.length}
            style={{ ...addBtnStyle, background: '#16a34a', cursor: (exporting || !filtered.length) ? 'not-allowed' : 'pointer', opacity: (exporting || !filtered.length) ? 0.6 : 1 }}
          >
            <Download size={14} /> {exporting ? 'EXPORTING…' : `EXPORT (${filtered.length})`}
          </button>
          <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>
            <Plus size={14} /> ADD NEW LABOUR
          </button>
        </div>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <EmptyState
            icon={<Users size={24} />}
            title="No laborers found"
            description="Add your first laborer to get started."
            action={
              <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>
                <Plus size={14} /> Add Laborer
              </button>
            }
          />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Worker', 'Labour ID', 'Designation', 'Foreman', 'Contractor', 'Phone', 'Monthly Salary', 'Bank', 'Status', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const initials = l.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr
                    key={l.id}
                    style={{ borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Worker */}
                    <td style={tdStyle}>
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 30, height: 30, borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                          background: 'rgba(255,107,43,0.08)', color: 'var(--orange)',
                        }}>{initials}</div>
                        <Link
                          href={`/labor/${l.id}`}
                          style={linkTextStyle}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >{l.full_name}</Link>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{l.id_number || '—'}</td>
                    <td style={tdStyle}>{toDisplayDesignation(l.designation)}</td>
                    <td style={tdStyle}>{l.foreman_id ? (foremanNameById.get(l.foreman_id) ?? '—') : '—'}</td>
                    <td style={tdStyle}>{l.supplier_name || '—'}</td>
                    <td style={tdStyle}>{l.phone || '—'}</td>
                    <td style={tdStyle}>{l.monthly_salary ? `${l.monthly_salary} OMR` : '—'}</td>
                    <td style={tdStyle}>{l.bank_name || '—'}</td>
                    <td style={tdStyle}>
                      <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Left'}</Badge>
                    </td>
                    <td style={tdStyle}>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/labor/${l.id}/edit`} title="Edit" style={actionBtnStyle}>
                          <Pencil size={13} />
                        </Link>
                        {l.is_active ? (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Deactivate Laborer',
                                message: `Are you sure you want to deactivate "${l.full_name}"?`,
                                variant: 'danger',
                                confirmLabel: 'Deactivate',
                              });
                              if (!ok) return;
                              await deactivateLaborer(l.id);
                              refetch();
                              toast.success(`"${l.full_name}" deactivated`);
                            }}
                            title="Deactivate"
                            style={{ ...actionBtnStyle, border: '1px solid var(--red-border)', color: 'var(--red-text)', background: 'var(--red-bg)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Re-activate Laborer',
                                message: `Re-activate "${l.full_name}"?`,
                                variant: 'info',
                                confirmLabel: 'Re-activate',
                              });
                              if (!ok) return;
                              await reactivateLaborer(l.id);
                              refetch();
                              toast.success(`"${l.full_name}" reactivated`);
                            }}
                            title="Re-activate"
                            style={{ ...actionBtnStyle, border: '1px solid #bbf7d0', color: '#16a34a', background: 'rgba(34,197,94,0.08)' }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog}

      {/* Add Labour Modal */}
      {showAddModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 16px', overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16,
            width: '100%', maxWidth: 760,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            position: 'relative', padding: '28px 32px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add New Labour</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Register a new worker to the registry</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--bg-card)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <LaborerForm
              submitLabel="Create Laborer"
              onSubmit={async (data) => {
                const err = await createLaborer(data);
                if (err) throw err;
                toast.success('Laborer created successfully');
                setShowAddModal(false);
                refetch();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const thStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const addBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--orange)',
  color: '#fff',
  border: 'none',
  padding: '8px 15px',
  borderRadius: 9,
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const linkTextStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.12s',
};

const actionBtnStyle: React.CSSProperties = {
  padding: 5,
  borderRadius: 7,
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  color: 'var(--text-light)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.14s',
};
