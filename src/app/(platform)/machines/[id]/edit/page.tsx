'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMachineById, updateMachine } from '@/hooks/useMachines';
import { MachineForm } from '@/components/machines/MachineForm';
import { PageSpinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import type { Machine } from '@/types/database';

export default function EditMachinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  useEffect(() => { getMachineById(id).then(setMachine); }, [id]);
  if (!machine) return <PageSpinner />;
  return (
    <div className="p-6">
      <PageHeader title="Edit Machine" subtitle={machine.name} />
      <Card>
        <MachineForm initial={machine} submitLabel="Update Machine"
          onSubmit={async data => {
            const err = await updateMachine(id, data);
            if (err) throw err;
            router.push(`/machines/${id}`);
          }} />
      </Card>
    </div>
  );
}
