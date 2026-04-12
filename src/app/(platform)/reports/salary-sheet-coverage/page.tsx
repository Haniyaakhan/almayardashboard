'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLaborers } from '@/hooks/useLaborers';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { MONTH_NAMES } from '@/lib/dateUtils';
import type { SalarySheet, SalarySheetEntry, Laborer } from '@/types/database';

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

export default function SalarySheetCoverageReportPage() {
  const now = currentMonthYear();
  const { laborers, loading: laborersLoading, error: laborersError } = useLaborers(false);

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

  const addedIdSet = useMemo(() => new Set(entries.map((e) => e.laborer_id)), [entries]);

  const addedLaborers = useMemo(() => {
    return laborers.filter((l) => addedIdSet.has(l.id));
  }, [laborers, addedIdSet]);

  const notAddedLaborers = useMemo(() => {
    return laborers.filter((l) => !addedIdSet.has(l.id));
  }, [laborers, addedIdSet]);

  const busy = loading || laborersLoading;

  return (
    <div className="p-6 space-y-6">
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

          <div className="ml-auto">
            <Badge color={sheet?.status === 'approved' ? 'green' : 'amber'}>
              {MONTH_NAMES[month]} {year} - {sheet?.status === 'approved' ? 'Approved' : 'Draft / Not Found'}
            </Badge>
          </div>
        </div>
      </Card>

      {(error || laborersError) && (
        <Card className="border-red-200">
          <p className="text-red-600 text-sm">{error || laborersError}</p>
        </Card>
      )}

      {busy ? (
        <Card>
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Laborers</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{laborers.length}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Added In Salary Sheet</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{addedLaborers.length}</p>
            </Card>
            <Card>
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Not Added In Salary Sheet</p>
              </div>
              <p className="text-2xl font-bold text-red-500">{notAddedLaborers.length}</p>
            </Card>
          </div>

          {!sheet ? (
            <Card>
              <EmptyState
                title="No Salary Sheet Found"
                description={`No salary sheet found for ${MONTH_NAMES[month]} ${year}. Everyone is currently in the not-added list.`}
              />
            </Card>
          ) : null}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <CoverageTable title="Added In Salary Sheet" rows={addedLaborers} accentClass="text-green-600" />
            <CoverageTable title="Not Added In Salary Sheet" rows={notAddedLaborers} accentClass="text-red-500" />
          </div>
        </>
      )}
    </div>
  );
}

function CoverageTable({ title, rows, accentClass }: { title: string; rows: Laborer[]; accentClass: string }) {
  return (
    <Card>
      <h3 className={`text-sm font-semibold mb-3 ${accentClass}`}>{title} ({rows.length})</h3>
      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No rows.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.04em' }}>
                <th style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left' }}>Labor Name</th>
                <th style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left' }}>Labor ID</th>
                <th style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left' }}>Designation</th>
                <th style={{ border: '1px solid var(--border-color)', padding: '6px 8px', textAlign: 'left' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.full_name || '-'}</td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.id_number || '-'}</td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.designation || '-'}</td>
                  <td style={{ border: '1px solid var(--border-color)', padding: '6px 8px' }}>{row.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
