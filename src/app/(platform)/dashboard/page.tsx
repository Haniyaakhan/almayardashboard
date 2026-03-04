'use client';
import React from 'react';
import { KPIGrid } from '@/components/dashboard/KPIGrid';
import { LaborHoursChart } from '@/components/dashboard/LaborHoursChart';
import { MachineUsageChart } from '@/components/dashboard/MachineUsageChart';
import { RecentTimesheets } from '@/components/dashboard/RecentTimesheets';
import { PageSpinner } from '@/components/ui/Spinner';
import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';

export default function DashboardPage() {
  const { kpis, loading } = useDashboardKPIs();
  const { timesheets } = useTimesheetHistory();

  if (loading) return <PageSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          UAE Oman Railway · Package 5B · ALMYAR UNITED TRADING LLC
        </p>
      </div>

      <KPIGrid
        activeLaborers={kpis.activeLaborers}
        monthlyHours={kpis.monthlyHours}
        machinesInUse={kpis.machinesInUse}
        machineHoursMonth={kpis.machineHoursMonth}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LaborHoursChart data={kpis.laborHoursChart} />
        <MachineUsageChart data={kpis.machineUsageChart} />
      </div>

      <RecentTimesheets timesheets={timesheets} />
    </div>
  );
}
