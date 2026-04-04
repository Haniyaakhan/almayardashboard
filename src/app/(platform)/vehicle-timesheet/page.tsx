'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useMachines } from '@/hooks/useMachines';
import { saveTimesheet, getTimesheetWithEntries, getTimesheetByLaborer, countTimesheetsForEntity } from '@/hooks/useTimesheetHistory';
import TimesheetHeader from '@/components/TimesheetHeader';
import InfoTable from '@/components/InfoTable';
import WorkTable from '@/components/WorkTable';
import FooterSection from '@/components/FooterSection';
import ExportButtons from '@/components/ExportButtons';
import TemplateRow from '@/components/TemplateRow';
import { Button } from '@/components/ui/Button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Save, Search, Eraser } from 'lucide-react';
import type { DayEntry } from '@/types/timesheet';
import { generateDaysInMonth } from '@/lib/dateUtils';

function VehicleTimesheetPageInner() {
  const timesheetRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);
  const timesheet = useTimesheet();
  const { machines } = useMachines();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [loadedTsId, setLoadedTsId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [rangeStartDay, setRangeStartDay] = useState(1);
  const [rangeEndDay, setRangeEndDay] = useState(1);
  const [vehicleSearchInput, setVehicleSearchInput] = useState('');
  const [vehicleSearchStatus, setVehicleSearchStatus] = useState<'idle' | 'notfound'>('idle');
  const [isApproved, setIsApproved] = useState(false);
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const maxClearDay = timesheet.workData.length || 31;

  // On mount: load existing timesheet if ?ts= param is present
  useEffect(() => {
    const tsId = searchParams.get('ts');
    const vehicleId = searchParams.get('vehicle');
    if (vehicleId) setSelectedVehicleId(vehicleId);
    if (tsId) {
      setLoadedTsId(tsId);
      getTimesheetWithEntries(tsId).then(ts => {
        if (!ts) return;
        setIsApproved((ts.status ?? '').toLowerCase() === 'approved');
        const entries: DayEntry[] = ((ts as any).entries ?? []).map((e: any) => ({
          day: e.day,
          timeIn: e.time_in ?? '',
          timeOutLunch: e.time_out_lunch ?? '',
          lunchBreak: e.lunch_break ?? '',
          timeIn2: e.time_in_2 ?? '',
          timeOut2: e.time_out_2 ?? '',
          totalDuration: e.total_duration ?? 0,
          overTime: e.over_time ?? 0,
          actualWorked: e.actual_worked ?? 0,
          approverSig: e.approver_sig ?? '',
          remarks: e.remarks ?? '',
        }));
        // For vehicle timesheets: laborName = vehicle name (Equipment), designation = plate_number (Reg No)
        const machine = machines.find(m => m.id === ts.laborer_id);
        timesheet.loadEntries(entries, {
          month: ts.month,
          year: ts.year,
          laborName: machine?.operator_name ?? ts.labor_name ?? '',
          projectName: ts.project_name ?? '',
          supplierName: ts.supplier_name ?? '',
          siteEngineerName: ts.site_engineer_name ?? '',
          designation: machine ? `${machine.name}# ${machine.plate_number ?? ''}` : (ts.designation ?? ''),
        });
      });
    }
  }, [machines]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get('print') !== '1') {
      hasAutoPrintedRef.current = false;
      return;
    }

    if (!searchParams.get('ts') || !timesheet.laborName.trim() || hasAutoPrintedRef.current) return;

    const timer = window.setTimeout(() => {
      hasAutoPrintedRef.current = true;
      window.print();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchParams, timesheet.laborName, timesheet.designation, timesheet.month, timesheet.year]);

  // When machines load and ?vehicle= param exists (no ts param), auto-fill vehicle info
  useEffect(() => {
    const vehicleId = searchParams.get('vehicle');
    const tsId = searchParams.get('ts');
    if (!vehicleId || !machines.length || tsId) return;
    const machine = machines.find(m => m.id === vehicleId);
    if (!machine) return;
    timesheet.setLaborName(machine.operator_name ?? '');
    timesheet.setDesignation(`${machine.name}# ${machine.plate_number ?? ''}`);
    setVehicleSearchInput(machine.plate_number ?? machine.name);
  }, [machines]); // eslint-disable-line react-hooks/exhaustive-deps

  function hasTimesheetValues() {
    return timesheet.workData.some(entry =>
      entry.timeIn || entry.timeOutLunch || entry.lunchBreak || entry.timeIn2 || entry.timeOut2 ||
      (entry.totalDuration || 0) > 0 || (entry.overTime || 0) > 0 || (entry.actualWorked || 0) > 0 ||
      entry.approverSig || entry.remarks
    );
  }

  async function loadVehicleIntoTimesheet(machine: (typeof machines)[number]) {
    setSelectedVehicleId(machine.id);
    setVehicleSearchInput(machine.plate_number ?? machine.name);
    setVehicleSearchStatus('idle');
    try {
      const existing = await getTimesheetByLaborer(machine.id, timesheet.month, timesheet.year);
      setLoadedTsId(existing?.id ?? null);
      setIsApproved((existing?.status ?? '').toLowerCase() === 'approved');
      if (existing && (existing as any).entries?.length) {
        const entries: DayEntry[] = ((existing as any).entries ?? []).map((e: any) => ({
          day: e.day,
          timeIn: e.time_in ?? '',
          timeOutLunch: e.time_out_lunch ?? '',
          lunchBreak: e.lunch_break ?? '',
          timeIn2: e.time_in_2 ?? '',
          timeOut2: e.time_out_2 ?? '',
          totalDuration: e.total_duration ?? 0,
          overTime: e.over_time ?? 0,
          actualWorked: e.actual_worked ?? 0,
          approverSig: e.approver_sig ?? '',
          remarks: e.remarks ?? '',
        }));
        timesheet.loadEntries(entries, {
          month: existing.month,
          year: existing.year,
          laborName: machine.operator_name ?? '',
          projectName: existing.project_name ?? timesheet.projectName,
          supplierName: existing.supplier_name ?? '',
          siteEngineerName: existing.site_engineer_name ?? '',
          designation: `${machine.name}# ${machine.plate_number ?? ''}`,
        });
      } else {
        setIsApproved(false);
        const days = generateDaysInMonth(timesheet.month, timesheet.year);
        timesheet.loadEntries(days, {
          month: timesheet.month,
          year: timesheet.year,
          laborName: machine.operator_name ?? '',
          designation: `${machine.name}# ${machine.plate_number ?? ''}`,
          supplierName: '',
        });
      }
    } catch {
      setIsApproved(false);
      const days = generateDaysInMonth(timesheet.month, timesheet.year);
      timesheet.loadEntries(days, {
        month: timesheet.month,
        year: timesheet.year,
        laborName: machine.operator_name ?? '',
        designation: `${machine.name}# ${machine.plate_number ?? ''}`,
        supplierName: '',
      });
    }
  }

  async function onVehicleSelect(id: string) {
    if (!id) return;
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    await loadVehicleIntoTimesheet(machine);
  }

  async function handleVehicleSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      setVehicleSearchStatus('idle');
      return;
    }
    const lowered = trimmed.toLowerCase();
    const vehicles = machines.filter(m => m.category === 'vehicle');
    const exactPlateMatch = vehicles.find(m => (m.plate_number ?? '').toLowerCase() === lowered);
    if (exactPlateMatch) {
      await loadVehicleIntoTimesheet(exactPlateMatch);
      return;
    }
    const exactNameMatch = vehicles.find(m => m.name.toLowerCase() === lowered);
    if (exactNameMatch) {
      await loadVehicleIntoTimesheet(exactNameMatch);
      return;
    }
    const partialMatches = vehicles.filter(m =>
      m.name.toLowerCase().includes(lowered) || (m.plate_number ?? '').toLowerCase().includes(lowered)
    );
    if (partialMatches.length === 1) {
      await loadVehicleIntoTimesheet(partialMatches[0]);
      return;
    }
    setVehicleSearchStatus('notfound');
  }

  async function handleSave() {
    if (isApproved) {
      toast.error('Approved timesheets cannot be edited');
      return;
    }

    const hasManualVehicleDetails = Boolean(
      timesheet.laborName.trim() || timesheet.designation.trim()
    );

    if (!selectedVehicleId && !searchParams.get('vehicle') && !hasManualVehicleDetails) {
      toast.error('Select a vehicle or type an operator name / reg no before saving');
      return;
    }

    if (!hasManualVehicleDetails && !(selectedVehicleId || searchParams.get('vehicle'))) {
      toast.error('Enter an operator name or reg no before saving');
      return;
    }

    if (!hasTimesheetValues()) {
      toast.error('Enter timesheet values before saving');
      return;
    }

    const vehicleId = selectedVehicleId || searchParams.get('vehicle') || null;

    // Enforce max 2 timesheets per vehicle per month
    if (vehicleId && !loadedTsId) {
      const existing = await countTimesheetsForEntity(vehicleId, timesheet.month, timesheet.year);
      if (existing >= 2) {
        toast.error('Max 2 timesheets per vehicle per month');
        return;
      }
    }

    setSaving(true);
    const error = await saveTimesheet({
      timesheetId: loadedTsId,
      laborer_id: vehicleId,
      sheet_type: 'vehicle',
      labor_name: timesheet.laborName || undefined,
      month: timesheet.month,
      year: timesheet.year,
      project_name: timesheet.projectName,
      supplier_name: timesheet.supplierName,
      site_engineer_name: timesheet.siteEngineerName,
      designation: timesheet.designation,
      total_worked: timesheet.totalWorked,
      total_ot: timesheet.totalOT,
      total_actual: timesheet.totalActual,
      entries: timesheet.workData.map(e => ({
        day: e.day,
        time_in: e.timeIn ?? '',
        time_out_lunch: e.timeOutLunch ?? '',
        lunch_break: e.lunchBreak ?? '',
        time_in_2: e.timeIn2 ?? '',
        time_out_2: e.timeOut2 ?? '',
        total_duration: e.totalDuration ?? 0,
        over_time: e.overTime ?? 0,
        actual_worked: e.actualWorked ?? 0,
        approver_sig: e.approverSig ?? '',
        remarks: e.remarks ?? '',
      })),
    });
    setSaving(false);
    if (error) toast.error(`Error: ${error.message}`);
    else toast.success('Timesheet saved successfully');
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%' }}>
      {/* Actions bar */}
      <div className="print:hidden flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
        {/* Vehicle search/select */}
        <div className="flex items-center gap-2 flex-wrap">
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            list="vehicle-search-options"
            value={vehicleSearchInput}
            onChange={e => { setVehicleSearchInput(e.target.value); setVehicleSearchStatus('idle'); }}
            onKeyDown={e => { if (e.key === 'Enter') handleVehicleSearch(vehicleSearchInput); }}
            onBlur={() => { if (vehicleSearchInput.trim() && vehicleSearchStatus === 'idle') handleVehicleSearch(vehicleSearchInput); }}
            disabled={isApproved}
            placeholder="Search vehicle by number or name..."
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 280 }}
          />
          <datalist id="vehicle-search-options">
            {machines.filter(m => m.category === 'vehicle').map(m => (
              <option key={m.id} value={m.plate_number || m.name}>{`${m.name} (${m.plate_number || m.type})`}</option>
            ))}
          </datalist>
          {vehicleSearchStatus === 'notfound' && (
            <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>Vehicle not found</span>
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={
            saving ||
            isApproved ||
            (!selectedVehicleId && !timesheet.laborName.trim() && !timesheet.designation.trim()) ||
            !hasTimesheetValues()
          }
          icon={<Save size={13}/>}
          onClick={handleSave}
        >
          {isApproved ? 'Approved' : 'Save Timesheet'}
        </Button>

        {isApproved && (
          <span className="text-xs font-semibold" style={{ color: 'var(--orange)' }}>
            Approved timesheet is locked. You can still print it.
          </span>
        )}

        {/* Clear day range */}
        <div className="flex items-center gap-1.5 ml-auto" style={{ marginRight: 8 }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From</span>
          <input type="number" min={1} max={maxClearDay} value={rangeStartDay}
            onChange={e => setRangeStartDay(Math.max(1, Math.min(maxClearDay, Number(e.target.value) || 1)))}
            disabled={isApproved}
            className="text-sm rounded-lg px-2 py-1 outline-none text-center"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 52 }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>To</span>
          <input type="number" min={1} max={maxClearDay} value={rangeEndDay}
            onChange={e => setRangeEndDay(Math.max(1, Math.min(maxClearDay, Number(e.target.value) || 1)))}
            disabled={isApproved}
            className="text-sm rounded-lg px-2 py-1 outline-none text-center"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 52 }}
          />
          <button disabled={isApproved} onClick={async () => {
            const startDay = Math.min(rangeStartDay, rangeEndDay);
            const endDay = Math.max(rangeStartDay, rangeEndDay);
            const message = startDay === endDay
              ? `Clear all timesheet entries for day ${startDay}?`
              : `Clear all timesheet entries from day ${startDay} to day ${endDay}?`;
            const ok = await confirm({ title: 'Clear Entries', message, variant: 'danger', confirmLabel: 'Clear' });
            if (!ok) return;
            timesheet.clearDayRange(startDay, endDay);
          }}
            className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5"
            style={{
              background: 'var(--red-bg, #fef2f2)', border: '1px solid var(--red-border, #fecaca)',
              color: 'var(--red-text, #dc2626)', cursor: isApproved ? 'not-allowed' : 'pointer', opacity: isApproved ? 0.6 : 1, whiteSpace: 'nowrap',
            }}
          >
            <Eraser size={12} /> Clear
          </button>
        </div>

        <div>
          <ExportButtons
            timesheetRef={timesheetRef}
            laborName={timesheet.laborName}
            month={timesheet.month}
            year={timesheet.year}
            projectName={timesheet.projectName}
            workData={timesheet.workData}
            totalWorked={timesheet.totalWorked}
            totalOT={timesheet.totalOT}
            totalActual={timesheet.totalActual}
          />
        </div>
        <TemplateRow sheetType="vehicle" month={timesheet.month} year={timesheet.year} workData={timesheet.workData} onUpdateDayEntry={timesheet.updateDayEntry} onMonthChange={timesheet.setMonth} readOnly={isApproved} />
      </div>

      {/* A4 Timesheet */}
      <div className="p-4" style={{ paddingBottom: 24 }}>
        <div
          ref={timesheetRef}
          className="w-a4 min-h-a4 bg-white mx-auto"
          style={{ border: '1px solid black', padding: '10px', overflow: 'visible', marginBottom: '2px' }}
        >
          <TimesheetHeader title="Time Sheet" timesheetType="vehicle" />
          <InfoTable
            month={timesheet.month} year={timesheet.year}
            laborName={timesheet.laborName} projectName={timesheet.projectName}
            supplierName={timesheet.supplierName} siteEngineerName={timesheet.siteEngineerName}
            designation={timesheet.designation}
            onMonthChange={timesheet.setMonth} onYearChange={timesheet.setYear}
            onLaborNameChange={timesheet.setLaborName} onProjectNameChange={timesheet.setProjectName}
            onSupplierNameChange={timesheet.setSupplierName}
            onSiteEngineerNameChange={timesheet.setSiteEngineerName}
            onDesignationChange={timesheet.setDesignation}
            laborNameLabel="Operator Name"
            designationLabel="Reg No"
            readOnly={isApproved}
          />
          <WorkTable
            month={timesheet.month} year={timesheet.year}
            workData={timesheet.workData}
            totalWorked={timesheet.totalWorked} totalOT={timesheet.totalOT}
            totalActual={timesheet.totalActual}
            onUpdateDayEntry={timesheet.updateDayEntry}
            vehicleMode
            readOnly={isApproved}
          />
          <FooterSection
            totalWorked={timesheet.totalWorked} totalOT={timesheet.totalOT}
            totalActual={timesheet.totalActual}
            vehicleMode
          />
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

export default function VehicleTimesheetPage() {
  return (
    <Suspense>
      <VehicleTimesheetPageInner />
    </Suspense>
  );
}
