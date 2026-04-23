'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Printer, FileText, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { downloadSalarySlip } from '@/lib/salarySlipGenerator';
import { downloadSalaryReceiptLetter } from '@/lib/salaryReceiptLetterGenerator';
import type { SalarySheet, SalarySheetEntry } from '@/types/database';

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function SalarySlipsPage() {
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

  const withBank = useMemo(
    () => filteredEntries.filter((e) => (e.bank_name || '').trim() && (e.bank_name || '').trim() !== '-'),
    [filteredEntries]
  );
  const withoutBank = useMemo(
    () => filteredEntries.filter((e) => !(e.bank_name || '').trim() || (e.bank_name || '').trim() === '-'),
    [filteredEntries]
  );

  async function downloadAllSlips(rows: SalarySheetEntry[], type: 'slip' | 'letter') {
    for (const entry of rows) {
      // Add a small delay to avoid overwhelming browser
      await new Promise(resolve => setTimeout(resolve, 200));
      if (type === 'slip') {
        downloadSalarySlip(entry, month, year);
      } else {
        downloadSalaryReceiptLetter(entry, month, year);
      }
    }
    toast.success(`Downloaded ${rows.length} ${type === 'slip' ? 'salary slips' : 'receipt letters'}`);
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

      {!entries.length ? (
        <Card>
          <EmptyState
            title="No salary data"
            description="Create and approve a salary sheet first to generate slips and letters."
          />
        </Card>
      ) : (
        <>
          {/* With Bank */}
          <Card padding="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Bank Transfer Employees
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {withBank.length} employees with bank accounts
                </p>
              </div>
              {withBank.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadAllSlips(withBank, 'slip')}
                    icon={<Download size={14} />}
                  >
                    Download All Slips
                  </Button>
                </div>
              )}
            </div>

            {withBank.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No employees with bank accounts</p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--thead-bg)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Bank</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Net Salary</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withBank.map((entry) => {
                      const net = (Number(entry.total_salary) || 0) - (Number(entry.deduction) || 0);
                      return (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_name}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_code}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{entry.bank_name}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--orange)' }}>{net.toFixed(3)} OMR</td>
                          <td className="px-3 py-2">
                            <button
                              onClick={() => downloadSalarySlip(entry, month, year)}
                              className="px-3 py-1 rounded-lg text-xs"
                              style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', cursor: 'pointer' }}
                              title="Download Salary Slip"
                            >
                              <Download size={13} style={{ display: 'inline', marginRight: 4 }} /> Slip
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Without Bank */}
          <Card padding="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Cash Payment Employees
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {withoutBank.length} employees without bank accounts
                </p>
              </div>
              {withoutBank.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadAllSlips(withoutBank, 'slip')}
                    icon={<Download size={14} />}
                  >
                    Download All Slips
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadAllSlips(withoutBank, 'letter')}
                    icon={<Download size={14} />}
                  >
                    Download All Receipts
                  </Button>
                </div>
              )}
            </div>

            {withoutBank.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No employees without bank accounts</p>
            ) : (
              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
                <table className="w-full text-sm">
                  <thead style={{ background: 'var(--thead-bg)' }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>ID</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Designation</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Net Salary</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withoutBank.map((entry) => {
                      const net = (Number(entry.total_salary) || 0) - (Number(entry.deduction) || 0);
                      return (
                        <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                          <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_name}</td>
                          <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{entry.labor_code}</td>
                          <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>{entry.designation}</td>
                          <td className="px-3 py-2 font-semibold" style={{ color: 'var(--orange)' }}>{net.toFixed(3)} OMR</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => downloadSalarySlip(entry, month, year)}
                                className="px-2 py-1 rounded text-xs"
                                style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', cursor: 'pointer' }}
                                title="Download Salary Slip"
                              >
                                <Download size={12} style={{ display: 'inline' }} />
                              </button>
                              <button
                                onClick={() => downloadSalaryReceiptLetter(entry, month, year)}
                                className="px-2 py-1 rounded text-xs"
                                style={{ background: '#f3e8ff', border: '1px solid #ddd6fe', color: '#7c3aed', cursor: 'pointer' }}
                                title="Download Receipt Letter"
                              >
                                <FileText size={12} style={{ display: 'inline' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
