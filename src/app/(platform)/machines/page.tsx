'use client';
import React from 'react';
import Link from 'next/link';
import { useMachines } from '@/hooks/useMachines';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { machineStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Settings2, Plus } from 'lucide-react';

export default function MachinesPage() {
  const { machines, loading } = useMachines();
  if (loading) return <PageSpinner />;
  return (
    <div className="p-6">
      <PageHeader title="Machines & Equipment" subtitle={`${machines.length} registered`}
        action={<Link href="/machines/new"><Button size="sm" icon={<Plus size={13}/>}>Add Machine</Button></Link>} />
      {!machines.length ? (
        <EmptyState icon={<Settings2 size={24}/>} title="No machines registered"
          description="Register heavy equipment to track usage and costs."
          action={<Link href="/machines/new"><Button size="sm">Add Machine</Button></Link>} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #2d3454' }}>
          <table className="w-full text-sm">
            <thead style={{ background: '#1a1f2e' }}>
              <tr>{['Machine','Type','Vendor','Plate','Daily Rate','Status','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium" style={{ color: '#64748b' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {machines.map((m, i) => (
                <tr key={m.id} style={{ background: i % 2 === 0 ? '#1e2336' : '#1a1f2e', borderTop: '1px solid #2d3454' }}>
                  <td className="px-4 py-3 font-medium text-white">{m.name}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{m.type}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{(m.vendor as any)?.name ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{m.plate_number || '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#94a3b8' }}>{m.daily_rate ? `AED ${m.daily_rate}` : '—'}</td>
                  <td className="px-4 py-3">{machineStatusBadge(m.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <Link href={`/machines/${m.id}`} className="text-xs" style={{ color: '#e8762b' }}>View</Link>
                      <Link href={`/machines/${m.id}/edit`} className="text-xs" style={{ color: '#94a3b8' }}>Edit</Link>
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
