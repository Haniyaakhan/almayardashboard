'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getVendorById, updateVendor } from '@/hooks/useVendors';
import { VendorForm } from '@/components/vendors/VendorForm';
import { PageSpinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import type { Vendor } from '@/types/database';

export default function EditVendorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  useEffect(() => { getVendorById(id).then(setVendor); }, [id]);
  if (!vendor) return <PageSpinner />;
  return (
    <div className="p-6">
      <PageHeader title="Edit Contractor" subtitle={vendor.name} />
      <Card>
        <VendorForm initial={vendor} submitLabel="Update Contractor"
          onSubmit={async data => {
            const err = await updateVendor(id, data);
            if (err) throw err;
            toast.success('Contractor updated successfully');
            router.push(`/vendors/${id}`);
          }} />
      </Card>
    </div>
  );
}
