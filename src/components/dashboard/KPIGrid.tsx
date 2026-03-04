'use client';
import React from 'react';
import { StatCard } from '@/components/ui/StatCard';
import { Users, Clock, Settings2, Gauge } from 'lucide-react';

interface Props {
  activeLaborers: number;
  monthlyHours: number;
  machinesInUse: number;
  machineHoursMonth: number;
}

export function KPIGrid({ activeLaborers, monthlyHours, machinesInUse, machineHoursMonth }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Active Laborers"        value={activeLaborers}               icon={<Users size={18}/>}     iconColor="#3b82f6" subtitle="Registered workers" />
      <StatCard title="Monthly Labor Hours"    value={`${monthlyHours}h`}           icon={<Clock size={18}/>}     iconColor="#e8762b" subtitle="Current month total" />
      <StatCard title="Machines In Use"        value={machinesInUse}                icon={<Settings2 size={18}/>} iconColor="#22c55e" subtitle="Active equipment" />
      <StatCard title="Machine Hours (Month)"  value={`${machineHoursMonth.toFixed(1)}h`} icon={<Gauge size={18}/>} iconColor="#a855f7" subtitle="Current month usage" />
    </div>
  );
}
