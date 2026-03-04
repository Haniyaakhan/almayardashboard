'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLaborers, deactivateLaborer } from '@/hooks/useLaborers';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Users, Plus, Search } from 'lucide-react';

export default function LaborPage() {
  const { laborers, loading, refetch } = useLaborers(false);
  const [search, setSearch] = useState('');

  const filtered = laborers.filter(l =>
    l.full_name.toLowerCase().includes(search.toLowerCase()) ||
    l.designation.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6">
      <PageHeader title="Labor Registry" subtitle={`${laborers.filter(l => l.is_active).length} active workers`}
        action={<Link href="/labor/new"><Button size="sm" icon={<Plus size={13}/>}>Add Laborer</Button></Link>} />

      {/* Search */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg max-w-sm"
        style={{ background: '#1e2336', border: '1px solid #2d3454' }}>
        <Search size={14} style={{ color: '#64748b' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or designation…"
          className="flex-1 bg-transparent text-sm text-white outline-none"
          style={{ color: '#f1f5f9' }} />
      </div>

      {!filtered.length ? (
        <EmptyState icon={<Users size={24}/>} title="No laborers found"
          description="Add your first laborer to get started."
          action={<Link href="/labor/new"><Button size="sm">Add Laborer</Button></Link>} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d3454' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1a1f2e' }}>
              <tr>
                {['Name','Designation','Supplier','Phone','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? '#1e2336' : '#1a1f2e', borderTop: '1px solid #2d3454' }}>
                  <td className="px-4 py-3 font-medium text-white">{l.full_name}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{l.designation}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{l.supplier_name || '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{l.phone || '—'}</td>
                  <td className="px-4 py-3"><Badge color={l.is_active ? 'green' : 'gray'}>{l.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/labor/${l.id}`} className="text-xs" style={{ color: '#e8762b' }}>View</Link>
                      <Link href={`/labor/${l.id}/edit`} className="text-xs" style={{ color: '#94a3b8' }}>Edit</Link>
                      {l.is_active && (
                        <button onClick={async () => { await deactivateLaborer(l.id); refetch(); }}
                          className="text-xs" style={{ color: '#ef4444' }}>Deactivate</button>
                      )}
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
