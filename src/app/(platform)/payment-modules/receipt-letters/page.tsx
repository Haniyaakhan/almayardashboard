'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { downloadSalaryReceiptLetter } from '@/lib/salaryReceiptLetterGenerator';
import type { SalarySheet, SalarySheetEntry } from '@/types/database';

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function ReceiptLettersPage() {
  const now = currentMonthYear();
  const toast = useToast();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const [sheet, setSheet] = useState<SalarySheet | null>(null);
  const [entries, setEntries] = useState<SalarySheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string>('manual');

  const buildReceiptBody = (monthLabel: string, totalSalary: number, deduction: number) => {
    const net = totalSalary - deduction;
    const formattedNet = net.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    return `I, the undersigned, hereby acknowledge and confirm that I have received my full salary for the month of ${monthLabel} in cash, amounting to ${formattedNet} OMR. There are no dues remaining.`;
  };

  const [manualData, setManualData] = useState({
    labor_name: '',
    labor_code: '',
    designation: '',
    salaryMonthLabel: '',
    year: now.year,
    monthly_salary: 0,
    actual_worked_hours: 0,
    overtime_hours: 0,
    total_worked_hours: 0,
    hourly_rate: 0,
    total_salary: 0,
    deduction: 0,
    receiptBody: '',
  });
  const [receiptBodyEdited, setReceiptBodyEdited] = useState(false);
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
        setTimeout(() => { initDoneRef.current = true; }, 0);
      });
  }, []);

  useEffect(() => {
    if (!initDoneRef.current) return;
    refetch(month, year);
  }, [month, year, refetch]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter((e) => {
      const name = (e.labor_name || '').toLowerCase();
      const id = (e.labor_code || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [entries, searchQuery]);

  // Show all employees for receipt letter generation, including those with bank accounts who were paid cash
  const cashPaymentEntries = useMemo(
    () => filteredEntries,
    [filteredEntries]
  );

  async function downloadAllLetters(rows: SalarySheetEntry[]) {
    for (const entry of rows) {
      // Add a small delay to avoid overwhelming browser
      await new Promise((resolve) => setTimeout(resolve, 200));
      await downloadSalaryReceiptLetter(entry, month, year);
    }
    toast.success(`Downloaded ${rows.length} receipt letters`);
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {error && (
        <Card>
          <div className="text-sm" style={{ color: '#dc2626' }}>{error}</div>
        </Card>
      )}

      {/* Controls */}
      <Card padding="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Month & Year
            </label>
            <div className="mt-2 flex gap-2">
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                value={year}
                min={2020}
                max={2099}
                onChange={(e) => setYear(Number(e.target.value) || year)}
                className="w-24 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Search
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <Search size={16} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Status
            </label>
            <div className="mt-2">
              {sheet && (
                <Badge color={sheet.status === 'approved' ? 'green' : 'orange'}>
                  {sheet.status === 'approved' ? 'Approved' : 'Draft'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {!cashPaymentEntries.length ? (
        <Card>
          <EmptyState
            title="No receipt letters"
            description={entries.length === 0 ? 'Create and approve a salary sheet first.' : 'No salary entries found for the selected month and year.'}
          />
        </Card>
      ) : (
        <Card padding="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Salary Receipt Letters
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {cashPaymentEntries.length} employees available for receipt generation
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => downloadAllLetters(cashPaymentEntries)}
                icon={<Download size={14} />}
              >
                Download All Letters ({cashPaymentEntries.length})
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'var(--thead-bg)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Designation</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Gross Salary</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Deduction</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Net Salary</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {cashPaymentEntries.map((entry) => {
                  const gross = Number(entry.total_salary) || 0;
                  const deduction = Number(entry.deduction) || 0;
                  const net = gross - deduction;
                  return (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                      <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_name}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_code}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{entry.designation}</td>
                      <td className="px-3 py-2 text-xs">{gross.toFixed(3)} OMR</td>
                      <td className="px-3 py-2 text-xs" style={{ color: deduction > 0 ? '#dc2626' : 'var(--text-primary)' }}>{deduction.toFixed(3)} OMR</td>
                      <td className="px-3 py-2 font-semibold" style={{ color: 'var(--orange)' }}>{net.toFixed(3)} OMR</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={async () => await downloadSalaryReceiptLetter(entry, month, year)}
                          className="px-3 py-1 rounded-lg text-xs whitespace-nowrap"
                          style={{ background: '#f3e8ff', border: '1px solid #ddd6fe', color: '#7c3aed', cursor: 'pointer' }}
                          title="Download Receipt Letter PDF"
                        >
                          <Download size={13} style={{ display: 'inline', marginRight: 4 }} /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding="p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Manual Receipt Letter
            </h3>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Select an employee or type the information manually to create a custom salary receipt letter.
            </p>
          </div>
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Select Laborer or Manual Input
            </label>
            <select
              value={selectedEntryId}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedEntryId(value);
                if (value === 'manual') {
                  return;
                }
                const selected = entries.find((entry) => entry.id === value);
                if (selected) {
                  const totalSalary = Number(selected.total_salary) || 0;
                  const deduction = Number(selected.deduction) || 0;
                  const monthLabel = `${MONTH_NAMES[month]} ${year}`;
                  setManualData({
                    labor_name: selected.labor_name || '',
                    labor_code: selected.labor_code || '',
                    designation: selected.designation || '',
                    salaryMonthLabel: monthLabel,
                    year,
                    monthly_salary: Number(selected.monthly_salary) || 0,
                    actual_worked_hours: Number(selected.actual_worked_hours) || 0,
                    overtime_hours: Number(selected.overtime_hours) || 0,
                    total_worked_hours: Number(selected.total_worked_hours) || 0,
                    hourly_rate: Number(selected.hourly_rate) || 0,
                    total_salary: totalSalary,
                    deduction,
                    receiptBody: buildReceiptBody(monthLabel, totalSalary, deduction),
                  });
                  setReceiptBodyEdited(false);
                }
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="manual">Manual entry</option>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.labor_name} ({entry.labor_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Salary Month Label
            </label>
            <input
              type="text"
              value={manualData.salaryMonthLabel}
              onChange={(e) => {
                const value = e.target.value;
                setManualData((prev) => ({
                  ...prev,
                  salaryMonthLabel: value,
                  receiptBody: receiptBodyEdited || !value.trim()
                    ? prev.receiptBody
                    : buildReceiptBody(value, prev.total_salary, prev.deduction),
                }));
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="March 2026"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Year
            </label>
            <input
              type="number"
              value={manualData.year}
              min={2020}
              max={2099}
              onChange={(e) => setManualData({ ...manualData, year: Number(e.target.value) || manualData.year })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Net Salary
            </label>
            <div className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              {(manualData.total_salary - manualData.deduction).toFixed(3)} OMR
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Receipt Text
          </label>
          <textarea
            value={manualData.receiptBody}
            onChange={(e) => {
              setManualData({ ...manualData, receiptBody: e.target.value });
              setReceiptBodyEdited(true);
            }}
            rows={5}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            placeholder="Edit the receipt acknowledgement text"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Name
            </label>
            <input
              type="text"
              value={manualData.labor_name}
              onChange={(e) => setManualData({ ...manualData, labor_name: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              ID Number
            </label>
            <input
              type="text"
              value={manualData.labor_code}
              onChange={(e) => setManualData({ ...manualData, labor_code: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Designation
            </label>
            <input
              type="text"
              value={manualData.designation}
              onChange={(e) => setManualData({ ...manualData, designation: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Monthly Salary
            </label>
            <input
              type="number"
              value={manualData.monthly_salary}
              onChange={(e) => setManualData({ ...manualData, monthly_salary: Number(e.target.value) || 0 })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.001"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Total Salary
            </label>
            <input
              type="number"
              value={manualData.total_salary}
              onChange={(e) => {
                const value = Number(e.target.value) || 0;
                setManualData((prev) => ({
                  ...prev,
                  total_salary: value,
                  receiptBody: receiptBodyEdited || !prev.salaryMonthLabel.trim()
                    ? prev.receiptBody
                    : buildReceiptBody(prev.salaryMonthLabel, value, prev.deduction),
                }));
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.001"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Deduction
            </label>
            <input
              type="number"
              value={manualData.deduction}
              onChange={(e) => {
                const value = Number(e.target.value) || 0;
                setManualData((prev) => ({
                  ...prev,
                  deduction: value,
                  receiptBody: receiptBodyEdited || !prev.salaryMonthLabel.trim()
                    ? prev.receiptBody
                    : buildReceiptBody(prev.salaryMonthLabel, prev.total_salary, value),
                }));
              }}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.001"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Hourly Rate
            </label>
            <input
              type="number"
              value={manualData.hourly_rate}
              onChange={(e) => setManualData({ ...manualData, hourly_rate: Number(e.target.value) || 0 })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4 lg:grid-cols-3">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Actual Worked Hours
            </label>
            <input
              type="number"
              value={manualData.actual_worked_hours}
              onChange={(e) => setManualData({ ...manualData, actual_worked_hours: Number(e.target.value) || 0 })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Overtime Hours
            </label>
            <input
              type="number"
              value={manualData.overtime_hours}
              onChange={(e) => setManualData({ ...manualData, overtime_hours: Number(e.target.value) || 0 })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Total Worked Hours
            </label>
            <input
              type="number"
              value={manualData.total_worked_hours}
              onChange={(e) => setManualData({ ...manualData, total_worked_hours: Number(e.target.value) || 0 })}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              step="0.1"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            disabled={!manualData.receiptBody.trim()}
            onClick={async () => await downloadSalaryReceiptLetter(manualData, month, manualData.year, manualData.salaryMonthLabel, manualData.receiptBody)}
            icon={<Download size={14} />}
          >
            Download Manual Letter
          </Button>
        </div>
      </Card>

      {/* Info Box */}
      <Card padding="p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <p className="text-sm" style={{ color: '#166534' }}>
          <strong>ℹ️ Receipt Letters:</strong> These are salary acknowledgment letters for employees who received cash, including those with bank accounts. Use the list above to generate receipts for individual employees or download them in bulk.
        </p>
      </Card>
    </div>
  );
}
