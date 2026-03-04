'use client';
import React from 'react';
import Link from 'next/link';
import { useVendors } from '@/hooks/useVendors';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Truck, Plus } from 'lucide-react';

export default function VendorsPage() {
  const { vendors, loading } = useVendors();
  if (loading) return <PageSpinner />;
  return (
    <div className="p-6">
      <PageHeader title="Vendors" subtitle={`${vendors.length} active vendors`}
        action={<Link href="/vendors/new"><Button size="sm" icon={<Plus size={13}/>}>Add Vendor</Button></Link>} />
      {!vendors.length ? (
        <EmptyState icon={<Truck size={24}/>} title="No vendors registered"
          description="Add equipment suppliers to track machine rentals."
          action={<Link href="/vendors/new"><Button size="sm">Add Vendor</Button></Link>} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--bg-sidebar)' }}>
              <tr>{['Company','Contact','Phone','Email','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--row-alt)', borderTop: '1px solid var(--border)' }}>
                  <td className="px-4 py-3 font-medium text-white">{v.name}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{v.contact_person || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{v.phone || '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{v.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/vendors/${v.id}`} className="text-xs" style={{ color: '#e8762b' }}>View</Link>
                      <Link href={`/vendors/${v.id}/edit`} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Edit</Link>
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
