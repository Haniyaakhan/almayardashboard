'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { createMachine } from '@/hooks/useMachines';
import { MachineForm } from '@/components/machines/MachineForm';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

export default function NewEquipmentPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="p-6">
      <Card>
        <MachineForm
          initial={{ category: 'equipment' }}
          submitLabel="Register Equipment"
          onSubmit={async data => {
            const err = await createMachine(data);
            if (err) throw err;
            toast.success('Equipment registered successfully');
            router.push('/equipment');
          }} />
      </Card>
    </div>
  );
}

