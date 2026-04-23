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

  // Only show employees without bank accounts for receipt letters
  const cashPaymentEntries = useMemo(
    () => filteredEntries.filter((e) => !(e.bank_name || '').trim() || (e.bank_name || '').trim() === '-'),
    [filteredEntries]
  );

  async function downloadAllLetters(rows: SalarySheetEntry[]) {
    for (const entry of rows) {
      // Add a small delay to avoid overwhelming browser
      await new Promise(resolve => setTimeout(resolve, 200));
      downloadSalaryReceiptLetter(entry, month, year);
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
            description={entries.length === 0 ? 'Create and approve a salary sheet first.' : 'All employees have bank accounts. Receipt letters are for cash payments only.'}
          />
        </Card>
      ) : (
        <Card padding="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Cash Payment Receipt Letters
              </h3>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {cashPaymentEntries.length} employees without bank accounts
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
                          onClick={() => downloadSalaryReceiptLetter(entry, month, year)}
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

      {/* Info Box */}
      <Card padding="p-4" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <p className="text-sm" style={{ color: '#166534' }}>
          <strong>ℹ️ Receipt Letters:</strong> These are salary acknowledgment letters for employees who receive cash payments. Each letter includes employee details, salary breakdown, and acknowledgment statement. Download them individually or in bulk by clicking the buttons above.
        </p>
      </Card>
    </div>
  );
}
