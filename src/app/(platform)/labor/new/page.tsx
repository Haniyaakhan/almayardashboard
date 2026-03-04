'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createLaborer } from '@/hooks/useLaborers';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

export default function NewLaborerPage() {
  const router = useRouter();
  return (
    <div className="p-6">
      <PageHeader title="Add Laborer" subtitle="Register a new worker" />
      <Card>
        <LaborerForm submitLabel="Create Laborer"
          onSubmit={async data => {
            const err = await createLaborer(data);
            if (err) throw err;
            router.push('/labor');
          }}
        />
      </Card>
    </div>
  );
}
