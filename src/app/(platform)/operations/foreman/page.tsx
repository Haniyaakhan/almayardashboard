'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useForemen, createForeman, deactivateForeman, reactivateForeman } from '@/hooks/useForemen';
import { useLaborers } from '@/hooks/useLaborers';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';

export default function OperationsForemanPage() {
  const { foremen, loading, refetch } = useForemen(false);
  const { laborers } = useLaborers(false);
  const toast = useToast();

  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [linkedLaborerId, setLinkedLaborerId] = useState('');
  const [saving, setSaving] = useState(false);

  const laborByForeman = useMemo(() => {
    const map = new Map<string, number>();
    laborers.forEach((laborer) => {
      const key = laborer.foreman_id ?? '';
      if (!key) return;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [laborers]);

  async function onCreate() {
    if (!fullName.trim()) {
      toast.error('Foreman name is required');
      return;
    }

    if (linkedLaborerId && foremen.some((f) => f.laborer_id === linkedLaborerId)) {
      toast.error('This labourer is already linked to a foreman');
      return;
    }

    setSaving(true);
    const { error } = await createForeman({
      laborer_id: linkedLaborerId || null,
      full_name: fullName.trim(),
      id_number: idNumber.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setFullName('');
    setIdNumber('');
    setPhone('');
    setEmail('');
    setLinkedLaborerId('');
    refetch();
    toast.success('Foreman created');
  }

  if (loading) return <PageSpinner />;

  return (
    <div>


      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
          <select
            value={linkedLaborerId}
            onChange={(e) => {
              const nextId = e.target.value;
              setLinkedLaborerId(nextId);
              if (!nextId) return;
              const laborer = laborers.find((l) => l.id === nextId);
              if (!laborer) return;
              setFullName(laborer.full_name || '');
              setIdNumber(laborer.id_number || '');
              setPhone(laborer.phone || '');
            }}
            style={inputStyle}
          >
            <option value="">Link existing labourer (optional)</option>
            {laborers
              .filter((l) => l.is_active)
              .filter((l) => !foremen.some((f) => f.laborer_id === l.id))
              .map((l) => (
                <option key={l.id} value={l.id}>{l.full_name} ({l.id_number || 'No ID'})</option>
              ))}
          </select>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Name" style={inputStyle} />
          <input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID Number" style={inputStyle} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" style={inputStyle} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={inputStyle} />
          <Button onClick={onCreate} loading={saving}>Add Foreman</Button>
        </div>
      </Card>

      {!foremen.length ? (
        <Card>
          <EmptyState icon={<Users size={24} />} title="No foremen yet" description="Create the first foreman to start assignments." />
        </Card>
      ) : (
        <Card padding="p-0">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Name', 'Linked Labourer', 'ID', 'Phone', 'Email', 'Assigned Laborers', 'Status', 'Action'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {foremen.map((f) => (
                <tr key={f.id} style={{ borderBottom: '1px solid #f4f1ed' }}>
                  <td style={tdStyle}><Link href={`/operations/foreman/${f.id}`} style={linkTextStyle}>{f.full_name}</Link></td>
                  <td style={tdStyle}>{f.laborer_id ? (laborers.find((l) => l.id === f.laborer_id)?.full_name ?? '—') : '—'}</td>
                  <td style={tdStyle}>{f.id_number || '—'}</td>
                  <td style={tdStyle}>{f.phone || '—'}</td>
                  <td style={tdStyle}>{f.email || '—'}</td>
                  <td style={tdStyle}>{laborByForeman.get(f.id) ?? 0}</td>
                  <td style={tdStyle}><Badge color={f.is_active ? 'green' : 'red'}>{f.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  <td style={tdStyle}>
                    {f.is_active ? (
                      <Button variant="danger" size="sm" onClick={async () => { await deactivateForeman(f.id); refetch(); }}>Deactivate</Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={async () => { await reactivateForeman(f.id); refetch(); }}>Reactivate</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  borderRadius: 9,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
  outline: 'none',
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
