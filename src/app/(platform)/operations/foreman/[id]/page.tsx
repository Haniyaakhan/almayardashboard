'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { getForemanById } from '@/hooks/useForemen';
import { useLaborers } from '@/hooks/useLaborers';
import type { Foreman } from '@/types/database';
import { PageSpinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ForemanProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [foreman, setForeman] = useState<Foreman | null>(null);
  const [loadingForeman, setLoadingForeman] = useState(true);

  const { laborers, loading: loadingLabor } = useLaborers(false);

  useEffect(() => {
    async function load() {
      setLoadingForeman(true);
      const data = await getForemanById(id);
      setForeman(data);
      setLoadingForeman(false);
    }
    if (id) load();
  }, [id]);

  const assignedLaborers = useMemo(() => laborers.filter((l) => l.foreman_id === id), [laborers, id]);
  const linkedLaborer = useMemo(() => {
    if (!foreman?.laborer_id) return null;
    return laborers.find((l) => l.id === foreman.laborer_id) ?? null;
  }, [foreman, laborers]);

  if (loadingForeman || loadingLabor) return <PageSpinner />;

  if (!foreman) {
    return (
      <Card>
        <EmptyState icon={<UserCheck size={24} />} title="Foreman not found" />
      </Card>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card padding="p-4">
          <h3 style={sectionTitleStyle}>Personal Info</h3>
          <div style={lineStyle}>
            <strong>Linked Labourer:</strong>{' '}
            {linkedLaborer ? (
              <Link href={`/labor/${linkedLaborer.id}`} style={linkTextStyle}>{linkedLaborer.full_name}</Link>
            ) : (
              '—'
            )}
          </div>
          <div style={lineStyle}><strong>ID:</strong> {foreman.id_number || '—'}</div>
          <div style={lineStyle}><strong>Phone:</strong> {foreman.phone || '—'}</div>
          <div style={lineStyle}><strong>Email:</strong> {foreman.email || '—'}</div>
          <div style={lineStyle}><strong>Linked Designation:</strong> {linkedLaborer?.designation || '—'}</div>
          <div style={lineStyle}><strong>Status:</strong> {foreman.is_active ? 'Active' : 'Inactive'}</div>
        </Card>

        <Card padding="p-4">
          <h3 style={sectionTitleStyle}>Assigned Labor</h3>
          {!assignedLaborers.length ? (
            <p style={lineStyle}>No laborers assigned.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Labour ID</th>
                  <th style={thStyle}>Designation</th>
                  <th style={thStyle}>Commission (OMR)</th>
                </tr>
              </thead>
              <tbody>
                {assignedLaborers.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                    <td style={tdStyle}>
                      <Link href={`/labor/${l.id}`} style={linkTextStyle}>{l.full_name}</Link>
                    </td>
                    <td style={tdStyle}>{l.id_number || '—'}</td>
                    <td style={tdStyle}>{l.designation || '—'}</td>
                    <td style={tdStyle}>{Number(l.foreman_commission ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text-primary)',
  marginBottom: 8,
};

const lineStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--text-light)',
  marginBottom: 6,
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const linkTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontWeight: 600,
};
