'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMachineById } from '@/hooks/useMachines';
import { UsageLogForm } from '@/components/machines/UsageLogForm';
import { PageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import type { Machine } from '@/types/database';

export default function NewUsageLogPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [machine, setMachine] = useState<Machine | null>(null);
  useEffect(() => { getMachineById(id).then(setMachine); }, [id]);
  if (!machine) return <PageSpinner />;
  return (
    <div className="p-6">
      <Card>
        <UsageLogForm machineId={id} onSuccess={() => router.push(`/machines/${id}`)} />
      </Card>
    </div>
  );
}
