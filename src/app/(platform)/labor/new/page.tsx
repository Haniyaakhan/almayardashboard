'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createLaborer } from '@/hooks/useLaborers';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export default function NewLaborerPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="p-6">
      <PageHeader title="Add Laborer" subtitle="Register a new worker" />
      <Card>
        <LaborerForm submitLabel="Create Laborer"
          onSubmit={async data => {
            const err = await createLaborer(data);
            if (err) throw err;
            toast.success('Laborer created successfully');
            router.push('/operations/labor');
          }}
        />
      </Card>
    </div>
  );
}
