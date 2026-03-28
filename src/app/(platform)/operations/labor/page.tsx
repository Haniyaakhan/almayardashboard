'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Pencil, Trash2, RotateCcw, X } from 'lucide-react';
import { useLaborers, createLaborer } from '@/hooks/useLaborers';
import { useForemen } from '@/hooks/useForemen';
import { deactivateLaborer, reactivateLaborer } from '@/hooks/useLaborers';
import { PageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { LaborerForm } from '@/components/labor/LaborerForm';

export default function OperationsLaborPage() {
  const { laborers, loading, refetch } = useLaborers(false);
  const { foremen } = useForemen(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [designationFilter, setDesignationFilter] = useState('All');

  const DESIGNATIONS = ['All', 'Mason', 'Carpenter', 'Rigger', 'Helper', 'Electrician', 'Scaffolder', 'Steel Fixer', 'Other'];

  const foremanNameById = useMemo(() => {
    return new Map(foremen.map((f) => [f.id, f.full_name]));
  }, [foremen]);

  const filtered = laborers.filter((l) => {
    const q = search.toLowerCase();
    const matchSearch = (
      l.full_name.toLowerCase().includes(q) ||
      l.id_number.toLowerCase().includes(q) ||
      l.designation.toLowerCase().includes(q)
    );
    const matchStatus = statusFilter === 'All' || (statusFilter === 'Active' ? l.is_active : !l.is_active);
    const matchDesignation = designationFilter === 'All' || l.designation === designationFilter;
    return matchSearch && matchStatus && matchDesignation;
  });

  if (loading) return <PageSpinner />;

  return (
    <div>
      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Active', 'Inactive'] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 13px',
                borderRadius: 8,
                cursor: 'pointer',
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
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 10px',
                borderRadius: 8,
                cursor: 'pointer',
                border: designationFilter !== 'All' ? '1px solid var(--orange)' : '1px solid var(--border2)',
                background: designationFilter !== 'All' ? 'var(--orange-lt)' : 'var(--bg-card)',
                color: designationFilter !== 'All' ? 'var(--orange)' : 'var(--text-light)',
                outline: 'none',
              }}
            >
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d === 'All' ? 'All Designations' : d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2" style={{
              background: 'var(--bg-card)',
              borderRadius: 9,
              padding: '7px 13px',
              border: '1px solid var(--border2)',
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search labor by name, ID, designation"
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '12.5px',
                  color: 'var(--text-light)',
                  width: 220,
                  outline: 'none',
                }}
              />
            </div>
            <button onClick={() => setShowAddModal(true)} style={linkButtonStyle}><Plus size={14} /> ADD NEW LABOUR</button>
          </div>
        </div>
      </Card>

      {!filtered.length ? (
        <Card>
          <EmptyState
            icon={<Users size={24} />}
            title="No laborers found"
            description="Add laborers to start operations tracking."
            action={<button onClick={() => setShowAddModal(true)} style={linkButtonStyle}><Plus size={14} /> Add Laborer</button>}
          />
        </Card>
      ) : (
        <Card padding="p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Worker', 'Labour ID', 'Designation', 'Foreman', 'Monthly Salary', 'Commission', 'Bank', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={tdStyle}><Link href={`/labor/${l.id}`} style={linkTextStyle}>{l.full_name}</Link></td>
                  <td style={tdStyle}>{l.id_number || '—'}</td>
                  <td style={tdStyle}>{l.designation || '—'}</td>
                  <td style={tdStyle}>{l.foreman_id ? (foremanNameById.get(l.foreman_id) ?? '—') : '—'}</td>
                  <td style={tdStyle}>{l.monthly_salary ? `${l.monthly_salary} OMR` : '—'}</td>
                  <td style={tdStyle}>{l.foreman_commission ? `${l.foreman_commission} OMR` : '0 OMR'}</td>
                  <td style={tdStyle}>{l.bank_name || '—'}</td>
                  <td style={tdStyle}>
                    <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Inactive'}</Badge>
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
              ))}
            </tbody>
          </table>
        </Card>
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
            padding: '40px 16px',
            overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 760,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
            position: 'relative',
            padding: '28px 32px 32px',
          }}>
            {/* Header */}
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

const linkButtonStyle: React.CSSProperties = {
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
  textDecoration: 'none',
};

const linkTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontWeight: 600,
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
