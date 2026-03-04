'use client';

import React, { useRef, useState } from 'react';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useLaborers } from '@/hooks/useLaborers';
import { saveTimesheet } from '@/hooks/useTimesheetHistory';
import TimesheetHeader from '@/components/TimesheetHeader';
import InfoTable from '@/components/InfoTable';
import WorkTable from '@/components/WorkTable';
import FooterSection from '@/components/FooterSection';
import ExportButtons from '@/components/ExportButtons';
import { Button } from '@/components/ui/Button';
import { Save, Link as LinkIcon } from 'lucide-react';

export default function TimesheetPage() {
  const timesheetRef = useRef<HTMLDivElement>(null);
  const timesheet = useTimesheet();
  const { laborers } = useLaborers();
  const [selectedLaborerId, setSelectedLaborerId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  function onLaborerSelect(id: string) {
    setSelectedLaborerId(id);
    if (!id) return;
    const lab = laborers.find(l => l.id === id);
    if (!lab) return;
    timesheet.setLaborName(lab.full_name);
    timesheet.setDesignation(lab.designation);
    timesheet.setSupplierName(lab.supplier_name);
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg('');
    const error = await saveTimesheet({
      laborer_id: selectedLaborerId || null,
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
        time_in: e.timeIn,
        time_out_lunch: e.timeOutLunch,
        lunch_break: e.lunchBreak,
        time_in_2: e.timeIn2,
        time_out_2: e.timeOut2,
        total_duration: e.totalDuration,
        over_time: e.overTime,
        actual_worked: e.actualWorked,
        approver_sig: e.approverSig,
        remarks: e.remarks,
      })),
    });
    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : 'Saved successfully!');
    setTimeout(() => setSaveMsg(''), 3000);
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%' }}>
      {/* Actions bar — hidden on print */}
      <div className="print:hidden flex items-center gap-3 px-6 py-3 flex-wrap"
        style={{ background: '#1a1f2e', borderBottom: '1px solid #2d3454' }}>
        {/* Laborer linker */}
        <div className="flex items-center gap-2">
          <LinkIcon size={14} style={{ color: '#94a3b8' }} />
          <select
            value={selectedLaborerId}
            onChange={e => onLaborerSelect(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: '#0f1117', color: '#f1f5f9', border: '1px solid #2d3454', minWidth: 180 }}
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

        {saveMsg && (
          <span className="text-xs" style={{ color: saveMsg.startsWith('Error') ? '#ef4444' : '#22c55e' }}>
            {saveMsg}
          </span>
        )}

        <div className="ml-auto">
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
      </div>

      {/* A4 Timesheet */}
      <div className="p-4">
        <div
          ref={timesheetRef}
          className="w-a4 min-h-a4 bg-white border border-black mx-auto"
          style={{ padding: '7px' }}
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
    </div>
  );
}
