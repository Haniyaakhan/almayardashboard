'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';
import type { SalarySheet, SalarySheetEntry } from '@/types/database';

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

function fmt(n: number) {
  return n.toFixed(3) + ' OMR';
}

export default function SalaryBankReportPage() {
  const now = currentMonthYear();
  const toast = useToast();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [sheet, setSheet] = useState<SalarySheet | null>(null);
  const [entries, setEntries] = useState<SalarySheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: foundSheet, error: sheetError } = await supabase
      .from('salary_sheets')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sheetError) {
      setError(sheetError.message);
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!foundSheet) {
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: rowsError } = await supabase
      .from('salary_sheet_entries')
      .select('*')
      .eq('sheet_id', foundSheet.id)
      .order('labor_name', { ascending: true });

    if (rowsError) {
      setError(rowsError.message);
      setSheet(foundSheet as SalarySheet);
      setEntries([]);
      setLoading(false);
      return;
    }

    setSheet(foundSheet as SalarySheet);
    setEntries((rows ?? []) as SalarySheetEntry[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { withBank, withoutBank } = useMemo(() => {
    function hasValue(v: string | null | undefined) {
      const s = (v ?? '').trim().toUpperCase();
      return s.length > 0 && s !== '-' && s !== 'NO ACCOUNT NUMBER';
    }
    const withBank = entries.filter(
      (e) => hasValue(e.bank_name) || hasValue(e.bank_account_number)
    );
    const withoutBank = entries.filter(
      (e) => !hasValue(e.bank_name) && !hasValue(e.bank_account_number)
    );
    return { withBank, withoutBank };
  }, [entries]);

  function sectionTotals(rows: SalarySheetEntry[]) {
    return rows.reduce(
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
  }

  async function onExportExcel() {
    if (!entries.length) {
      toast.warning('No approved salaries to export');
      return;
    }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const title = `Salary Bank Report — ${MONTH_NAMES[month]} ${year}`;

      function addSheet(wb: InstanceType<typeof ExcelJS.Workbook>, sheetName: string, rows: SalarySheetEntry[]) {
        const ws = wb.addWorksheet(sheetName);
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

        // Header style
        ws.getRow(1).eachCell((cell) => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
          cell.alignment = { horizontal: 'center' };
        });

        rows.forEach((row) => {
          const gross = Number(row.total_salary || 0);
          const deduction = Number(row.deduction || 0);
          ws.addRow({
            labor_name: row.labor_name,
            labor_code: row.labor_code,
            designation: row.designation,
            bank_name: row.bank_name || '-',
            bank_account_number: row.bank_account_number || '-',
            worked: Number(row.total_worked_hours || 0),
            ot: Number(row.overtime_hours || 0),
            rate: Number(row.hourly_rate || 0),
            gross,
            deduction,
            net: gross - deduction,
          });
        });

        // Totals row
        const t = sectionTotals(rows);
        const totalRow = ws.addRow({
          labor_name: 'TOTAL',
          labor_code: '',
          designation: '',
          bank_name: '',
          bank_account_number: '',
          worked: '',
          ot: '',
          rate: '',
          gross: t.gross,
          deduction: t.deduction,
          net: t.net,
        });
        totalRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } };
        });
      }

      addSheet(workbook, 'With Bank Account', withBank);
      addSheet(workbook, 'Without Bank Account', withoutBank);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel exported');
    } catch {
      toast.error('Failed to export Excel');
    }
  }

  function onPrintPDF() {
    if (!entries.length) {
      toast.warning('No approved salaries to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=860');
    if (!printWindow) {
      toast.error('Popup blocked. Allow popups and try again.');
      return;
    }

    function buildTableRows(rows: SalarySheetEntry[]) {
      return rows
        .map((row) => {
          const gross = Number(row.total_salary || 0);
          const deduction = Number(row.deduction || 0);
          const net = gross - deduction;
          return `
          <tr>
            <td>${row.labor_name || '-'}</td>
            <td>${row.labor_code || '-'}</td>
            <td>${row.designation || '-'}</td>
            <td>${row.bank_name || '-'}</td>
            <td>${row.bank_account_number || '-'}</td>
            <td>${Number(row.total_worked_hours || 0).toFixed(2)}</td>
            <td>${Number(row.overtime_hours || 0).toFixed(2)}</td>
            <td>${Number(row.hourly_rate || 0).toFixed(3)}</td>
            <td>${gross.toFixed(3)}</td>
            <td>${deduction.toFixed(3)}</td>
            <td>${net.toFixed(3)}</td>
          </tr>`;
        })
        .join('');
    }

    function buildTotalRow(rows: SalarySheetEntry[]) {
      const t = sectionTotals(rows);
      return `
        <tr class="total-row">
          <td colspan="8"><strong>Total (${rows.length} employees)</strong></td>
          <td><strong>${t.gross.toFixed(3)}</strong></td>
          <td><strong>${t.deduction.toFixed(3)}</strong></td>
          <td><strong>${t.net.toFixed(3)}</strong></td>
        </tr>`;
    }

    const tableHeader = `
      <thead>
        <tr>
          <th>Labor</th><th>ID</th><th>Designation</th><th>Bank</th>
          <th>Account No</th><th>Worked Hrs</th><th>OT Hrs</th>
          <th>Hourly Rate</th><th>Gross (OMR)</th><th>Deduction</th><th>Net (OMR)</th>
        </tr>
      </thead>`;

    const allTotals = sectionTotals(entries);

    printWindow.document.write(`
      <html>
        <head>
          <title>Salary Bank Report - ${MONTH_NAMES[month]} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 18px; }
            h2 { font-size: 14px; margin: 24px 0 6px; }
            .subtitle { margin: 0 0 18px; color: #4b5563; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 8px; }
            th, td { border: 1px solid #e5e7eb; padding: 5px 7px; text-align: left; }
            th { background: #1e3a5f; color: #fff; text-transform: uppercase; font-size: 9px; letter-spacing: 0.04em; }
            .total-row td { background: #f0f4f8; font-weight: 700; }
            .section-with th { background: #166534; }
            .section-without th { background: #9f1239; }
            .summary { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 18px; margin-top: 18px; }
            .summary-row { display: flex; gap: 32px; flex-wrap: wrap; }
            .summary-item label { font-size: 10px; color: #6b7280; display: block; }
            .summary-item strong { font-size: 14px; color: #111827; }
          </style>
        </head>
        <body>
          <h1>Salary Bank Report</h1>
          <p class="subtitle">${MONTH_NAMES[month]} ${year} &nbsp;|&nbsp; Status: <strong>${(sheet as SalarySheet).status.toUpperCase()}</strong> &nbsp;|&nbsp; Total Employees: ${entries.length} &nbsp;|&nbsp; Total Net: ${allTotals.net.toFixed(3)} OMR</p>

          <h2 style="color:#166534;">&#10003; With Bank Account (${withBank.length})</h2>
          <table class="section-with">
            ${tableHeader}
            <tbody>${buildTableRows(withBank)}${buildTotalRow(withBank)}</tbody>
          </table>

          <h2 style="color:#9f1239;">&#9888; Without Bank Account (${withoutBank.length})</h2>
          <table class="section-without">
            ${tableHeader}
            <tbody>${buildTableRows(withoutBank)}${buildTotalRow(withoutBank)}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 400);
  }

  function SectionTable({
    rows,
    title,
    accentClass,
  }: {
    rows: SalarySheetEntry[];
    title: string;
    accentClass: string;
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
            labor_name: row.labor_name,
            labor_code: row.labor_code,
            designation: row.designation,
            bank_name: row.bank_name || '-',
            bank_account_number: row.bank_account_number || '-',
            worked: Number(row.total_worked_hours || 0),
            ot: Number(row.overtime_hours || 0),
            rate: Number(row.hourly_rate || 0),
            gross,
            deduction,
            net: gross - deduction,
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
      const rowsHtml = rows.map((row) => {
        const gross = Number(row.total_salary || 0);
        const deduction = Number(row.deduction || 0);
        const net = gross - deduction;
        return `<tr>
          <td>${row.labor_name || '-'}</td><td>${row.labor_code || '-'}</td>
          <td>${row.designation || '-'}</td><td>${row.bank_name || '-'}</td>
          <td>${row.bank_account_number || '-'}</td>
          <td>${Number(row.total_worked_hours || 0).toFixed(2)}</td>
          <td>${Number(row.overtime_hours || 0).toFixed(2)}</td>
          <td>${Number(row.hourly_rate || 0).toFixed(3)}</td>
          <td>${gross.toFixed(3)}</td><td>${deduction.toFixed(3)}</td><td>${net.toFixed(3)}</td>
        </tr>`;
      }).join('');
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
            .total td { background: #f0f4f8; font-weight: 700; }
          </style>
        </head><body>
          <h1>${title}</h1>
          <p>${MONTH_NAMES[month]} ${year} &nbsp;|&nbsp; ${rows.length} employees &nbsp;|&nbsp; Net: ${t.net.toFixed(3)} OMR</p>
          <table>
            <thead><tr>
              <th>Labor</th><th>ID</th><th>Designation</th><th>Bank</th>
              <th>Account No</th><th>Worked Hrs</th><th>OT Hrs</th>
              <th>Hourly Rate</th><th>Gross (OMR)</th><th>Deduction</th><th>Net (OMR)</th>
            </tr></thead>
            <tbody>
              ${rowsHtml}
              <tr class="total">
                <td colspan="8"><strong>Total (${rows.length})</strong></td>
                <td><strong>${t.gross.toFixed(3)}</strong></td>
                <td><strong>${t.deduction.toFixed(3)}</strong></td>
                <td><strong>${t.net.toFixed(3)}</strong></td>
              </tr>
            </tbody>
          </table>
        </body></html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 400);
    }

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${accentClass}`}>{title} ({rows.length})</h3>
          {rows.length > 0 && (
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={downloadExcel}>
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={printSection}>
                <Printer className="w-3.5 h-3.5 mr-1" /> Print
              </Button>
            </div>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No entries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' }}>
                  {['Labor', 'ID', 'Designation', 'Bank', 'Account No', 'Worked Hrs', 'OT Hrs', 'Hourly Rate', 'Gross', 'Deduction', 'Net Salary'].map((h) => (
                    <th key={h} style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left' }}>{h}</th>
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
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.labor_name}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.labor_code || '-'}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.designation || '-'}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.bank_name || '-'}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.bank_account_number || '-'}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{Number(row.total_worked_hours || 0).toFixed(2)}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{Number(row.overtime_hours || 0).toFixed(2)}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{Number(row.hourly_rate || 0).toFixed(3)}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{fmt(gross)}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{fmt(deduction)}</td>
                      <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px', fontWeight: 600 }}>{fmt(net)}</td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                  <td colSpan={8} style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>
                    Total ({rows.length} employees)
                  </td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{fmt(t.gross)}</td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{fmt(t.deduction)}</td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{fmt(t.net)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const allTotals = sectionTotals(entries);

  return (
    <div className="p-6 space-y-6">

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i}>{name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 px-3 rounded-lg border text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={onExportExcel} disabled={!entries.length}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Export Excel
            </Button>
            <Button variant="ghost" size="sm" onClick={onPrintPDF} disabled={!entries.length}>
              <Printer className="w-4 h-4 mr-1" /> Print / PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading/Error/Empty */}
      {loading && (
        <Card>
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            Loading...
          </p>
        </Card>
      )}

      {!loading && error && (
        <Card className="border-red-200">
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {!loading && !error && !sheet && (
        <EmptyState
          title="No Salary Sheet Found"
          description={`No salary sheet found for ${MONTH_NAMES[month]} ${year}.`}
        />
      )}

      {!loading && !error && sheet && (
        <>
          {/* Sheet status banner */}
          <div className="flex items-center gap-3">
            <Badge color={sheet.status === 'approved' ? 'green' : 'amber'}>
              {sheet.status === 'approved' ? 'Approved' : 'Draft'}
            </Badge>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Salary sheet for {MONTH_NAMES[month]} {year}
              {sheet.status === 'draft' && ' — not yet approved'}
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Employees</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{entries.length}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>With Bank Account</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{withBank.length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{fmt(sectionTotals(withBank).net)} net</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Without Bank Account</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{withoutBank.length}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{fmt(sectionTotals(withoutBank).net)} net</p>
            </Card>
            <Card>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Net Salary</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmt(allTotals.net)}</p>
            </Card>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* With bank account table */}
            <Card>
              <SectionTable
                rows={withBank}
                title="With Bank Account"
                accentClass="text-green-600"
              />
            </Card>

            {/* Without bank account table */}
            <Card>
              <SectionTable
                rows={withoutBank}
                title="Without Bank Account"
                accentClass="text-red-500"
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

