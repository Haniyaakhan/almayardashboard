'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getVendorById } from '@/hooks/useVendors';
import { useMachines } from '@/hooks/useMachines';
import { PageSpinner } from '@/components/ui/Spinner';
import { machineStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Edit } from 'lucide-react';
import type { Vendor } from '@/types/database';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const { machines } = useMachines();
  const vendorMachines = machines.filter(m => m.vendor_id === id);

  useEffect(() => { getVendorById(id).then(setVendor); }, [id]);
  if (!vendor) return <PageSpinner />;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title={vendor.name} subtitle="Vendor Profile"
        action={<Link href={`/vendors/${id}/edit`}><Button size="sm" variant="secondary" icon={<Edit size={13}/>}>Edit</Button></Link>} />
      <Card>
        <h3 className="text-sm font-semibold text-white mb-4">Contact Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[['Contact Person', vendor.contact_person], ['Phone', vendor.phone], ['Email', vendor.email], ['Address', vendor.address]].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{l}</div>
              <div className="text-white">{v || '—'}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Machines ({vendorMachines.length})</h3>
          <Link href="/machines/new"><Button size="sm" variant="secondary">Add Machine</Button></Link>
        </div>
        {!vendorMachines.length ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No machines assigned to this vendor.</p> : (
          <table className="w-full text-sm">
            <thead><tr style={{ color: 'var(--text-muted)' }}>
              {['Machine','Type','Plate','Status',''].map(h => <th key={h} className="text-left pb-2 font-medium">{h}</th>)}
            </tr></thead>
            <tbody>
              {vendorMachines.map(m => (
                <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2 text-white">{m.name}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{m.type}</td>
                  <td className="py-2" style={{ color: 'var(--text-secondary)' }}>{m.plate_number || '—'}</td>
                  <td className="py-2">{machineStatusBadge(m.status)}</td>
                  <td className="py-2"><Link href={`/machines/${m.id}`} className="text-xs" style={{ color: '#e8762b' }}>View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
