'use client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calculator, FileSpreadsheet, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { exportManualSalarySheetToExcel } from '@/lib/excelExport';
import type { SalarySheet, SalarySheetEntry } from '@/types/database';

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

  const refetch = useCallback(async () => {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data: approvedSheet, error: sheetError } = await supabase
      .from('salary_sheets')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .eq('status', 'approved')
      .maybeSingle();

    if (sheetError) {
      setError(sheetError.message);
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    if (!approvedSheet) {
      setSheet(null);
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data: rows, error: rowsError } = await supabase
      .from('salary_sheet_entries')
      .select('*')
      .eq('sheet_id', approvedSheet.id)
      .order('labor_name', { ascending: true });

    if (rowsError) {
      setError(rowsError.message);
      setSheet(approvedSheet as SalarySheet);
      setEntries([]);
      setLoading(false);
      return;
    }

    setSheet(approvedSheet as SalarySheet);
    setEntries((rows ?? []) as SalarySheetEntry[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
      toast.warning('No approved salaries to print');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1200,height=860');
    if (!printWindow) {
      toast.error('Popup blocked. Allow popups and try again.');
      return;
    }

    const rowsHtml = entries
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
            <td>${gross.toFixed(3)} OMR</td>
            <td>${deduction.toFixed(3)} OMR</td>
            <td>${net.toFixed(3)} OMR</td>
          </tr>
        `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Approved Salaries - ${MONTH_NAMES[month]} ${year}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 22px; color: #111827; }
            h1 { margin: 0 0 6px; font-size: 20px; }
            p { margin: 0 0 14px; color: #4b5563; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            th { background: #f8fafc; text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
            .total { margin-top: 14px; font-weight: 700; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Approved Salaries</h1>
          <p>${MONTH_NAMES[month]} ${year}</p>
          <table>
            <thead>
              <tr>
                <th>Labor</th>
                <th>ID</th>
                <th>Designation</th>
                <th>Bank</th>
                <th>Account No</th>
                <th>Worked Hrs</th>
                <th>OT Hrs</th>
                <th>Hourly Rate</th>
                <th>Gross Salary</th>
                <th>Deduction</th>
                <th>Net Salary</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="total">Totals: Gross ${totals.gross.toFixed(3)} OMR, Deduction ${totals.deduction.toFixed(3)} OMR, Net ${totals.net.toFixed(3)} OMR</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
            <Badge color={sheet ? 'green' : 'gray'}>
              {sheet ? 'Approved Sheet Found' : 'No Approved Sheet'}
            </Badge>
          </div>
          <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={onExportExcel} disabled={!entries.length}>Export Excel</Button>
            <Button variant="secondary" size="sm" onClick={onPrintPDF} disabled={!entries.length}>Print / PDF</Button>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Read-only view from Salary Generation approvals</div>
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
            title="No approved salaries"
            description="No approved salary sheet found for this month. Approve the month in Salary Generation first."
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
}: {
  rows: SalarySheetEntry[];
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  month: number;
  year: number;
  toast: ReturnType<typeof useToast>;
  sectionTotals: (rows: SalarySheetEntry[]) => { gross: number; deduction: number; net: number };
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
              <Printer className="w-3.5 h-3.5 mr-1" /> Print
            </Button>
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
