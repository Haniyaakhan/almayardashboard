'use client';
import React from 'react';
import Link from 'next/link';
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
import { Users, Truck, Settings2, Wrench, ClipboardList, FileBarChart } from 'lucide-react';

const modules = [
  { href: '/labor',                      icon: <Users size={22} />,        label: 'Labour',              sub: 'Manage workers',           color: '#ff6b2b', bg: 'rgba(255,107,43,0.08)' },
  { href: '/vehicle-operations',         icon: <Truck size={22} />,        label: 'Contractors',         sub: 'Suppliers & vendors',      color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  { href: '/vehicle-operations',         icon: <Settings2 size={22} />,    label: 'Vehicles',            sub: 'Fleet management',         color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)' },
  { href: '/equipment',                  icon: <Wrench size={22} />,       label: 'Equipment',           sub: 'Tools & machinery',        color: '#14b8a6', bg: 'rgba(20,184,166,0.08)' },
  { href: '/timesheet/history',          icon: <ClipboardList size={22} />, label: 'Labour Timesheets',  sub: 'Worker time records',      color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
  { href: '/vehicle-timesheet/history',  icon: <ClipboardList size={22} />, label: 'Vehicle Timesheets', sub: 'Vehicle usage records',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
  { href: '/equipment-timesheet/history',icon: <ClipboardList size={22} />, label: 'Equip. Timesheets',  sub: 'Equipment usage records',  color: '#ec4899', bg: 'rgba(236,72,153,0.08)' },
  { href: '/reports',                    icon: <FileBarChart size={22} />, label: 'Reports',             sub: 'Analytics & exports',      color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
];

export default function DashboardPage() {
  const { kpis, loading } = useDashboardKPIs();
  const { laborers } = useLaborers(false);
  const { machines } = useMachines();
  const { vendors } = useVendors();
  const { timesheets } = useTimesheetHistory(undefined, 8);

  if (loading) return <PageSpinner />;

  const activeLaborers = laborers.filter(l => l.is_active);
  const vehicles = machines.filter(m => m.category === 'vehicle');
  const equipment = machines.filter(m => m.category === 'equipment');
  const activeVehicles = vehicles.filter(m => m.status !== 'returned');
  const activeEquipment = equipment.filter(m => m.status !== 'returned');
  const totalVendors = vendors.length;

  return (
    <div style={{ padding: '20px 24px' }}>
      <KPIGrid
        activeLaborers={activeLaborers.length}
        totalLaborers={laborers.length}
        activeMachines={activeVehicles.length}
        totalMachines={vehicles.length}
        activeEquipment={activeEquipment.length}
        totalEquipment={equipment.length}
        totalVendors={totalVendors}
      />

      {/* Module Navigation Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 10,
        marginTop: 16,
      }}>
        {modules.map(m => (
          <Link key={m.href} href={m.href} style={{ textDecoration: 'none', display: 'flex' }}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '14px 10px',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer',
              transition: 'all 0.15s',
              flex: 1, height: 100,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = m.color;
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 14px ${m.color}22`;
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              (e.currentTarget as HTMLDivElement).style.transform = 'none';
            }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 11,
                background: m.bg, color: m.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {m.icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.sub}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

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
            viewAllHref="/vehicle-operations"
            btnBg="var(--blue-bg)"
            btnColor="var(--blue)"
            items={vehicles.slice(0, 5).map(m => ({
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
            items={equipment.slice(0, 5).map(m => ({
              id: m.id,
              name: `${m.name} (${m.type})`,
              initials: m.type.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              sub: m.plate_number || '—',
              href: `/equipment/${m.id}`,
              badge: <Badge color={m.status === 'available' ? 'green' : m.status === 'in_use' ? 'amber' : 'red'}>{m.status}</Badge>,
              avatarClass: 'tl' as const,
            }))}
            emptyText="No equipment found."
          />
        </div>

        {/* Right: Timesheets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <RecentTimesheets timesheets={timesheets} laborers={laborers} machines={machines} />
        </div>
      </div>
    </div>
  );
}
