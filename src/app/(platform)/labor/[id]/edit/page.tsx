'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getLaborerById, updateLaborer } from '@/hooks/useLaborers';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { PageSpinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import type { Laborer } from '@/types/database';

export default function EditLaborerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [laborer, setLaborer] = useState<Laborer | null>(null);

  useEffect(() => { getLaborerById(id).then(setLaborer); }, [id]);
  if (!laborer) return <PageSpinner />;

  return (
    <div className="p-6">
      <PageHeader title="Edit Laborer" subtitle={laborer.full_name} />
      <Card>
        <LaborerForm initial={laborer} submitLabel="Update Laborer"
          onSubmit={async data => {
            const err = await updateLaborer(id, data);
            if (err) throw err;
            router.push(`/labor/${id}`);
          }}
        />
      </Card>
    </div>
  );
}
