'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { getForemanById } from '@/hooks/useForemen';
import { useLaborers } from '@/hooks/useLaborers';
import { useSalaryRecords } from '@/hooks/useSalaryRecords';
import type { Foreman } from '@/types/database';
import { PageSpinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ForemanProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [foreman, setForeman] = useState<Foreman | null>(null);
  const [loadingForeman, setLoadingForeman] = useState(true);

  const { laborers, loading: loadingLabor } = useLaborers(false);
  const { salaryRecords, loading: loadingSalary } = useSalaryRecords();

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
  const assignedIds = useMemo(() => new Set(assignedLaborers.map((l) => l.id)), [assignedLaborers]);
  const salaryHistory = useMemo(() => salaryRecords.filter((r) => assignedIds.has(r.laborer_id)), [salaryRecords, assignedIds]);

  if (loadingForeman || loadingLabor || loadingSalary) return <PageSpinner />;

  if (!foreman) {
    return (
      <Card>
        <EmptyState icon={<UserCheck size={24} />} title="Foreman not found" />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader title={foreman.full_name} subtitle="Foreman profile and assigned labor salary history." />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card padding="p-4">
          <h3 style={sectionTitleStyle}>Personal Info</h3>
          <div style={lineStyle}><strong>ID:</strong> {foreman.id_number || '—'}</div>
          <div style={lineStyle}><strong>Phone:</strong> {foreman.phone || '—'}</div>
          <div style={lineStyle}><strong>Email:</strong> {foreman.email || '—'}</div>
          <div style={lineStyle}><strong>Status:</strong> {foreman.is_active ? 'Active' : 'Inactive'}</div>
        </Card>

        <Card padding="p-4">
          <h3 style={sectionTitleStyle}>Assigned Labor</h3>
          {!assignedLaborers.length ? (
            <p style={lineStyle}>No laborers assigned.</p>
          ) : (
            assignedLaborers.map((l) => (
              <div key={l.id} style={lineStyle}>
                <Link href={`/labor/${l.id}`} style={linkTextStyle}>{l.full_name}</Link> ({l.designation || '—'})
              </div>
            ))
          )}
        </Card>
      </div>

      <Card className="mt-4" padding="p-0">
        <div style={{ padding: '12px 13px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={sectionTitleStyle}>Salary Slip History</h3>
        </div>
        {!salaryHistory.length ? (
          <div style={{ padding: 14 }}>
            <EmptyState icon={<UserCheck size={22} />} title="No salary slips yet" />
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Month/Year', 'Labor', 'Worked Hrs', 'Advances', 'Commission', 'Net Salary', 'Status'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {salaryHistory.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={tdStyle}>{row.month + 1}/{row.year}</td>
                  <td style={tdStyle}>{row.laborer?.full_name ?? '—'}</td>
                  <td style={tdStyle}>{Number(row.total_worked_hours).toFixed(2)}</td>
                  <td style={tdStyle}>{Number(row.advances_amount).toFixed(2)} OMR</td>
                  <td style={tdStyle}>{Number(row.foreman_commission).toFixed(2)} OMR</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{Number(row.net_salary).toFixed(2)} OMR</td>
                  <td style={tdStyle}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
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
  padding: '10px 13px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const linkTextStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  fontWeight: 600,
};
