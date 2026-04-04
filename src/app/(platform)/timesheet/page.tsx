'use client';

import React, { useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTimesheet } from '@/hooks/useTimesheet';
import { useLaborers, getLaborerByIdNumber, createLaborer } from '@/hooks/useLaborers';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { saveTimesheet, getTimesheetWithEntries, getTimesheetByLaborer } from '@/hooks/useTimesheetHistory';
import { createClient } from '@/lib/supabase/client';
import TimesheetHeader from '@/components/TimesheetHeader';
import InfoTable from '@/components/InfoTable';
import WorkTable from '@/components/WorkTable';
import FooterSection from '@/components/FooterSection';
import ExportButtons from '@/components/ExportButtons';
import TemplateRow from '@/components/TemplateRow';
import { Button } from '@/components/ui/Button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { Save, Search, Eraser, UserPlus } from 'lucide-react';
import type { DayEntry } from '@/types/timesheet';
import type { Laborer } from '@/types/database';
import { generateDaysInMonth } from '@/lib/dateUtils';

function TimesheetPageInner() {
  const timesheetRef = useRef<HTMLDivElement>(null);
  const hasAutoPrintedRef = useRef(false);
  const timesheet = useTimesheet();
  const { laborers } = useLaborers();
  const [selectedLaborerId, setSelectedLaborerId] = useState<string>('');
  const [takenLaborerIds, setTakenLaborerIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [rangeStartDay, setRangeStartDay] = useState(1);
  const [rangeEndDay, setRangeEndDay] = useState(1);
  const [laborSearchInput, setLaborSearchInput] = useState('');
  const [laborSearchStatus, setLaborSearchStatus] = useState<'idle' | 'notfound'>('idle');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLaborerInitialId, setAddLaborerInitialId] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const searchParams = useSearchParams();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const maxClearDay = timesheet.workData.length || 31;

  function formatLaborDisplayName(lab: Laborer): string {
    return lab.id_number ? `${lab.full_name} # ${lab.id_number}` : lab.full_name;
  }

  // Fetch laborer IDs that already have a timesheet for the current month/year
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('timesheets')
      .select('laborer_id')
      .eq('sheet_type', 'labor')
      .eq('month', timesheet.month)
      .eq('year', timesheet.year)
      .then(({ data }) => {
        const ids = new Set<string>((data ?? []).map((r: any) => r.laborer_id).filter(Boolean));
        setTakenLaborerIds(ids);
      });
  }, [timesheet.month, timesheet.year]);

  // On mount: load existing timesheet if ?ts= param is present
  useEffect(() => {
    const tsId = searchParams.get('ts');
    const laborerId = searchParams.get('laborer');
    if (laborerId) setSelectedLaborerId(laborerId);
    if (tsId) {
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

  // When laborers load, update designation with fresh laborer data (for both ?laborer= and ?ts= paths)
  useEffect(() => {
    if (!laborers.length) return;
    const laborerId = searchParams.get('laborer') || selectedLaborerId;
    if (!laborerId) return;
    const lab = laborers.find(l => l.id === laborerId);
    if (!lab) return;
    timesheet.setLaborName(formatLaborDisplayName(lab));
    timesheet.setDesignation(lab.designation ?? '');
    setLaborSearchInput(lab.full_name || lab.id_number || '');
  }, [laborers]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadLaborerIntoTimesheet(lab: Laborer) {
    setSelectedLaborerId(lab.id);
    setLaborSearchInput(lab.full_name || lab.id_number || '');
    setLaborSearchStatus('idle');
    try {
      const existing = await getTimesheetByLaborer(lab.id, timesheet.month, timesheet.year);
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
          laborName: formatLaborDisplayName(lab),
          projectName: existing.project_name ?? timesheet.projectName,
          supplierName: '',
          siteEngineerName: existing.site_engineer_name ?? '',
          designation: lab.designation ?? '',
        });
      } else {
        setIsApproved(false);
        const days = generateDaysInMonth(timesheet.month, timesheet.year);
        timesheet.loadEntries(days, {
          month: timesheet.month,
          year: timesheet.year,
          laborName: formatLaborDisplayName(lab),
          designation: lab.designation ?? '',
        });
      }
    } catch {
      setIsApproved(false);
      const days = generateDaysInMonth(timesheet.month, timesheet.year);
      timesheet.loadEntries(days, {
        month: timesheet.month,
        year: timesheet.year,
        laborName: formatLaborDisplayName(lab),
        designation: lab.designation ?? '',
      });
    }
  }

  async function onLaborerSelect(id: string) {
    if (!id) return;
    const lab = laborers.find(l => l.id === id);
    if (!lab) return;
    await loadLaborerIntoTimesheet(lab);
  }

  async function handleLaborSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      setLaborSearchStatus('idle');
      return;
    }

    const exactIdMatch = await getLaborerByIdNumber(trimmed);
    if (exactIdMatch) {
      await loadLaborerIntoTimesheet(exactIdMatch);
      return;
    }

    const lowered = trimmed.toLowerCase();
    const exactNameMatch = laborers.find(l => l.full_name.trim().toLowerCase() === lowered);
    if (exactNameMatch) {
      await loadLaborerIntoTimesheet(exactNameMatch);
      return;
    }

    const partialMatches = laborers.filter(l => {
      if (takenLaborerIds.has(l.id) && l.id !== selectedLaborerId) return false;
      return l.full_name.toLowerCase().includes(lowered) || l.id_number.toLowerCase().includes(lowered);
    });

    if (partialMatches.length === 1) {
      await loadLaborerIntoTimesheet(partialMatches[0]);
      return;
    }

    setLaborSearchStatus('notfound');
    setAddLaborerInitialId(trimmed);
    setShowAddModal(true);
  }



  function hasTimesheetValues() {
    return timesheet.workData.some(entry =>
      entry.timeIn || entry.timeOutLunch || entry.lunchBreak || entry.timeIn2 || entry.timeOut2 ||
      (entry.totalDuration || 0) > 0 || (entry.overTime || 0) > 0 || (entry.actualWorked || 0) > 0 ||
      entry.approverSig || entry.remarks
    );
  }

  async function handleSave() {
    if (isApproved) {
      toast.error('Approved timesheets cannot be edited');
      return;
    }

    if (!timesheet.laborName.trim() || !timesheet.designation.trim()) {
      toast.error('Labour name and designation are required before saving');
      return;
    }

    if (!hasTimesheetValues()) {
      toast.error('Enter timesheet values before saving');
      return;
    }

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
        {/* Labour search/select */}
        <div className="flex items-center gap-2 flex-wrap">
          <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            list="laborer-search-options"
            value={laborSearchInput}
            onChange={e => { setLaborSearchInput(e.target.value); setLaborSearchStatus('idle'); }}
            onKeyDown={e => { if (e.key === 'Enter') handleLaborSearch(laborSearchInput); }}
            onBlur={() => { if (laborSearchInput.trim() && laborSearchStatus === 'idle') handleLaborSearch(laborSearchInput); }}
            disabled={isApproved}
            placeholder="Search Labour by name or ID / Iqama…"
            className="text-sm rounded-lg px-3 py-1.5 outline-none"
            style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border)', minWidth: 280 }}
          />
          <datalist id="laborer-search-options">
            {laborers.map(l => {
              const isTaken = takenLaborerIds.has(l.id) && l.id !== selectedLaborerId;
              if (isTaken) return null;
              return <option key={l.id} value={l.full_name}>{`${l.full_name} (${l.id_number})`}</option>;
            })}
          </datalist>
          {laborSearchStatus === 'notfound' && (
            <>
              <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 500 }}>Not found</span>
              <button disabled={isApproved} onClick={() => setShowAddModal(true)} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}><UserPlus size={11} /> Add Labour</button>
            </>
          )}
        </div>

        {/* Save button */}
        <Button
          variant="primary"
          size="sm"
          loading={saving}
          disabled={isApproved || !timesheet.laborName.trim() || !timesheet.designation.trim() || !hasTimesheetValues()}
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
        <TemplateRow sheetType="labor" month={timesheet.month} year={timesheet.year} workData={timesheet.workData} onUpdateDayEntry={timesheet.updateDayEntry} onMonthChange={timesheet.setMonth} readOnly={isApproved} />
      </div>

      {/* A4 Timesheet */}
      <div className="p-4" style={{ paddingBottom: 24 }}>
        <div
          ref={timesheetRef}
          className="w-a4 min-h-a4 bg-white mx-auto"
          style={{ border: '1px solid black', padding: '10px', overflow: 'visible', marginBottom: '2px' }}
        >
          <TimesheetHeader timesheetType="labor" />
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
      {showAddModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', overflowY: 'auto', padding: '32px 16px' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: '100%', maxWidth: 680, margin: '0 auto', boxShadow: '0 8px 40px rgba(0,0,0,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserPlus size={20} color="#3b82f6" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add New Labour</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)', lineHeight: 1 }}
              >✕</button>
            </div>
            <LaborerForm
              initial={{ id_number: addLaborerInitialId }}
              submitLabel="Add Labour"
              onSubmit={async data => {
                const err = await createLaborer(data);
                if (err) throw err;
                const idNum = (data.id_number ?? '').trim();
                const newLab = idNum ? await getLaborerByIdNumber(idNum) : null;
                if (newLab) {
                  setLaborSearchStatus('idle');
                  await loadLaborerIntoTimesheet(newLab);
                }
                setShowAddModal(false);
                toast.success('Labour added and loaded');
              }}
            />
          </div>
        </div>
      )}
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
