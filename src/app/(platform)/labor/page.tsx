'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLaborers, deactivateLaborer, reactivateLaborer } from '@/hooks/useLaborers';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Users, Plus, Search, Pencil, Trash2, RotateCcw } from 'lucide-react';

const designations = ['All', 'Helper', 'Scaffolder', 'Electrician', 'Rigger', 'Steel Fixer'];

export default function LaborPage() {
  const { laborers, loading, refetch } = useLaborers(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = laborers.filter(l => {
    const matchSearch = l.full_name.toLowerCase().includes(search.toLowerCase()) ||
      l.designation.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || l.designation === filter;
    return matchSearch && matchFilter;
  });

  if (loading) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 10,
      }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {designations.map(d => (
            <button key={d} onClick={() => setFilter(d)} style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 13px', borderRadius: 8,
              cursor: 'pointer', transition: 'all 0.14s',
              border: filter === d ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: filter === d ? 'var(--navy)' : 'var(--bg-card)',
              color: filter === d ? '#fff' : 'var(--text-light)',
            }}>
              {d === 'All' ? 'All' : d}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, role..."
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 180, outline: 'none',
              }} />
          </div>
          <Link href="/labor/new" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff',
            border: 'none', padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Plus size={14} /> ADD NEW LABOUR
          </Link>
        </div>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <EmptyState icon={<Users size={24} />} title="No laborers found"
          description="Add your first laborer to get started."
          action={<Link href="/labor/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff', border: 'none',
            padding: '8px 15px', borderRadius: 9, fontSize: '12.5px',
            fontWeight: 600, textDecoration: 'none',
          }}><Plus size={14} /> Add Laborer</Link>} />
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Worker', 'Labour ID', 'Designation', 'Contractor', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 13px', fontSize: '10.5px', fontWeight: 600,
                    color: 'var(--text-muted)', textAlign: 'left',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const initials = l.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={l.id} style={{
                    borderBottom: '1px solid #f4f1ed',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 13px' }}>
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 30, height: 30, borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                          background: 'rgba(255,107,43,0.08)', color: 'var(--orange)',
                        }}>{initials}</div>
                        <Link href={`/labor/${l.id}`} style={{
                          fontSize: '12.5px', fontWeight: 600,
                          color: 'var(--text-secondary)', cursor: 'pointer',
                          textDecoration: 'none', transition: 'color 0.12s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >{l.full_name}</Link>
                      </div>
                    </td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace' }}>{l.id_number || '—'}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.designation}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.supplier_name || '—'}</td>
                    <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{l.phone || '—'}</td>
                    <td style={{ padding: '10px 13px' }}>
                      <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Left'}</Badge>
                    </td>
                    <td style={{ padding: '10px 13px' }}>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/labor/${l.id}/edit`} title="Edit" style={{
                          padding: 5, borderRadius: 7,
                          border: '1px solid var(--border2)', background: 'var(--bg-card)',
                          color: 'var(--text-light)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center',
                          transition: 'all 0.14s',
                        }}>
                          <Pencil size={13} />
                        </Link>
                        {l.is_active ? (
                          <button onClick={async () => {
                            if (!confirm(`Are you sure you want to deactivate "${l.full_name}"?`)) return;
                            await deactivateLaborer(l.id); refetch();
                          }}
                            title="Deactivate" style={{
                              padding: 5, borderRadius: 7,
                              border: '1px solid var(--red-border)', background: 'var(--red-bg)',
                              color: 'var(--red-text)', cursor: 'pointer',
                              display: 'flex', alignItems: 'center',
                              transition: 'all 0.14s',
                            }}>
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button onClick={async () => {
                            if (!confirm(`Re-activate "${l.full_name}"?`)) return;
                            await reactivateLaborer(l.id); refetch();
                          }}
                            title="Re-activate" style={{
                              padding: 5, borderRadius: 7,
                              border: '1px solid #bbf7d0', background: 'rgba(34,197,94,0.08)',
                              color: '#16a34a', cursor: 'pointer',
                              display: 'flex', alignItems: 'center',
                              transition: 'all 0.14s',
                            }}>
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
    </div>
  );
}
