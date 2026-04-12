'use client';
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getVendorById, updateVendor } from '@/hooks/useVendors';
import { VendorForm } from '@/components/vendors/VendorForm';
import { useMachines } from '@/hooks/useMachines';
import { PageSpinner } from '@/components/ui/Spinner';
import { machineStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormModal } from '@/components/ui/FormModal';
import { useToast } from '@/components/ui/Toast';
import { Edit } from 'lucide-react';
import type { Vendor } from '@/types/database';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const { machines } = useMachines();
  const vendorMachines = machines.filter(m => m.vendor_id === id);
  const toast = useToast();

  useEffect(() => { getVendorById(id).then(setVendor); }, [id]);
  if (!vendor) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }} className="space-y-5">
      <PageHeader action={<Button size="sm" variant="secondary" icon={<Edit size={13}/>} onClick={() => setShowEditModal(true)}>Edit</Button>} />
      <Card>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Contact Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[['Contact Person', vendor.contact_person], ['Contact Person Phone', vendor.contact_person_phone], ['Company Phone', vendor.company_phone], ['Email', vendor.email], ['Address', vendor.address]].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{l}</div>
              <div className="text-[var(--text-primary)]">{v || '—'}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Machines ({vendorMachines.length})</h3>
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
                  <td className="py-2 text-[var(--text-primary)]">{m.name}</td>
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
      <FormModal open={showEditModal} title="Edit Contractor" onClose={() => setShowEditModal(false)}>
        <VendorForm
          initial={vendor}
          submitLabel="Update Contractor"
          onSubmit={async data => {
            const err = await updateVendor(id, data);
            if (err) throw err;
            toast.success('Contractor updated successfully');
            const updated = await getVendorById(id);
            if (updated) setVendor(updated);
            setShowEditModal(false);
          }}
        />
      </FormModal>
    </div>
  );
}
