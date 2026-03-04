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
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d3454' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1a1f2e' }}>
              <tr>{['Company','Contact','Phone','Email','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {vendors.map((v, i) => (
                <tr key={v.id} style={{ background: i % 2 === 0 ? '#1e2336' : '#1a1f2e', borderTop: '1px solid #2d3454' }}>
                  <td className="px-4 py-3 font-medium text-white">{v.name}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{v.contact_person || '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{v.phone || '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{v.email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/vendors/${v.id}`} className="text-xs" style={{ color: '#e8762b' }}>View</Link>
                      <Link href={`/vendors/${v.id}/edit`} className="text-xs" style={{ color: '#94a3b8' }}>Edit</Link>
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
