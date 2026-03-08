'use client';
import React from 'react';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { RecentTimesheets } from '@/components/dashboard/RecentTimesheets';
import { DashDataCard } from '@/components/dashboard/DashDataCard';
import { PageSpinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useLaborers } from '@/hooks/useLaborers';
import { useMachines } from '@/hooks/useMachines';
import { useVendors } from '@/hooks/useVendors';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';

export default function DashboardPage() {
  const { kpis, loading } = useDashboardKPIs();
  const { laborers } = useLaborers(false);
  const { machines } = useMachines();
  const { vendors } = useVendors();
  const { timesheets } = useTimesheetHistory();

  if (loading) return <PageSpinner />;

  const activeLaborers = laborers.filter(l => l.is_active);
  const activeMachines = machines.filter(m => m.status !== 'returned');
  const totalVendors = vendors.length;

  return (
    <div style={{ padding: '20px 24px' }}>
      <KPIGrid
        activeLaborers={activeLaborers.length}
        totalLaborers={laborers.length}
        activeMachines={activeMachines.length}
        totalMachines={machines.length}
        activeEquipment={machines.filter(m => m.status === 'available').length}
        totalEquipment={machines.length}
        totalVendors={totalVendors}
      />

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: 16,
        alignItems: 'start',
        marginTop: 18,
      }}>
        {/* Left: Data cards stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Labour Card */}
          <DashDataCard
            title="Labour"
            icon="👷"
            viewAllHref="/labor"
            btnBg="var(--orange-lt)"
            btnColor="var(--orange)"
            items={activeLaborers.slice(0, 5).map(l => ({
              id: l.id,
              name: l.full_name,
              initials: l.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              sub: `${l.designation} · ${l.supplier_name || '—'}`,  // supplier_name is contractor in DB
              href: `/labor/${l.id}`,
              badge: <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Left'}</Badge>,
              avatarClass: 'or' as const,
            }))}
            emptyText="No labourers found."
          />

          {/* Vehicles Card */}
          <DashDataCard
            title="Vehicles"
            icon="🚛"
            viewAllHref="/machines"
            btnBg="var(--blue-bg)"
            btnColor="var(--blue)"
            items={machines.slice(0, 5).map(m => ({
              id: m.id,
              name: m.name,
              initials: m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              sub: `${m.plate_number || '—'} · ${(m.vendor as any)?.name ?? '—'}`,
              href: `/machines/${m.id}`,
              badge: <Badge color={m.status === 'available' ? 'green' : m.status === 'in_use' ? 'amber' : 'red'}>{m.status}</Badge>,
              avatarClass: 'bl' as const,
            }))}
            emptyText="No machines found."
          />

          {/* Equipment Card */}
          <DashDataCard
            title="Equipment"
            icon="⚙️"
            viewAllHref="/equipment"
            btnBg="var(--teal-bg)"
            btnColor="var(--teal)"
            items={machines.slice(0, 5).map(m => ({
              id: m.id,
              name: `${m.name} (${m.type})`,
              initials: m.type.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              sub: m.plate_number || '—',
              href: `/machines/${m.id}`,
              badge: <Badge color={m.status === 'available' ? 'green' : m.status === 'in_use' ? 'amber' : 'red'}>{m.status}</Badge>,
              avatarClass: 'tl' as const,
            }))}
            emptyText="No equipment found."
          />
        </div>

        {/* Right: Timesheets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RecentTimesheets timesheets={timesheets} />
        </div>
      </div>
    </div>
  );
}
