'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { StatCard } from '@/components/ui/StatCard';

interface Props {
  activeLaborers: number;
  totalLaborers?: number;
  activeMachines: number;
  totalMachines?: number;
  activeEquipment: number;
  totalEquipment?: number;
  totalVendors: number;
}

export function KPIGrid({ activeLaborers, totalLaborers, activeMachines, totalMachines, activeEquipment, totalEquipment, totalVendors }: Props) {
  const router = useRouter();
  const tl = totalLaborers || activeLaborers;
  const tm = totalMachines || activeMachines;
  const te = totalEquipment || activeEquipment;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 14,
      border: '1px solid var(--border)',
      boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'stretch',
      gap: 0,
    }}>
      <StatCard
        title="Active Labour"
        value={activeLaborers}
        subtitle={`/ ${tl}`}
        icon={<span style={{ fontSize: 18 }}>👷</span>}
        iconBg="var(--orange-lt)"
        iconColor="var(--orange)"
        barColor="var(--orange)"
        barPercent={tl ? Math.round(activeLaborers / tl * 100) : 0}
        onClick={() => router.push('/operations/labor')}
      />
      <StatCard
        title="Active Vehicles"
        value={activeMachines}
        subtitle={`/ ${tm}`}
        icon={<span style={{ fontSize: 18 }}>🚛</span>}
        iconBg="var(--blue-bg)"
        iconColor="var(--blue)"
        barColor="var(--blue)"
        barPercent={tm ? Math.round(activeMachines / tm * 100) : 0}
        onClick={() => router.push('/machines')}
      />
      <StatCard
        title="Active Equipment"
        value={activeEquipment}
        subtitle={`/ ${te}`}
        icon={<span style={{ fontSize: 18 }}>⚙️</span>}
        iconBg="var(--teal-bg)"
        iconColor="var(--teal)"
        barColor="var(--teal)"
        barPercent={te ? Math.round(activeEquipment / te * 100) : 0}
        onClick={() => router.push('/equipment')}
      />
      <StatCard
        title="Total Suppliers"
        value={totalVendors}
        subtitle="vehicle contractors"
        icon={<span style={{ fontSize: 18 }}>🏢</span>}
        iconBg="var(--purple-bg)"
        iconColor="var(--purple)"
        barColor="var(--purple)"
        barPercent={100}
        onClick={() => router.push('/vendors')}
      />
    </div>
  );
}
