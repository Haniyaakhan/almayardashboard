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
      <PageHeader title="Add Vendor" subtitle="Register a new equipment supplier" />
      <Card>
        <VendorForm submitLabel="Create Vendor"
          onSubmit={async data => {
            const err = await createVendor(data);
            if (err) throw err;
            router.push('/vendors');
          }} />
      </Card>
    </div>
  );
}
