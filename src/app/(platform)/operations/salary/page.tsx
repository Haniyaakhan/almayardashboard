'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, FileSpreadsheet, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';
import { exportManualSalarySheetToExcel } from '@/lib/excelExport';
import { OMAN_BANK_LIST, resolveSwift } from '@/lib/omanBanks';
import type { SalarySheet, SalarySheetEntry } from '@/types/database';

// ─── OMAN_BANK_SWIFT and resolveSwiftCode moved to @/lib/omanBanks ─────────

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function OperationsSalaryPage() {
  const now = currentMonthYear();
  const toast = useToast();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [sheet, setSheet] = useState<SalarySheet | null>(null);
  const [entries, setEntries] = useState<SalarySheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const initDoneRef = useRef(false);

  const refetch = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: anySheet, error: sheetError } = await supabase
      .from('salary_sheets')
      .select('*')
      .eq('month', m)
      .eq('year', y)
      .in('status', ['approved', 'draft'])
      .order('status', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (sheetError) {
      setError(sheetError.message);
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!anySheet) {
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: rowsError } = await supabase
      .from('salary_sheet_entries')
      .select('*')
      .eq('sheet_id', anySheet.id)
      .order('designation', { ascending: true })
      .order('labor_name', { ascending: true });

    if (rowsError) {
      setError(rowsError.message);
      setSheet(anySheet as SalarySheet);
      setEntries([]);
      setLoading(false);
      return;
    }

    setSheet(anySheet as SalarySheet);
    setEntries((rows ?? []) as SalarySheetEntry[]);
    setLoading(false);
  }, []);

  // On mount: find the most recent sheet, set selectors to it, then load it directly
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('salary_sheets')
      .select('month, year, salary_sheet_entries!inner(id)')
      .in('status', ['approved', 'draft'])
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const m = data?.month ?? now.month;
        const y = data?.year ?? now.year;
        setMonth(m);
        setYear(y);
        refetch(m, y);
        // Set after state updates so the [month,year] effect can tell init is done
        setTimeout(() => { initDoneRef.current = true; }, 0);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-load when user changes the month/year selector
  useEffect(() => {
    if (!initDoneRef.current) return;
    refetch(month, year);
  }, [month, year, refetch]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, row) => {
        const gross = Number(row.total_salary || 0);
        const deduction = Number(row.deduction || 0);
        acc.gross += gross;
        acc.deduction += deduction;
        acc.net += gross - deduction;
        return acc;
      },
      { gross: 0, deduction: 0, net: 0 }
    );
  }, [entries]);

  const employeeCount = entries.length;

  function hasValue(v: string | null | undefined) {
    const s = (v ?? '').trim().toUpperCase();
    return s.length > 0 && s !== '-' && s !== 'NO ACCOUNT NUMBER';
  }

  const withBank = useMemo(
    () => entries.filter((e) => hasValue(e.bank_name) || hasValue(e.bank_account_number)),
    [entries]
  );
  const withoutBank = useMemo(
    () => entries.filter((e) => !hasValue(e.bank_name) && !hasValue(e.bank_account_number)),
    [entries]
  );

  function sectionTotals(rows: SalarySheetEntry[]) {
    return rows.reduce(
      (acc, row) => {
        const gross = Number(row.total_salary || 0);
        const deduction = Number(row.deduction || 0);
        acc.gross += gross; acc.deduction += deduction; acc.net += gross - deduction;
        return acc;
      },
      { gross: 0, deduction: 0, net: 0 }
    );
  }

  async function onExportExcel() {
    if (!entries.length) {
      toast.warning('No approved salaries to export');
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
      const key = normalizeDesignationKey(entry.designation);
      if (!acc[key]) acc[key] = { label: toDisplayDesignation(entry.designation), rows: [] };
      acc[key].rows.push(entry);
      return acc;
    }, {} as Record<string, { label: string; rows: SalarySheetEntry[] }>);

    const orderedKeys = Object.keys(groupedByDesignation).sort((a, b) => {
      const diff = groupedByDesignation[a].rows.length - groupedByDesignation[b].rows.length;
      return diff !== 0 ? diff : groupedByDesignation[a].label.localeCompare(groupedByDesignation[b].label);
    });

    const sectionHtml = orderedKeys.map((key) => {
      const { label, rows } = groupedByDesignation[key];
      const rowsHtml = rows.map((entry) => {
        const gross = Number(entry.total_salary || 0);
        const deduction = Number(entry.deduction || 0);
        return `<tr>
          <td>${entry.labor_name || '-'}</td>
          <td>${entry.labor_code || '-'}</td>
          <td>${Number(entry.monthly_salary || 0).toFixed(3)}</td>
          <td>${Number(entry.hourly_rate || 0).toFixed(3)}</td>
          <td>${Number(entry.actual_worked_hours || 0).toFixed(2)}</td>
          <td>${gross.toFixed(3)}</td>
          <td>${deduction.toFixed(3)}</td>
          <td>${(gross - deduction).toFixed(3)}</td>
          <td>${entry.bank_name || '-'}</td>
          <td>${entry.bank_account_number || '-'}</td>
        </tr>`;
      }).join('');
      const sectionNet = rows.reduce((sum, r) => sum + ((Number(r.total_salary) || 0) - (Number(r.deduction) || 0)), 0);
      return `
        <h2>${label}</h2>
        <table>
          <thead><tr>
            <th>Name</th><th>ID</th><th>M/Salary (OMR)</th><th>H/Rate</th><th>AW-Hours</th>
            <th>Total Salary (OMR)</th><th>Deduction (OMR)</th><th>Net Salary (OMR)</th>
            <th>Bank Name</th><th>Account Number</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="section-total">${label} Total (Net): ${sectionNet.toFixed(3)} OMR</div>
      `;
    }).join('');

    const grandNet = entries.reduce(
      (sum, r) => sum + ((Number(r.total_salary) || 0) - (Number(r.deduction) || 0)),
      0,
    );

    const printWindow = window.open('', '_blank', 'width=1200,height=860');
    if (!printWindow) { toast.error('Popup blocked. Allow popups and try again.'); return; }

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
          <p>${MONTH_NAMES[month]} ${year} — ${sheet?.status === 'approved' ? 'Approved' : 'Draft'}</p>
          ${sectionHtml}
          <div class="total">Total Workers: ${entries.length} | Grand Total Net Salary (OMR): ${grandNet.toFixed(3)}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const [syncing, setSyncing] = useState(false);

  async function syncBankFromRegistry() {
    if (!sheet || sheet.status === 'approved') return;
    setSyncing(true);
    const supabase = createClient();
    // Fetch all laborers' current bank details
    const { data: laborers, error: labErr } = await supabase
      .from('laborers')
      .select('id_number, bank_name, bank_account_number');
    if (labErr) { toast.error(`Failed to fetch laborers: ${labErr.message}`); setSyncing(false); return; }

    let syncCount = 0;
    for (const lab of (laborers ?? [])) {
      const patch: Record<string, string> = {};
      if (lab.bank_name) patch.bank_name = lab.bank_name;
      if (lab.bank_account_number) patch.bank_account_number = lab.bank_account_number;
      if (!Object.keys(patch).length) continue;
      const { error } = await supabase
        .from('salary_sheet_entries')
        .update(patch)
        .eq('labor_code', lab.id_number)
        .eq('sheet_id', sheet.id);
      if (!error) syncCount++;
    }
    toast.success(`Synced bank details for ${syncCount} entries`);
    setSyncing(false);
    refetch(month, year);
  }

  async function exportBankUpload() {
    const bankEntries = entries.filter((e) => {
      const acc = (e.bank_account_number ?? '').trim().toUpperCase();
      return acc.length > 0 && acc !== '-' && acc !== 'NO ACCOUNT NUMBER';
    });
    if (!bankEntries.length) {
      toast.warning('No entries with bank account numbers to export');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Bank Upload');

      ws.columns = [
        { header: 'Beneficiary Account No', key: 'account_no', width: 32 },
        { header: 'AMOUNT', key: 'amount', width: 17 },
        { header: 'Ben Bank SWIFT Code', key: 'swift', width: 22 },
        { header: 'Ben Name', key: 'ben_name', width: 37 },
        { header: 'Ben Add1', key: 'ben_add1', width: 37 },
      ];

      // Style header row
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.alignment = { horizontal: 'center' };
      });

      bankEntries.forEach((e) => {
        const net = (Number(e.total_salary) || 0) - (Number(e.deduction) || 0);
        ws.addRow({
          account_no: (e.bank_account_number ?? '').trim(),
          amount: Number(net.toFixed(3)),
          swift: resolveSwift(e.bank_name),
          ben_name: (e.labor_name ?? '').trim(),
          ben_add1: '',
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bank_Upload_${MONTH_NAMES[month]}_${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Bank upload file generated (${bankEntries.length} entries)`);
    } catch {
      toast.error('Failed to generate bank upload file');
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      <Card className="mb-4" padding="p-4">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={inputStyle}>
              {MONTH_NAMES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
            <input value={year} onChange={(e) => setYear(Number(e.target.value) || now.year)} style={inputStyle} />
            <Badge color={sheet ? (sheet.status === 'approved' ? 'green' : 'amber') : 'gray'}>
              {sheet ? (sheet.status === 'approved' ? 'Approved' : 'Draft / Pending Approval') : 'No Sheet Found'}
            </Badge>
          </div>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            {sheet?.status === 'draft' && (
              <Button variant="secondary" size="sm" onClick={syncBankFromRegistry} disabled={syncing || !entries.length}>
                {syncing ? 'Syncing…' : 'Sync Bank from Registry'}
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={onExportExcel} disabled={!entries.length}>Export Excel</Button>
            <Button variant="secondary" size="sm" onClick={onPrintPDF} disabled={!entries.length}>Print / PDF</Button>
            <Button variant="secondary" size="sm" onClick={exportBankUpload} disabled={!entries.length}>Bank Upload File</Button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card>
          <div style={{ padding: 14, fontSize: 13, color: '#dc2626' }}>{error}</div>
        </Card>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
        <Card padding="p-3">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Employees</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{employeeCount}</div>
        </Card>
        <Card padding="p-3">
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Net Salaries</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{totals.net.toFixed(3)} OMR</div>
        </Card>
        <Card padding="p-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>With Bank Account</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{withBank.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sectionTotals(withBank).net.toFixed(3)} OMR net</div>
        </Card>
        <Card padding="p-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Without Bank Account</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{withoutBank.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sectionTotals(withoutBank).net.toFixed(3)} OMR net</div>
        </Card>
      </div>

      {!entries.length ? (
        <Card>
          <EmptyState
            icon={<Calculator size={24} />}
            title="No salary sheet found"
            description="No salary sheet (approved or draft) was found for this month. Generate one in Salary Generation first."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <SectionCard
            rows={withBank}
            title="With Bank Account"
            icon={<CheckCircle className="w-4 h-4 text-green-600" />}
            accentColor="#16a34a"
            month={month}
            year={year}
            toast={toast}
            sectionTotals={sectionTotals}
          />
          <SectionCard
            rows={withoutBank}
            title="Without Bank Account"
            icon={<AlertCircle className="w-4 h-4 text-red-500" />}
            accentColor="#ef4444"
            month={month}
            year={year}
            toast={toast}
            sectionTotals={sectionTotals}
            showLetters
          />
        </div>
      )}
    </div>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({
  rows,
  title,
  icon,
  accentColor,
  month,
  year,
  toast,
  sectionTotals,
  showLetters,
}: {
  rows: SalarySheetEntry[];
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  month: number;
  year: number;
  toast: ReturnType<typeof useToast>;
  sectionTotals: (rows: SalarySheetEntry[]) => { gross: number; deduction: number; net: number };
  showLetters?: boolean;
}) {
  const t = sectionTotals(rows);

  async function downloadExcel() {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet(title);
      ws.columns = [
        { header: 'Labor Name', key: 'labor_name', width: 24 },
        { header: 'Labor ID', key: 'labor_code', width: 14 },
        { header: 'Designation', key: 'designation', width: 18 },
        { header: 'Bank Name', key: 'bank_name', width: 18 },
        { header: 'Account No', key: 'bank_account_number', width: 20 },
        { header: 'Worked Hrs', key: 'worked', width: 12 },
        { header: 'OT Hrs', key: 'ot', width: 10 },
        { header: 'Hourly Rate', key: 'rate', width: 12 },
        { header: 'Gross (OMR)', key: 'gross', width: 14 },
        { header: 'Deduction (OMR)', key: 'deduction', width: 16 },
        { header: 'Net Salary (OMR)', key: 'net', width: 16 },
      ];
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
        cell.alignment = { horizontal: 'center' };
      });
      rows.forEach((row) => {
        const gross = Number(row.total_salary || 0);
        const deduction = Number(row.deduction || 0);
        ws.addRow({
          labor_name: row.labor_name, labor_code: row.labor_code, designation: row.designation,
          bank_name: row.bank_name || '-', bank_account_number: row.bank_account_number || '-',
          worked: Number(row.total_worked_hours || 0), ot: Number(row.overtime_hours || 0),
          rate: Number(row.hourly_rate || 0), gross, deduction, net: gross - deduction,
        });
      });
      const totalRow = ws.addRow({
        labor_name: 'TOTAL', labor_code: '', designation: '', bank_name: '', bank_account_number: '',
        worked: '', ot: '', rate: '', gross: t.gross, deduction: t.deduction, net: t.net,
      });
      totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title} — ${MONTH_NAMES[month]} ${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${title} exported`);
    } catch {
      toast.error('Failed to export Excel');
    }
  }

  function printSection() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) { toast.error('Popup blocked. Allow popups and try again.'); return; }

    // Group by designation then sort lowest count → highest count (tie-break: alpha)
    const designationGroups: Record<string, SalarySheetEntry[]> = {};
    rows.forEach((row) => {
      const desig = (row.designation || 'Unspecified').trim();
      if (!designationGroups[desig]) designationGroups[desig] = [];
      designationGroups[desig].push(row);
    });

    const sortedGroups = Object.entries(designationGroups).sort(([aName, aRows], [bName, bRows]) => {
      const diff = aRows.length - bRows.length; // lowest count first
      return diff !== 0 ? diff : aName.localeCompare(bName);
    });

    let bodyHtml = '';
    sortedGroups.forEach(([designation, groupRows]) => {
      const gt = sectionTotals(groupRows);
      const groupRowsHtml = groupRows.map((row) => {
        const gross = Number(row.total_salary || 0);
        const deduction = Number(row.deduction || 0);
        const net = gross - deduction;
        return `<tr>
          <td>${row.labor_name || '-'}</td><td>${row.labor_code || '-'}</td>
          <td>${row.bank_name || '-'}</td><td>${row.bank_account_number || '-'}</td>
          <td>${Number(row.total_worked_hours || 0).toFixed(2)}</td>
          <td>${Number(row.overtime_hours || 0).toFixed(2)}</td>
          <td>${Number(row.hourly_rate || 0).toFixed(3)}</td>
          <td>${gross.toFixed(3)}</td><td>${deduction.toFixed(3)}</td><td>${net.toFixed(3)}</td>
        </tr>`;
      }).join('');
      bodyHtml += `
        <tr class="desig-header"><td colspan="10">${designation} &nbsp;(${groupRows.length} employees)</td></tr>
        ${groupRowsHtml}
        <tr class="subtotal">
          <td colspan="7"><strong>Subtotal — ${designation}</strong></td>
          <td><strong>${gt.gross.toFixed(3)}</strong></td>
          <td><strong>${gt.deduction.toFixed(3)}</strong></td>
          <td><strong>${gt.net.toFixed(3)}</strong></td>
        </tr>
      `;
    });
    bodyHtml += `
      <tr class="total">
        <td colspan="7"><strong>Grand Total (${rows.length} employees)</strong></td>
        <td><strong>${t.gross.toFixed(3)}</strong></td>
        <td><strong>${t.deduction.toFixed(3)}</strong></td>
        <td><strong>${t.net.toFixed(3)}</strong></td>
      </tr>`;

    printWindow.document.write(`
      <html><head>
        <title>${title} — ${MONTH_NAMES[month]} ${year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111827; }
          h1 { font-size: 16px; margin: 0 0 4px; }
          p { font-size: 12px; color: #4b5563; margin: 0 0 14px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; }
          th { background: #1e3a5f; color: #fff; text-transform: uppercase; font-size: 9px; }
          .desig-header td { background: #dbeafe; font-weight: 700; font-size: 10px; color: #1e3a5f; padding: 6px 7px; }
          .subtotal td { background: #f0f4f8; font-weight: 600; }
          .total td { background: #e0e7ef; font-weight: 700; }
        </style>
      </head><body>
        <h1>${title}</h1>
        <p>${MONTH_NAMES[month]} ${year} &nbsp;|&nbsp; ${rows.length} employees &nbsp;|&nbsp; Net: ${t.net.toFixed(3)} OMR</p>
        <table>
          <thead><tr>
            <th>Labor</th><th>ID</th><th>Bank</th><th>Account No</th>
            <th>Worked Hrs</th><th>OT Hrs</th><th>Hourly Rate</th>
            <th>Gross (OMR)</th><th>Deduction</th><th>Net (OMR)</th>
          </tr></thead>
          <tbody>${bodyHtml}</tbody>
        </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  }

  function printLetters() {
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) { toast.error('Popup blocked. Allow popups and try again.'); return; }

    const lettersHtml = rows.map((row) => {
      const gross = Number(row.total_salary || 0);
      const deduction = Number(row.deduction || 0);
      const net = gross - deduction;
      return `
        <div class="letter">
          <div class="company-header">AL MAYAR</div>
          <h2 class="letter-title">Salary Receipt Acknowledgment</h2>
          <p class="letter-date">Date: ${new Date().toLocaleDateString('en-GB')}</p>
          <table class="info-table">
            <tr><td class="label">Employee Name</td><td>${row.labor_name || '-'}</td></tr>
            <tr><td class="label">Employee ID</td><td>${row.labor_code || '-'}</td></tr>
            <tr><td class="label">Designation</td><td>${row.designation || '-'}</td></tr>
            <tr><td class="label">Salary Month</td><td>${MONTH_NAMES[month]} ${year}</td></tr>
            <tr><td class="label">Gross Salary</td><td>${gross.toFixed(3)} OMR</td></tr>
            <tr><td class="label">Deduction</td><td>${deduction.toFixed(3)} OMR</td></tr>
            <tr><td class="label net-row">Net Salary Received</td><td class="net-row">${net.toFixed(3)} OMR</td></tr>
          </table>
          <p class="body-text">
            I, the undersigned, hereby acknowledge and confirm that I have received my full salary
            for the month of <strong>${MONTH_NAMES[month]} ${year}</strong> in cash,
            amounting to <strong>${net.toFixed(3)} OMR</strong>.
          </p>
          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Employee Signature</div>
              <div class="sig-name">${row.labor_name || ''}</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Authorized Signatory</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html><head>
        <title>Salary Receipt Letters — ${MONTH_NAMES[month]} ${year}</title>
        <style>
          @page { margin: 15mm; }
          body { font-family: Arial, sans-serif; color: #111827; }
          .letter { border: 1px solid #d1d5db; padding: 28px 34px; max-width: 680px; margin: 0 auto; page-break-after: always; }
          .letter:last-child { page-break-after: avoid; }
          .company-header { font-size: 22px; font-weight: 800; color: #1e3a5f; text-align: center; letter-spacing: 2px; margin-bottom: 2px; }
          .letter-title { text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 2px 0 6px; color: #374151; }
          .letter-date { text-align: right; font-size: 11px; color: #6b7280; margin-bottom: 12px; }
          .info-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
          .info-table td { padding: 5px 8px; border: 1px solid #e5e7eb; }
          .info-table .label { background: #f8fafc; font-weight: 600; width: 40%; color: #374151; }
          .info-table .net-row { background: #eff6ff; font-weight: 700; font-size: 12px; }
          .body-text { font-size: 11px; line-height: 1.75; color: #374151; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 14px; margin-bottom: 26px; }
          .signatures { display: flex; justify-content: space-between; margin-top: 24px; }
          .sig-block { width: 42%; text-align: center; }
          .sig-line { border-bottom: 1px solid #374151; height: 34px; margin-bottom: 6px; }
          .sig-label { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #4b5563; }
          .sig-name { font-size: 10px; color: #9ca3af; margin-top: 2px; }
        </style>
      </head><body>${lettersHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <Card padding="p-4">
      {/* Section header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon}
          <span style={{ fontWeight: 600, fontSize: 13, color: accentColor }}>{title} ({rows.length})</span>
        </div>
        {rows.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button variant="ghost" size="sm" onClick={downloadExcel}>
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={printSection}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Print PDF
            </Button>
            {showLetters && (
              <Button variant="ghost" size="sm" onClick={printLetters}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Receipt Letters
              </Button>
            )}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 0' }}>No entries.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Labor', 'ID', 'Designation', 'Bank', 'Account No', 'Worked Hrs', 'OT Hrs', 'Hourly Rate', 'Gross', 'Deduction', 'Net Salary'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const gross = Number(row.total_salary || 0);
                const deduction = Number(row.deduction || 0);
                const net = gross - deduction;
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={tdStyle}>{row.labor_name || '-'}</td>
                    <td style={tdStyle}>{row.labor_code || '-'}</td>
                    <td style={tdStyle}>{row.designation || '-'}</td>
                    <td style={tdStyle}>{row.bank_name || '-'}</td>
                    <td style={tdStyle}>{row.bank_account_number || '-'}</td>
                    <td style={tdStyle}>{Number(row.total_worked_hours || 0).toFixed(2)}</td>
                    <td style={tdStyle}>{Number(row.overtime_hours || 0).toFixed(2)}</td>
                    <td style={tdStyle}>{Number(row.hourly_rate || 0).toFixed(3)}</td>
                    <td style={tdStyle}>{gross.toFixed(3)} OMR</td>
                    <td style={tdStyle}>{deduction.toFixed(3)} OMR</td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{net.toFixed(3)} OMR</td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--thead-bg)' }}>
                <td style={{ ...tdStyle, fontWeight: 700 }} colSpan={8}>Total ({rows.length} employees)</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{t.gross.toFixed(3)} OMR</td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{t.deduction.toFixed(3)} OMR</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: 'var(--orange)' }}>{t.net.toFixed(3)} OMR</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  borderRadius: 9,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: 12,
  color: 'var(--text-light)',
};
