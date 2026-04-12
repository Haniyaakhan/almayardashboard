'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock3,
  Download,
  Edit3,
  FilePlus2,
  FileText,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { createLaborer, useLaborers } from '@/hooks/useLaborers';
import {
  approveSalarySheet,
  clearSalarySheetEntries,
  deleteSalarySheetEntry,
  seedSalaryDemoLaborers,
  updateSalarySheetEntry,
  upsertSalarySheetEntry,
  useSalarySheet,
} from '@/hooks/useSalarySheets';
import { MONTH_NAMES, getPreviousMonthYear } from '@/lib/dateUtils';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';
import { exportManualSalarySheetToExcel } from '@/lib/excelExport';
import type { SalarySheetEntry } from '@/types/database';

type EntryDraft = {
  monthlySalary: number;
  totalWorkedHours: number;
  overtimeHours: number;
  deduction: number;
};

function fmt(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : '0.000';
}

function fmtOMR(n: number) {
  return `OMR ${fmt(n)}`;
}

function monthKey(month: number, year: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthKey(value: string) {
  const [yearRaw, monthRaw] = value.split('-');
  return {
    year: Number(yearRaw),
    month: Number(monthRaw),
  };
}

function getMonthOptions() {
  const now = new Date();
  const options: Array<{ month: number; year: number; label: string }> = [];

  for (let offset = -3; offset <= 3; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    options.push({
      month: d.getMonth(),
      year: d.getFullYear(),
      label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
    });
  }

  return options;
}

export default function SalaryGenerationPage() {
  const toast = useToast();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const previousMonth = getPreviousMonthYear();
  const monthOptions = useMemo(() => getMonthOptions(), []);

  const [month, setMonth] = useState(previousMonth.month);
  const [year, setYear] = useState(previousMonth.year);
  const [search, setSearch] = useState('');
  const [laborSearchStatus, setLaborSearchStatus] = useState<'idle' | 'notfound'>('idle');
  const [selectedLaborId, setSelectedLaborId] = useState<string>('');
  const [showAddLaborModal, setShowAddLaborModal] = useState(false);
  const [addLaborerInitialId, setAddLaborerInitialId] = useState('');

  const [addMonthlySalary, setAddMonthlySalary] = useState('0');
  const [addActualWorkedHours, setAddActualWorkedHours] = useState('0');
  const [addDeduction, setAddDeduction] = useState('0');

  const [editingEntryId, setEditingEntryId] = useState<string>('');
  const [drafts, setDrafts] = useState<Record<string, EntryDraft>>({});
  const [recentlyEditedEntryIds, setRecentlyEditedEntryIds] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState('');
  const [seedingDone, setSeedingDone] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  const { laborers, loading: laborersLoading, error: laborersError, refetch: refetchLaborers } = useLaborers(false);
  const {
    sheet,
    entries,
    loading: sheetLoading,
    error: sheetError,
    mode,
    refetch: refetchSheet,
    setEntries,
  } = useSalarySheet(month, year);

  const readOnly = sheet?.status === 'approved';

  useEffect(() => {
    if (seedingDone || laborersLoading) return;

    if (laborers.length < 8) {
      seedSalaryDemoLaborers().then((err) => {
        if (err) {
          toast.error(`Could not seed sample labour records: ${err.message}`);
        } else {
          refetchLaborers();
        }
        setSeedingDone(true);
      });
      return;
    }

    setSeedingDone(true);
  }, [laborers.length, laborersLoading, refetchLaborers, seedingDone, toast]);

  const filteredLaborers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return laborers
      .filter((labor) => {
        if (!q) return true;
        const name = (labor.full_name || '').toLowerCase();
        const idNumber = (labor.id_number || '').toLowerCase();
        const uid = (labor.id || '').toLowerCase();
        return name.includes(q) || idNumber.includes(q) || uid.includes(q);
      })
      .slice(0, 20);
  }, [laborers, search]);

  const selectedLabor = useMemo(() => {
    if (selectedLaborId) {
      return laborers.find((labor) => labor.id === selectedLaborId) ?? null;
    }

    const q = search.trim().toLowerCase();
    if (!q) return null;

    const exact = laborers.find((labor) => {
      const name = (labor.full_name || '').trim().toLowerCase();
      const idNumber = (labor.id_number || '').trim().toLowerCase();
      const uid = (labor.id || '').trim().toLowerCase();
      return name === q || idNumber === q || uid === q;
    });

    return exact ?? null;
  }, [laborers, search, selectedLaborId]);

  async function loadLaborForSalary(labor: (typeof laborers)[number]) {
    setSelectedLaborId(labor.id);
    setSearch(labor.full_name || labor.id_number || labor.id);
    setLaborSearchStatus('idle');
  }

  async function handleLaborSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) {
      setLaborSearchStatus('idle');
      return;
    }

    const lowered = trimmed.toLowerCase();

    const exactIdMatch = laborers.find((labor) => {
      const idNumber = (labor.id_number || '').trim().toLowerCase();
      const uid = (labor.id || '').trim().toLowerCase();
      return idNumber === lowered || uid === lowered;
    });

    if (exactIdMatch) {
      await loadLaborForSalary(exactIdMatch);
      return;
    }

    const exactNameMatch = laborers.find((labor) => (labor.full_name || '').trim().toLowerCase() === lowered);
    if (exactNameMatch) {
      await loadLaborForSalary(exactNameMatch);
      return;
    }

    const partialMatches = laborers.filter((labor) => {
      const name = (labor.full_name || '').toLowerCase();
      const idNumber = (labor.id_number || '').toLowerCase();
      const uid = (labor.id || '').toLowerCase();
      return name.includes(lowered) || idNumber.includes(lowered) || uid.includes(lowered);
    });

    if (partialMatches.length === 1) {
      await loadLaborForSalary(partialMatches[0]);
      return;
    }

    setLaborSearchStatus('notfound');
    setAddLaborerInitialId(trimmed);
    setShowAddLaborModal(true);
  }

  useEffect(() => {
    if (!selectedLabor) return;
    setAddMonthlySalary(String(Number(selectedLabor.monthly_salary ?? 0)));
    setAddActualWorkedHours('0');
    setAddDeduction('0');
  }, [selectedLabor?.id]);

  async function markEdited(entryId: string) {
    setRecentlyEditedEntryIds((prev) => ({ ...prev, [entryId]: true }));
    setTimeout(() => {
      setRecentlyEditedEntryIds((prev) => {
        const next = { ...prev };
        delete next[entryId];
        return next;
      });
    }, 1600);
  }

  async function saveEntryDraft(entry: SalarySheetEntry) {
    if (!sheet || readOnly) return;

    const draft = drafts[entry.id];
    if (!draft) return;

    const actualWorkedHours = Math.max((Number(draft.totalWorkedHours) || 0) + (Number(draft.overtimeHours) || 0), 0);
    const err = await updateSalarySheetEntry(entry.id, {
      monthlySalary: Number(draft.monthlySalary) || 0,
      actualWorkedHours,
      deduction: Number(draft.deduction) || 0,
    });

    if (err) {
      toast.error(err.message);
      return;
    }

    await refetchSheet();
    await markEdited(entry.id);
    setEditingEntryId('');
    toast.success('Row updated');
  }

  async function addFromForm() {
    if (!selectedLabor || !sheet) return;
    if (readOnly) {
      toast.warning('This salary sheet is approved and locked');
      return;
    }

    const duplicate = entries.some((entry) => entry.laborer_id === selectedLabor.id);
    if (duplicate) {
      toast.warning('Duplicate labour ID: this labour is already in the sheet');
      return;
    }

    const monthlySalary = Number(addMonthlySalary) || 0;
    const actualWorkedHours = Math.max(Number(addActualWorkedHours) || 0, 0);

    const err = await upsertSalarySheetEntry({
      sheetId: sheet.id,
      laborer: selectedLabor,
      monthlySalary,
      actualWorkedHours,
      deduction: Number(addDeduction) || 0,
    });

    if (err) {
      toast.error(err.message);
      return;
    }

    await refetchSheet();
    toast.success('Labour added to salary sheet');

    setSearch('');
    setSelectedLaborId('');
    setAddMonthlySalary('0');
    setAddActualWorkedHours('0');
    setAddDeduction('0');
  }

  async function removeRow(entryId: string, laborName: string) {
    if (readOnly) {
      toast.warning('Approved sheets cannot be edited');
      return;
    }

    const ok = await confirm({
      title: 'Delete labour row',
      message: `Remove ${laborName} from this salary sheet?`,
      variant: 'danger',
      confirmLabel: 'Delete',
    });
    if (!ok) return;

    const err = await deleteSalarySheetEntry(entryId);
    if (err) {
      toast.error(err.message);
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    toast.success('Row removed');
  }

  async function clearAllRows() {
    if (!sheet) return;
    if (readOnly) {
      toast.warning('Approved sheets cannot be cleared');
      return;
    }

    const ok = await confirm({
      title: 'Clear full salary sheet',
      message: `Delete all rows for ${MONTH_NAMES[month]} ${year}?`,
      variant: 'danger',
      confirmLabel: 'Clear All',
    });
    if (!ok) return;

    const err = await clearSalarySheetEntries(sheet.id);
    if (err) {
      toast.error(err.message);
      return;
    }

    setEntries([]);
    toast.success('Sheet cleared');
  }

  async function approveSheet() {
    if (!sheet) return;
    if (!entries.length) {
      toast.warning('Add at least one labour row before approval');
      return;
    }

    const ok = await confirm({
      title: 'Approve salary sheet',
      message: 'After approval this month sheet will be locked for editing.',
      variant: 'warning',
      confirmLabel: 'Approve',
    });
    if (!ok) return;

    const err = await approveSalarySheet(sheet.id);
    if (err) {
      toast.error(err.message);
      return;
    }

    await refetchSheet();
    toast.success('Salary sheet approved');
  }

  async function onExportExcel() {
    if (!entries.length) {
      toast.warning('No entries to export');
      return;
    }

    try {
      await exportManualSalarySheetToExcel(
        month,
        year,
        entries.map((entry) => ({
          laborName: entry.labor_name,
          laborId: entry.labor_code,
          salary: Number(entry.monthly_salary || 0),
          bankName: entry.bank_name || '-',
          bankAccountNumber: entry.bank_account_number || '-',
          totalHours: Number(entry.total_worked_hours || 0),
          overTime: Number(entry.overtime_hours || 0),
          actualHours: Number(entry.actual_worked_hours || 0),
          ratePerHour: Number(entry.hourly_rate || 0),
          actualSalary: Number(entry.total_salary || 0),
          deduction: Number(entry.deduction || 0),
          netSalary: Number(entry.total_salary || 0) - Number(entry.deduction || 0),
        }))
      );
    } catch {
      toast.error('Failed to export Excel');
    }
  }

  function onPrintPDF() {
    if (!entries.length) {
      toast.warning('No entries to print');
      return;
    }

    const groupedByDesignation = entries.reduce((acc, entry) => {
      const designation = toDisplayDesignation(entry.designation);
      if (!acc[designation]) acc[designation] = [];
      acc[designation].push(entry);
      return acc;
    }, {} as Record<string, SalarySheetEntry[]>);

    const sectionHtml = Object.keys(groupedByDesignation)
      .sort((a, b) => a.localeCompare(b))
      .map((designation) => {
        const rows = groupedByDesignation[designation];
        const rowsHtml = rows
          .map((entry) => `
            <tr>
              <td>${entry.labor_name}</td>
              <td>${entry.labor_code}</td>
              <td>${fmtOMR(entry.monthly_salary)}</td>
              <td>${fmt(entry.hourly_rate)}</td>
              <td>${fmt(entry.actual_worked_hours)}</td>
              <td>${fmt(entry.total_worked_hours)}</td>
              <td>${fmt(entry.overtime_hours)}</td>
              <td>${fmtOMR(entry.total_salary)}</td>
              <td>${fmtOMR(Number(entry.deduction) || 0)}</td>
              <td>${fmtOMR((Number(entry.total_salary) || 0) - (Number(entry.deduction) || 0))}</td>
              <td>${entry.bank_name || '-'}</td>
              <td>${entry.bank_account_number || '-'}</td>
            </tr>
          `)
          .join('');

        const sectionNetTotal = rows.reduce((sum, item) => sum + ((Number(item.total_salary) || 0) - (Number(item.deduction) || 0)), 0);

        return `
          <h2>${designation}</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>M/Salary</th>
                <th>H/Rate</th>
                <th>AW-Hours</th>
                <th>TW-Hours</th>
                <th>OT</th>
                <th>Total Salary</th>
                <th>Deduction</th>
                <th>Net Salary</th>
                <th>Bank Name</th>
                <th>Account Number</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="section-total">${designation} Total (Net): ${fmtOMR(sectionNetTotal)}</div>
        `;
      })
      .join('');

    const printWindow = window.open('', '_blank', 'width=1200,height=860');
    if (!printWindow) {
      toast.error('Popup blocked. Allow popups and try again.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Sheet - ${MONTH_NAMES[month]} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 0 0 14px; color: #4b5563; }
            h2 { margin: 18px 0 8px; font-size: 14px; color: #1f2937; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
            .section-total { margin: 8px 0 14px; font-weight: 600; font-size: 12px; }
            .total { margin-top: 14px; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>Salary Sheet</h1>
          <p>${MONTH_NAMES[month]} ${year} - ${sheet?.status === 'approved' ? 'Approved' : 'Draft'}</p>
          ${sectionHtml}
          <div class="total">Grand Total (Net): ${fmtOMR(entries.reduce((sum, item) => sum + ((Number(item.total_salary) || 0) - (Number(item.deduction) || 0)), 0))}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function handleMonthChange(nextValue: string) {
    const next = parseMonthKey(nextValue);

    if (editingEntryId) {
      const entry = entries.find((item) => item.id === editingEntryId);
      if (entry) {
        await saveEntryDraft(entry);
      }
    }

    setMonth(next.month);
    setYear(next.year);
    setActiveTab('');
    setEditingEntryId('');
    setDrafts({});
  }

  function startRowEdit(entry: SalarySheetEntry) {
    if (readOnly) return;
    setEditingEntryId(entry.id);
    setDrafts((prev) => ({
      ...prev,
      [entry.id]: {
        monthlySalary: Number(entry.monthly_salary) || 0,
        totalWorkedHours: Number(entry.total_worked_hours) || 0,
        overtimeHours: Number(entry.overtime_hours) || 0,
        deduction: Number(entry.deduction) || 0,
      },
    }));
  }

  function cancelRowEdit(entryId: string) {
    setEditingEntryId('');
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
  }

  function changeDraft(entryId: string, key: keyof EntryDraft, value: number) {
    setDrafts((prev) => ({
      ...prev,
      [entryId]: {
        ...(prev[entryId] ?? { monthlySalary: 0, totalWorkedHours: 0, overtimeHours: 0, deduction: 0 }),
        [key]: value,
      },
    }));
  }

  const designationTabs = useMemo(() => {
    const grouped = new Map<string, { label: string; rows: SalarySheetEntry[] }>();

    entries.forEach((entry) => {
      const key = normalizeDesignationKey(entry.designation);
      const existing = grouped.get(key);
      if (existing) {
        existing.rows.push(entry);
        return;
      }

      grouped.set(key, {
        label: toDisplayDesignation(entry.designation),
        rows: [entry],
      });
    });

    return Array.from(grouped.entries())
      .map(([key, value]) => ({ key, label: value.label, rows: value.rows }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entries]);

  useEffect(() => {
    if (!designationTabs.length) {
      if (activeTab !== '') setActiveTab('');
      return;
    }

    const hasActiveTab = designationTabs.some((tab) => tab.key === activeTab);
    if (!hasActiveTab) {
      setActiveTab(designationTabs[0].key);
    }
  }, [activeTab, designationTabs]);

  const activeRows = useMemo(() => designationTabs.find((tab) => tab.key === activeTab)?.rows ?? [], [activeTab, designationTabs]);

  const filteredActiveRows = useMemo(() => {
    const q = previewSearch.trim().toLowerCase();
    if (!q) return activeRows;

    return activeRows.filter((row) => {
      const name = (row.labor_name || '').toLowerCase();
      const code = (row.labor_code || '').toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [activeRows, previewSearch]);

  const selectedMonthLabel = `${MONTH_NAMES[month]} ${year}`;

  if (laborersLoading || sheetLoading) return <PageSpinner />;

  return (
    <div className="space-y-6 p-4 md:p-6">

      {(laborersError || sheetError) ? (
        <Card>
          <div className="text-sm" style={{ color: mode === 'local' ? '#92400e' : '#dc2626' }}>{laborersError || sheetError}</div>
        </Card>
      ) : null}

      <Card className="overflow-hidden" padding="p-0">
        <div className="grid grid-cols-1 gap-0 xl:grid-cols-3">
          <div className="space-y-4 border-b p-5 xl:border-b-0 xl:border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>
                Salary Month
              </h2>
              <Badge color={sheet?.status === 'approved' ? 'green' : 'orange'}>
                {selectedMonthLabel} - {sheet?.status === 'approved' ? 'Approved' : 'Draft'}
              </Badge>
            </div>

            <label className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Selected Month
              <select
                value={monthKey(month, year)}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {monthOptions.map((option) => (
                  <option key={`${option.year}-${option.month}`} value={monthKey(option.month, option.year)}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <Button variant="secondary" icon={<CheckCircle2 size={14} />} onClick={approveSheet} disabled={readOnly || !entries.length} className="w-full justify-center">
              Approve
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={onExportExcel} className="flex-1 justify-center">
                Export Excel
              </Button>
              <Button variant="secondary" size="sm" icon={<FileText size={14} />} onClick={onPrintPDF} className="flex-1 justify-center">
                Print / PDF
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-b p-5 xl:border-b-0 xl:border-r" style={{ borderColor: 'var(--border)' }}>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>
              Labour Search List
            </h2>

            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
            >
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                list="salary-labor-search-options"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedLaborId('');
                  setLaborSearchStatus('idle');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLaborSearch(search);
                }}
                onBlur={() => {
                  if (search.trim() && laborSearchStatus === 'idle') {
                    handleLaborSearch(search);
                  }
                }}
                placeholder="Search labour by name, ID number, or internal ID"
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <datalist id="salary-labor-search-options">
              {laborers.map((labor) => (
                <option key={labor.id} value={labor.full_name || labor.id_number || labor.id}>
                  {`${labor.full_name || '-'} (${labor.id_number || labor.id})`}
                </option>
              ))}
            </datalist>

            {laborSearchStatus === 'notfound' && (
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>Not found</span>
                <button
                  type="button"
                  onClick={() => setShowAddLaborModal(true)}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold"
                  style={{ background: '#3b82f6', color: '#fff', border: 'none' }}
                >
                  Add Labour
                </button>
              </div>
            )}

            {!search.trim() ? (
              <div className="rounded-2xl p-3 text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                Start typing a labour name or ID to fetch details.
              </div>
            ) : null}
          </div>

          <div className="p-5">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>
              Selection Details
            </h2>

            <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              {selectedLabor ? (
                <div className="space-y-4">
                  <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {selectedLabor.full_name || '-'}
                        </div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {selectedLabor.id_number || selectedLabor.id}
                        </div>
                      </div>
                      <Badge color="blue">{toDisplayDesignation(selectedLabor.designation)}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                      <span className="block">Monthly</span>
                      <span className="block">Salary</span>
                      <input
                        type="number"
                        step="0.001"
                        value={addMonthlySalary}
                        onChange={(e) => setAddMonthlySalary(e.target.value)}
                        className="mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                      <span className="block">Actual Worked</span>
                      <span className="block">Hours</span>
                      <input
                        type="number"
                        step="0.01"
                        value={addActualWorkedHours}
                        onChange={(e) => setAddActualWorkedHours(e.target.value)}
                        className="mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] sm:col-span-2" style={{ color: 'var(--text-muted)' }}>
                      <span className="block">Deduction (OMR)</span>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        value={addDeduction}
                        onChange={(e) => setAddDeduction(e.target.value)}
                        className="mt-2 w-full rounded-xl px-3 py-2 text-sm outline-none"
                        style={{ background: 'var(--bg-card)', border: '1px solid #fca5a5', color: '#dc2626' }}
                      />
                    </label>
                  </div>

                  <Button onClick={addFromForm} disabled={!selectedLabor || readOnly} className="w-full justify-center rounded-xl py-3">
                    Add To Salary Sheet
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl p-4 text-sm" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border)', color: 'var(--text-secondary)' }}>
                  Pick a labour record from the search list to fill this panel and continue to approve from here.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden" padding="p-0">
        {!entries.length ? (
          <div className="p-6">
            <EmptyState title="No labour added" description="Search and add labour from the database. It will appear in its designation tab." />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>
                      Salary Sheet Preview
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Review labour grouped by designation before exporting.
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-3 rounded-2xl px-4 py-2"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', minWidth: 280 }}
                  >
                    <Search size={15} style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Search in preview by labour name or ID"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {designationTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
                      style={{
                        background: activeTab === tab.key ? 'var(--orange)' : 'var(--input-bg)',
                        border: activeTab === tab.key ? '1px solid var(--orange)' : '1px solid var(--border)',
                        color: activeTab === tab.key ? '#fff' : 'var(--text-primary)',
                        boxShadow: activeTab === tab.key ? '0 10px 24px rgba(255,107,43,0.22)' : 'none',
                      }}
                    >
                      {tab.label} ({tab.rows.length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-2 pb-2 md:px-5 md:pb-5">
              <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead style={{ background: 'var(--thead-bg)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {[
                        'Name',
                        'ID',
                        'M/Salary',
                        'H/Rate',
                        'AW-Hours',
                        'TW-Hours',
                        'OT',
                        'Total Salary',
                        'Deduction',
                        'Net Salary',
                        'Bank Name',
                        'Account Number',
                        'Action',
                      ].map((h) => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActiveRows.map((row, index) => {
                      const isEditing = editingEntryId === row.id;
                      const draft = drafts[row.id];
                      const monthlySalary = isEditing ? (draft?.monthlySalary ?? row.monthly_salary) : row.monthly_salary;
                      const totalWorkedHours = isEditing ? (draft?.totalWorkedHours ?? row.total_worked_hours) : row.total_worked_hours;
                      const overtime = isEditing ? (draft?.overtimeHours ?? row.overtime_hours) : row.overtime_hours;
                      const deduction = isEditing ? (draft?.deduction ?? (Number(row.deduction) || 0)) : (Number(row.deduction) || 0);
                      const actualWorkedHours = Number(totalWorkedHours) + Number(overtime);
                      const hourlyRate = (Number(monthlySalary) || 0) / 260;
                      const totalSalary = hourlyRate * actualWorkedHours;
                      const netSalary = totalSalary - deduction;

                      return (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: recentlyEditedEntryIds[row.id]
                              ? 'rgba(16,185,129,0.12)'
                              : (index % 2 === 0 ? 'var(--bg-card)' : 'var(--row-alt)'),
                            transition: 'background 0.4s ease',
                          }}
                        >
                          <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{row.labor_name}</td>
                          <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{row.labor_code}</td>
                          <td className="px-3 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.001"
                                value={monthlySalary}
                                onChange={(e) => changeDraft(row.id, 'monthlySalary', Number(e.target.value) || 0)}
                                className="w-32 rounded-xl px-3 py-2 text-sm outline-none text-right"
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-primary)' }}>{fmtOMR(row.monthly_salary)}</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmt(hourlyRate)}</td>

                          <td className="px-3 py-3 text-right" style={{ color: 'var(--text-primary)' }}>
                            <span>{fmt(actualWorkedHours)}</span>
                          </td>

                          <td className="px-3 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={totalWorkedHours}
                                onChange={(e) => changeDraft(row.id, 'totalWorkedHours', Number(e.target.value) || 0)}
                                className="w-28 rounded-xl px-3 py-2 text-sm outline-none text-right"
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                              />
                            ) : (
                              <span style={{ color: 'var(--text-primary)' }}>{fmt(row.total_worked_hours)}</span>
                            )}
                          </td>

                          <td className="px-3 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                value={overtime}
                                onChange={(e) => changeDraft(row.id, 'overtimeHours', Number(e.target.value) || 0)}
                                className="w-24 rounded-xl px-3 py-2 text-sm outline-none text-right"
                                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                              />
                            ) : (
                              <span style={{ color: row.overtime_hours > 0 ? 'var(--green-text)' : 'var(--text-primary)', fontWeight: row.overtime_hours > 0 ? 700 : 500 }}>{fmt(row.overtime_hours)}</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{fmtOMR(totalSalary)}</td>

                          <td className="px-3 py-3">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={deduction}
                                onChange={(e) => changeDraft(row.id, 'deduction', Number(e.target.value) || 0)}
                                className="w-28 rounded-xl px-3 py-2 text-sm outline-none text-right"
                                style={{ background: 'var(--input-bg)', border: '1px solid #fca5a5', color: '#dc2626' }}
                              />
                            ) : (
                              <span style={{ color: deduction > 0 ? '#dc2626' : 'var(--text-primary)' }}>{fmtOMR(deduction)}</span>
                            )}
                          </td>

                          <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--orange)', whiteSpace: 'nowrap' }}>{fmtOMR(netSalary)}</td>

                          <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{row.bank_name || '-'}</td>
                          <td className="px-3 py-3" style={{ color: 'var(--text-primary)' }}>{row.bank_account_number || '-'}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {!readOnly && (
                                isEditing ? (
                                  <>
                                    <button
                                      onClick={() => saveEntryDraft(row)}
                                      className="rounded-xl px-3 py-2"
                                      style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d' }}
                                      title="Save"
                                    >
                                      <Save size={13} />
                                    </button>
                                    <button
                                      onClick={() => cancelRowEdit(row.id)}
                                      className="rounded-xl px-3 py-2"
                                      style={{ border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)' }}
                                      title="Cancel"
                                    >
                                      <X size={13} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => startRowEdit(row)}
                                    className="rounded-xl px-3 py-2"
                                    style={{ border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca' }}
                                    title="Edit"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                )
                              )}
                              {!readOnly && (
                                <button
                                  onClick={() => removeRow(row.id, row.labor_name)}
                                  className="rounded-xl px-3 py-2"
                                  style={{ border: '1px solid #fca5a5', background: '#fef2f2', color: '#dc2626' }}
                                  title="Remove labour"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: 'var(--thead-bg)' }}>
                      <td colSpan={5} className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
                        Totals
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmt(filteredActiveRows.reduce((sum, row) => sum + (Number(row.total_worked_hours) || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--green-text)' }}>
                        {fmt(filteredActiveRows.reduce((sum, row) => sum + (Number(row.overtime_hours) || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {fmtOMR(filteredActiveRows.reduce((sum, row) => sum + (Number(row.total_salary) || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: '#dc2626' }}>
                        {fmtOMR(filteredActiveRows.reduce((sum, row) => sum + (Number(row.deduction) || 0), 0))}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold" style={{ color: 'var(--orange)' }}>
                        {fmtOMR(filteredActiveRows.reduce((sum, row) => sum + ((Number(row.total_salary) || 0) - (Number(row.deduction) || 0)), 0))}
                      </td>
                      <td colSpan={3} className="px-3 py-3" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {confirmDialog}

      {showAddLaborModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddLaborModal(false); }}
          style={{
            inset: 0,
            zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '40px 16px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 16,
              width: '100%',
              maxWidth: 760,
              boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              position: 'relative',
              padding: '28px 32px 32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add New Labour</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Labour not found in search. Add and continue.</p>
              </div>
              <button
                onClick={() => setShowAddLaborModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <LaborerForm
              initial={addLaborerInitialId ? { id_number: addLaborerInitialId } : undefined}
              submitLabel="Create Labour"
              onSubmit={async (data) => {
                const err = await createLaborer(data);
                if (err) throw err;

                toast.success('Labour added successfully');
                setShowAddLaborModal(false);
                setLaborSearchStatus('idle');
                setAddLaborerInitialId('');
                await refetchLaborers();

                if (data.id_number) {
                  setSearch(data.id_number);
                } else {
                  setSearch(data.full_name);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

