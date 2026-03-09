'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useVendors } from '@/hooks/useVendors';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Truck, Plus, Search, Pencil } from 'lucide-react';

export default function VendorsPage() {
  const { vendors, loading } = useVendors();
  const [search, setSearch] = useState('');

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.contact_person || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14, flexWrap: 'wrap', gap: 10,
      }}>
        <div className="flex items-center gap-1.5">
          <button style={{
            fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8,
            border: '1px solid var(--navy)', background: 'var(--navy)', color: '#fff',
            cursor: 'pointer',
          }}>All</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search contractors..."
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 180, outline: 'none',
              }} />
          </div>
          <Link href="/vendors/new" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff',
            border: 'none', padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            <Plus size={14} /> ADD CONTRACTOR
          </Link>
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState icon={<Truck size={24} />} title="No contractors registered"
          description="Add vehicle contractors to track rentals."
          action={<Link href="/vendors/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--orange)', color: '#fff', border: 'none',
            padding: '8px 15px', borderRadius: 9, fontSize: '12.5px',
            fontWeight: 600, textDecoration: 'none',
          }}><Plus size={14} /> Add Contractor</Link>} />
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Company', 'Contact', 'Contact Phone', 'Company Phone', 'Email', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 13px', fontSize: '10.5px', fontWeight: 600,
                    color: 'var(--text-muted)', textAlign: 'left',
                    letterSpacing: '0.5px', textTransform: 'uppercase',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} style={{
                  borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '10px 13px' }}>
                    <Link href={`/vendors/${v.id}`} style={{
                      fontSize: '12.5px', fontWeight: 600,
                      color: 'var(--text-secondary)', textDecoration: 'none',
                      transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >{v.name}</Link>
                  </td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.contact_person || '—'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.contact_person_phone || '—'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.company_phone || '—'}</td>
                  <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>{v.email || '—'}</td>
                  <td style={{ padding: '10px 13px' }}>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/vendors/${v.id}`} title="View" style={{
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
