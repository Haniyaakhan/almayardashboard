'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useMachines } from '@/hooks/useMachines';
import { saveTimesheet, getTimesheetWithEntries, getTimesheetByLaborer } from '@/hooks/useTimesheetHistory';
import TimesheetHeader from '@/components/TimesheetHeader';
import InfoTable from '@/components/InfoTable';
import WorkTable from '@/components/WorkTable';
import FooterSection from '@/components/FooterSection';
import ExportButtons from '@/components/ExportButtons';
import TemplateRow from '@/components/TemplateRow';
import { Button } from '@/components/ui/Button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Save, Link as LinkIcon, Eraser, Plus } from 'lucide-react';
import type { DayEntry } from '@/types/timesheet';
import { generateDaysInMonth } from '@/lib/dateUtils';

function VehicleTimesheetPageInner() {
  const timesheetRef = useRef<HTMLDivElement>(null);
  const timesheet = useTimesheet();
  const { machines } = useMachines();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [clearStartDay, setClearStartDay] = useState(1);
  const [clearEndDay, setClearEndDay] = useState(1);
  const [fillHours, setFillHours] = useState(10);
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  // On mount: load existing timesheet if ?ts= param is present
  useEffect(() => {
    const tsId = searchParams.get('ts');
    const vehicleId = searchParams.get('vehicle');
    if (vehicleId) setSelectedVehicleId(vehicleId);
    if (tsId) {
      getTimesheetWithEntries(tsId).then(ts => {
        if (!ts) return;
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

  // When machines load and ?vehicle= param exists (no ts param), auto-fill vehicle info
  useEffect(() => {
    const vehicleId = searchParams.get('vehicle');
    const tsId = searchParams.get('ts');
    if (!vehicleId || !machines.length || tsId) return;
    const machine = machines.find(m => m.id === vehicleId);
    if (!machine) return;
    timesheet.setLaborName(machine.operator_name ?? '');
    timesheet.setDesignation(`${machine.name}# ${machine.plate_number ?? ''}`);
  }, [machines]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onVehicleSelect(id: string) {
    setSelectedVehicleId(id);
    if (!id) return;
    const machine = machines.find(m => m.id === id);
    if (!machine) return;
    try {
      const existing = await getTimesheetByLaborer(id, timesheet.month, timesheet.year);
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

  async function handleSave() {
    setSaving(true);
    const vehicleId = selectedVehicleId || searchParams.get('vehicle') || null;
    const error = await saveTimesheet({
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
        {/* Vehicle selector */}
        <div className="flex items-center gap-2">
          <LinkIcon size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedVehicleId}
            onChange={e => onVehicleSelect(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 180 }}
          >
            <option value="">Select Vehicle</option>
            {machines.filter(m => m.category === 'vehicle').map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.plate_number || m.type})</option>
            ))}
          </select>
        </div>

        <Button variant="primary" size="sm" loading={saving} icon={<Save size={13}/>} onClick={handleSave}>
          Save Timesheet
        </Button>

        {/* Clear date range */}
        <div className="flex items-center gap-1.5 ml-auto" style={{ marginRight: 8 }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Day</span>
          <input type="number" min={1} max={31} value={clearStartDay}
            onChange={e => setClearStartDay(Number(e.target.value))}
            className="text-sm rounded-lg px-2 py-1 outline-none text-center"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 52 }}
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>to</span>
          <input type="number" min={1} max={31} value={clearEndDay}
            onChange={e => setClearEndDay(Number(e.target.value))}
            className="text-sm rounded-lg px-2 py-1 outline-none text-center"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 52 }}
          />
          <button onClick={async () => {
            const ok = await confirm({ title: 'Clear Entries', message: `Clear all timesheet entries from day ${clearStartDay} to ${clearEndDay}?`, variant: 'danger', confirmLabel: 'Clear' });
            if (!ok) return;
            timesheet.clearDayRange(clearStartDay, clearEndDay);
          }}
            className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5"
            style={{
              background: 'var(--red-bg, #fef2f2)', border: '1px solid var(--red-border, #fecaca)',
              color: 'var(--red-text, #dc2626)', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Eraser size={12} /> Clear
          </button>
          <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Hrs</span>
          <input type="number" min={1} max={24} value={fillHours}
            onChange={e => setFillHours(Number(e.target.value))}
            className="text-sm rounded-lg px-2 py-1 outline-none text-center"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', width: 52 }}
          />
          <button onClick={async () => {
            const ok = await confirm({ title: 'Fill Default Values', message: `Fill ${fillHours} hours for day ${clearStartDay} to ${clearEndDay}?`, variant: 'info', confirmLabel: 'Fill' });
            if (!ok) return;
            timesheet.fillDayRange(clearStartDay, clearEndDay, fillHours);
          }}
            className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5"
            style={{
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#16a34a', cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Plus size={12} /> Add
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
        <TemplateRow sheetType="vehicle" month={timesheet.month} year={timesheet.year} workData={timesheet.workData} onUpdateDayEntry={timesheet.updateDayEntry} />
      </div>

      {/* A4 Timesheet */}
      <div className="p-4" style={{ paddingBottom: 24 }}>
        <div
          ref={timesheetRef}
          className="w-a4 min-h-a4 bg-white mx-auto"
          style={{ border: '1px solid black', padding: '10px', overflow: 'visible', marginBottom: '2px' }}
        >
          <TimesheetHeader title="Time Sheet" />
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
          />
          <WorkTable
            month={timesheet.month} year={timesheet.year}
            workData={timesheet.workData}
            totalWorked={timesheet.totalWorked} totalOT={timesheet.totalOT}
            onUpdateDayEntry={timesheet.updateDayEntry}
            vehicleMode
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
