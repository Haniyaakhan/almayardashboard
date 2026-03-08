'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createVendor } from '@/hooks/useVendors';
import { VendorForm } from '@/components/vendors/VendorForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

export default function NewVendorPage() {
  const router = useRouter();
  return (
    <div className="p-6">
      <PageHeader title="Add Contractor" subtitle="Register a new vehicle contractor" />
      <Card>
        <VendorForm submitLabel="Create Contractor"
          onSubmit={async data => {
            const err = await createVendor(data);
            if (err) throw err;
            router.push('/vendors');
          }} />
      </Card>
    </div>
  );
}
