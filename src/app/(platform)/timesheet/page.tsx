'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useLaborers } from '@/hooks/useLaborers';
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

function TimesheetPageInner() {
  const timesheetRef = useRef<HTMLDivElement>(null);
  const timesheet = useTimesheet();
  const { laborers } = useLaborers();
  const [selectedLaborerId, setSelectedLaborerId] = useState<string>('');
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
    const laborerId = searchParams.get('laborer');
    if (laborerId) setSelectedLaborerId(laborerId);
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
        timesheet.loadEntries(entries, {
          month: ts.month,
          year: ts.year,
          laborName: ts.labor_name ?? '',
          projectName: ts.project_name ?? '',
          supplierName: '',
          siteEngineerName: ts.site_engineer_name ?? '',
          designation: ts.designation ?? '',
        });
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When laborers load, update designation with fresh laborer data (for both ?laborer= and ?ts= paths)
  useEffect(() => {
    if (!laborers.length) return;
    const laborerId = searchParams.get('laborer') || selectedLaborerId;
    if (!laborerId) return;
    const lab = laborers.find(l => l.id === laborerId);
    if (!lab) return;
    timesheet.setLaborName(lab.full_name);
    timesheet.setDesignation(`${lab.designation}# ${lab.id_number}`);
  }, [laborers]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onLaborerSelect(id: string) {
    setSelectedLaborerId(id);
    if (!id) return;
    const lab = laborers.find(l => l.id === id);
    if (!lab) return;
    try {
      // Try to load existing timesheet for this laborer + current month/year
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
          laborName: lab.full_name,
          projectName: existing.project_name ?? timesheet.projectName,
          supplierName: '',
          siteEngineerName: existing.site_engineer_name ?? '',
          designation: `${lab.designation}# ${lab.id_number}`,
        });
      } else {
        // No existing timesheet — reset to default days and fill header
        const days = generateDaysInMonth(timesheet.month, timesheet.year);
        timesheet.loadEntries(days, {
          month: timesheet.month,
          year: timesheet.year,
          laborName: lab.full_name,
          designation: `${lab.designation}# ${lab.id_number}`,
        });
      }
    } catch {
      // If API fails, still update header info
      const days = generateDaysInMonth(timesheet.month, timesheet.year);
      timesheet.loadEntries(days, {
        month: timesheet.month,
        year: timesheet.year,
        laborName: lab.full_name,
        designation: `${lab.designation}# ${lab.id_number}`,
      });
    }
  }

  async function handleSave() {
    setSaving(true);
    const laborerId = selectedLaborerId || searchParams.get('laborer') || null;
    const error = await saveTimesheet({
      laborer_id: laborerId,
      sheet_type: 'labor',
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
      {/* Actions bar — hidden on print */}
      <div className="print:hidden flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border)' }}>
        {/* Laborer linker */}
        <div className="flex items-center gap-2">
          <LinkIcon size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            value={selectedLaborerId}
            onChange={e => onLaborerSelect(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 180 }}
          >
            <option value="">Select Laborer (optional)</option>
            {laborers.map(l => (
              <option key={l.id} value={l.id}>{l.full_name}</option>
            ))}
          </select>
        </div>

        {/* Save button */}
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
        <TemplateRow sheetType="labor" month={timesheet.month} year={timesheet.year} workData={timesheet.workData} onUpdateDayEntry={timesheet.updateDayEntry} />
      </div>

      {/* A4 Timesheet */}
      <div className="p-4" style={{ paddingBottom: 24 }}>
        <div
          ref={timesheetRef}
          className="w-a4 min-h-a4 bg-white mx-auto"
          style={{ border: '1px solid black', padding: '10px', overflow: 'visible', marginBottom: '2px' }}
        >
          <TimesheetHeader />
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
          />
          <WorkTable
            month={timesheet.month} year={timesheet.year}
            workData={timesheet.workData}
            totalWorked={timesheet.totalWorked} totalOT={timesheet.totalOT}
            onUpdateDayEntry={timesheet.updateDayEntry}
          />
          <FooterSection
            totalWorked={timesheet.totalWorked} totalOT={timesheet.totalOT}
            totalActual={timesheet.totalActual}
          />
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}

export default function TimesheetPage() {
  return (
    <Suspense>
      <TimesheetPageInner />
    </Suspense>
  );
}
