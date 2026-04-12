'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createVendor } from '@/hooks/useVendors';
import { VendorForm } from '@/components/vendors/VendorForm';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export default function NewVendorPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="p-6">
      <Card>
        <VendorForm submitLabel="Create Contractor"
          onSubmit={async data => {
            const err = await createVendor(data);
            if (err) throw err;
            toast.success('Contractor created successfully');
            router.push('/vendors');
          }} />
      </Card>
    </div>
  );
}

