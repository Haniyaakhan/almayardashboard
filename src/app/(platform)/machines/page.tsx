'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useMachines } from '@/hooks/useMachines';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { machineStatusBadge } from '@/components/ui/Badge';
import { Truck, Plus, Search, Pencil, Trash2 } from 'lucide-react';

const vehicleTypes = ['All', 'Tipper', 'Pickup', 'Crane', 'Forklift', 'Trailer', 'Tanker'];

export default function VehiclesPage() {
  const { machines, loading } = useMachines();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = machines.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase()) ||
      (m.plate_number || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || m.type.toLowerCase().includes(filter.toLowerCase());
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
          {vehicleTypes.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 13px', borderRadius: 8,
              cursor: 'pointer', transition: 'all 0.14s',
              border: filter === t ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: filter === t ? 'var(--navy)' : 'var(--bg-card)',
              color: filter === t ? '#fff' : 'var(--text-light)',
            }}>
              {t}
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
              placeholder="Search vehicles..."
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 180, outline: 'none',
              }} />
          </div>
          <Link href="/machines/new" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff',
            border: 'none', padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Plus size={14} /> ADD VEHICLE
          </Link>
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState icon={<Truck size={24} />} title="No vehicles found"
          description="Register vehicles to track usage and costs."
          action={<Link href="/machines/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff', border: 'none',
            padding: '8px 15px', borderRadius: 9, fontSize: '12.5px',
            fontWeight: 600, textDecoration: 'none',
          }}><Plus size={14} /> Add Vehicle</Link>} />
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Company', 'Vehicle Type', 'Code', 'Phone', 'Site', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 13px', fontSize: '10.5px', fontWeight: 600,
                    color: 'var(--text-muted)', textAlign: 'left',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} style={{
                  borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 13px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>{(m.vendor as any)?.name ?? '—'}</td>
                  <td style={{ padding: '10px 13px' }}>
                    <Link href={`/machines/${m.id}`} style={{
                      fontSize: '12.5px', fontWeight: 600,
                      color: 'var(--text-secondary)', textDecoration: 'none',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >{m.name} {m.type ? `(${m.type})` : ''}</Link>
                  </td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace', fontWeight: 700 }}>{m.plate_number || '—'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>—</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>—</td>
                  <td style={{ padding: '10px 13px' }}>{machineStatusBadge(m.status)}</td>
                  <td style={{ padding: '10px 13px' }}>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/machines/${m.id}`} title="View / Edit" style={{
                        padding: 5, borderRadius: 7,
                        border: '1px solid var(--border2)', background: 'var(--bg-card)',
                        color: 'var(--text-light)', display: 'flex', alignItems: 'center',
                      }}>
                        <Pencil size={13} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
