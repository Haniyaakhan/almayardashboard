'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createMachine } from '@/hooks/useMachines';
import { MachineForm } from '@/components/machines/MachineForm';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

export default function NewMachinePage() {
  const router = useRouter();
  return (
    <div className="p-6">
      <PageHeader title="Add Machine" subtitle="Register new heavy equipment" />
      <Card>
        <MachineForm submitLabel="Register Machine"
          onSubmit={async data => {
            const err = await createMachine(data);
            if (err) throw err;
            router.push('/machines');
          }} />
      </Card>
    </div>
  );
}
