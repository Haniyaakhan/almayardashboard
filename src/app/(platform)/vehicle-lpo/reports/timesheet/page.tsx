'use client';
import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useMachines } from '@/hooks/useMachines';
import { useShifts } from '@/hooks/useShifts';
import { buildVehicleTimesheetDayEntries } from '@/lib/vehicleTimesheetView';
import { MONTH_NAMES } from '@/lib/dateUtils';
import LatestTimesheetHeader from '@/components/LatestTimesheetHeader';
import LatestTimesheetWorkTable from '@/components/LatestTimesheetWorkTable';
import LatestTimesheetFooter from '@/components/LatestTimesheetFooter';
import ExportButtons from '@/components/ExportButtons';
import { PageSpinner } from '@/components/ui/Spinner';
import type { ShiftType } from '@/types/database';

function VehicleTimesheetReportInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { machines, loading: machinesLoading } = useMachines();
  const vehicles = useMemo(() => machines.filter(m => m.category === 'vehicle'), [machines]);

  const now = new Date();
  const vehicleId = searchParams.get('vehicle') || '';
  const month = Number(searchParams.get('month') ?? now.getMonth());
  const year = Number(searchParams.get('year') ?? now.getFullYear());
  const shiftType = (searchParams.get('shift') as ShiftType) || 'day';

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;
  const { shifts, loading: shiftsLoading } = useShifts({
    vehicleId: vehicleId || undefined,
    shiftType,
    status: 'approved',
    dateFrom: monthStart,
    dateTo: monthEnd,
  });

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/vehicle-lpo/reports/timesheet?${params.toString()}`);
  }

  const vehicle = vehicles.find(v => v.id === vehicleId);
  const workData = useMemo(() => buildVehicleTimesheetDayEntries(month, year, shifts), [month, year, shifts]);
  const totalActual = workData.reduce((sum, e) => sum + (e.actualWorked || 0), 0);
  const lpoNumber = shifts[0]?.lpo_number_snapshot ?? '';
  const driverName = shifts[0]?.driver_name_snapshot ?? vehicle?.operator_name ?? '';

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%' }}>
      <div className="print:hidden flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
        <select value={vehicleId} onChange={e => updateParam('vehicle', e.target.value)} disabled={machinesLoading}
          className="text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 220 }}>
          <option value="">Select vehicle…</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} — {v.type}</option>)}
        </select>
        <select value={month} onChange={e => updateParam('month', e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => updateParam('year', e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none text-center"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 90 }} />
        <select value={shiftType} onChange={e => updateParam('shift', e.target.value)}
          className="text-sm rounded-lg px-3 py-1.5 outline-none"
          style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          <option value="day">☀ Day</option>
          <option value="night">🌙 Night</option>
        </select>
        <div className="ml-auto"><ExportButtons /></div>
      </div>

      <div className="p-4" style={{ paddingBottom: 24 }}>
        {!vehicleId ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 13 }}>Select a vehicle to generate its timesheet.</div>
        ) : machinesLoading || shiftsLoading ? (
          <PageSpinner />
        ) : (
          <div className="w-a4 min-h-a4 bg-white mx-auto" style={{ padding: 0, overflow: 'visible', marginBottom: '2px' }}>
            <LatestTimesheetHeader
              title="Vehicle Time Sheet"
              projectName={vehicle?.name ?? ''}
              supplierName=""
              siteEngineerName=""
              siteEngineerId=""
              laborName={vehicle?.type ?? ''}
              designation={vehicle?.plate_number ?? ''}
              lpoNumber={lpoNumber}
              driverName={driverName}
              shift={shiftType}
              month={month}
              year={year}
              onProjectNameChange={() => {}}
              onSupplierNameChange={() => {}}
              onSiteEngineerNameChange={() => {}}
              onSiteEngineerIdChange={() => {}}
              onLaborNameChange={() => {}}
              onDesignationChange={() => {}}
              onLpoNumberChange={() => {}}
              onDriverNameChange={() => {}}
              onShiftChange={() => {}}
              onMonthChange={() => {}}
              onYearChange={() => {}}
              readOnly
            />
            <LatestTimesheetWorkTable
              month={month} year={year}
              workData={workData}
              totalActual={totalActual}
              onUpdateDayEntry={() => {}}
              readOnly
            />
            <LatestTimesheetFooter totalActual={totalActual} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function VehicleTimesheetReportPage() {
  return (
    <Suspense>
      <VehicleTimesheetReportInner />
    </Suspense>
  );
}
