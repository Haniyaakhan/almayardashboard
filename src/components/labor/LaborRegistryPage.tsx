'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Search, Pencil, Trash2, RotateCcw, Download, Upload, FileDown, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { exportLaborersToExcel } from '@/lib/excelExport';
import { createClient } from '@/lib/supabase/client';
import { useLaborers, createLaborer, updateLaborer, deactivateLaborer, reactivateLaborer } from '@/hooks/useLaborers';
import { useForemen } from '@/hooks/useForemen';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { FormModal } from '@/components/ui/FormModal';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { LaborerForm } from '@/components/labor/LaborerForm';
import { normalizeDesignationKey, toDisplayDesignation } from '@/lib/designation';
import { OMAN_BANK_LIST, resolveSwift } from '@/lib/omanBanks';
import type { Laborer } from '@/types/database';

export function LaborRegistryPage() {
  const { laborers, loading, refetch } = useLaborers(false);
  const { foremen } = useForemen(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const toast = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editLaborer, setEditLaborer] = useState<Laborer | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [syncingBanks, setSyncingBanks] = useState(false);

  // Build a canonical name → swift map for fast lookup
  const canonicalByNorm = useMemo(() => {
    const map = new Map<string, { name: string; swift: string }>();
    OMAN_BANK_LIST.forEach((b) => {
      const key = b.name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
      map.set(key, b);
    });
    return map;
  }, []);

  async function syncAllBanks() {
    if (!laborers.length) { toast.warning('No laborers to sync'); return; }
    setSyncingBanks(true);
    const supabase = createClient();

    // Fetch draft sheet IDs once
    const { data: draftSheets } = await supabase.from('salary_sheets').select('id').eq('status', 'draft');
    const draftIds = (draftSheets ?? []).map((s: any) => s.id as string);

    let labUpdated = 0;
    let entryUpdated = 0;

    for (const lab of laborers) {
      // Normalise bank name to canonical form (if recognised)
      const canonical = lab.bank_name ? OMAN_BANK_LIST.find((b) => resolveSwift(lab.bank_name) === b.swift) : null;
      const canonicalBankName = canonical ? canonical.name : lab.bank_name;

      if (canonical && canonical.name !== lab.bank_name) {
        await supabase.from('laborers').update({ bank_name: canonical.name }).eq('id', lab.id);
        labUpdated++;
      }

      // Sync all updatable fields into draft salary entries
      if (draftIds.length > 0) {
        const patch: Record<string, any> = {};
        if (lab.full_name)             patch.labor_name          = lab.full_name;
        if (lab.designation)           patch.designation         = lab.designation;
        if (canonicalBankName)         patch.bank_name           = canonicalBankName;
        if (lab.bank_account_number)   patch.bank_account_number = lab.bank_account_number;
        if (lab.monthly_salary != null) patch.monthly_salary     = lab.monthly_salary;
        if (Object.keys(patch).length > 0) {
          const { error } = await supabase
            .from('salary_sheet_entries')
            .update(patch)
            .eq('labor_code', lab.id_number)
            .in('sheet_id', draftIds);
          if (!error) entryUpdated++;
        }
      }
    }

    const parts: string[] = [];
    if (labUpdated > 0) parts.push(`${labUpdated} bank name${labUpdated !== 1 ? 's' : ''} normalised`);
    if (entryUpdated > 0) parts.push(`${entryUpdated} draft entr${entryUpdated !== 1 ? 'ies' : 'y'} updated`);
    toast.success(`Sync complete${parts.length ? ' — ' + parts.join(', ') : ''}`);
    setSyncingBanks(false);
    refetch();
  }

  const foremanNameById = useMemo(
    () => new Map(foremen.map((f) => [f.id, f.full_name])),
    [foremen]
  );

  const designationOptions = useMemo(() => {
    const unique = new Set<string>();
    laborers.forEach((l) => unique.add(normalizeDesignationKey(l.designation)));

    return ['All', ...Array.from(unique)
      .filter((key) => key !== 'unspecified')
      .map((key) => toDisplayDesignation(key))
      .sort((a, b) => a.localeCompare(b))];
  }, [laborers]);

  const filtered = laborers.filter((l) => {
    const q = search.trim().toLowerCase();
    const normalizedQuery = normalizeDesignationKey(q);
    const designationKey = normalizeDesignationKey(l.designation);
    const designationLabel = toDisplayDesignation(l.designation).toLowerCase();
    const matchSearch =
      l.full_name.toLowerCase().includes(q) ||
      l.id_number.toLowerCase().includes(q) ||
      designationLabel.includes(q) ||
      designationKey.includes(normalizedQuery) ||
      (l.supplier_name ?? '').toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'All' || (statusFilter === 'Active' ? l.is_active : !l.is_active);
    const matchDesignation =
      designationFilter === 'All' ||
      normalizeDesignationKey(l.designation) === normalizeDesignationKey(designationFilter);
    return matchSearch && matchStatus && matchDesignation;
  });

  async function handleExportFiltered() {
    if (!filtered.length) { toast.error('No records to export'); return; }
    const parts: string[] = [];
    if (designationFilter !== 'All') parts.push(designationFilter);
    if (statusFilter !== 'All') parts.push(statusFilter);
    if (search.trim()) parts.push(`"${search.trim()}"`);
    const label = parts.length ? parts.join(' · ') : 'All Labour';
    setExporting(true);
    try {
      await exportLaborersToExcel(filtered, label, foremanNameById);
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, flexWrap: 'wrap', marginBottom: 14,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px',
      }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['All', 'Active', 'Inactive'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              transition: 'all 0.14s',
              border: statusFilter === s ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: statusFilter === s ? 'var(--navy)' : 'var(--bg-card)',
              color: statusFilter === s ? '#fff' : 'var(--text-light)',
            }}>{s}</button>
          ))}
          <select
            value={designationFilter}
            onChange={e => setDesignationFilter(e.target.value)}
            style={{
              fontSize: 12, fontWeight: 500,
              padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
              border: designationFilter !== 'All' ? '1px solid var(--orange)' : '1px solid var(--border2)',
              background: designationFilter !== 'All' ? 'var(--orange-lt)' : 'var(--bg-card)',
              color: designationFilter !== 'All' ? 'var(--orange)' : 'var(--text-light)',
              outline: 'none',
            }}
          >
            {designationOptions.map(d => (
              <option key={d} value={d}>{d === 'All' ? 'All Designations' : d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, role, contractor…"
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 220, outline: 'none',
              }}
            />
          </div>
          <button
            onClick={handleExportFiltered}
            disabled={exporting || !filtered.length}
            style={{ ...addBtnStyle, background: '#16a34a', cursor: (exporting || !filtered.length) ? 'not-allowed' : 'pointer', opacity: (exporting || !filtered.length) ? 0.6 : 1 }}
          >
            <Download size={14} /> {exporting ? 'EXPORTING…' : 'EXPORT'}
          </button>
          <button onClick={() => setShowBulkModal(true)} style={{ ...addBtnStyle, background: '#4f46e5' }}>
            <Upload size={14} /> LABOUR UPDATE
          </button>
          <button
            onClick={syncAllBanks}
            disabled={syncingBanks}
            style={{ ...addBtnStyle, background: '#0891b2', opacity: syncingBanks ? 0.65 : 1, cursor: syncingBanks ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={14} /> {syncingBanks ? 'SYNCING…' : 'SYNC BANK'}
          </button>
          <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>
            <Plus size={14} /> ADD NEW
          </button>
        </div>
      </div>

      {/* Table */}
      {!filtered.length ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
          <EmptyState
            icon={<Users size={24} />}
            title="No laborers found"
            description="Add your first laborer to get started."
            action={
              <button onClick={() => setShowAddModal(true)} style={addBtnStyle}>
                <Plus size={14} /> Add Laborer
              </button>
            }
          />
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 13,
          border: '1px solid var(--border)', overflow: 'hidden',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--thead-bg)' }}>
                {['Worker', 'Labour ID', 'Designation', 'Foreman', 'Contractor', 'Phone', 'Monthly Salary', 'Bank', 'Status', 'Actions'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const initials = l.full_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr
                    key={l.id}
                    style={{ borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {/* Worker */}
                    <td style={tdStyle}>
                      <div className="flex items-center gap-2.5">
                        <div style={{
                          width: 30, height: 30, borderRadius: 7,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                          background: 'rgba(255,107,43,0.08)', color: 'var(--orange)',
                        }}>{initials}</div>
                        <Link
                          href={`/labor/${l.id}`}
                          style={linkTextStyle}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >{l.full_name}</Link>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{l.id_number || '—'}</td>
                    <td style={tdStyle}>{toDisplayDesignation(l.designation)}</td>
                    <td style={tdStyle}>{l.foreman_id ? (foremanNameById.get(l.foreman_id) ?? '—') : '—'}</td>
                    <td style={tdStyle}>{l.supplier_name || '—'}</td>
                    <td style={tdStyle}>{l.phone || '—'}</td>
                    <td style={tdStyle}>{l.monthly_salary ? `${l.monthly_salary} OMR` : '—'}</td>
                    <td style={tdStyle}>{l.bank_name || '—'}</td>
                    <td style={tdStyle}>
                      <Badge color={l.is_active ? 'green' : 'red'}>{l.is_active ? 'Active' : 'Left'}</Badge>
                    </td>
                    <td style={tdStyle}>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditLaborer(l)}
                          title="Edit"
                          style={actionBtnStyle}
                        >
                          <Pencil size={13} />
                        </button>
                        {l.is_active ? (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Deactivate Laborer',
                                message: `Are you sure you want to deactivate "${l.full_name}"?`,
                                variant: 'danger',
                                confirmLabel: 'Deactivate',
                              });
                              if (!ok) return;
                              await deactivateLaborer(l.id);
                              refetch();
                              toast.success(`"${l.full_name}" deactivated`);
                            }}
                            title="Deactivate"
                            style={{ ...actionBtnStyle, border: '1px solid var(--red-border)', color: 'var(--red-text)', background: 'var(--red-bg)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Re-activate Laborer',
                                message: `Re-activate "${l.full_name}"?`,
                                variant: 'info',
                                confirmLabel: 'Re-activate',
                              });
                              if (!ok) return;
                              await reactivateLaborer(l.id);
                              refetch();
                              toast.success(`"${l.full_name}" reactivated`);
                            }}
                            title="Re-activate"
                            style={{ ...actionBtnStyle, border: '1px solid #bbf7d0', color: '#16a34a', background: 'rgba(34,197,94,0.08)' }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDialog}

      {showBulkModal && (
        <BulkUpdateModal
          open={showBulkModal}
          laborers={laborers}
          onClose={() => setShowBulkModal(false)}
          onDone={() => { setShowBulkModal(false); refetch(); }}
          toast={toast}
        />
      )}

      <FormModal
        open={showAddModal}
        title="Add New Labour"
        subtitle="Register a new worker to the registry"
        onClose={() => setShowAddModal(false)}
        maxWidth={760}
        zIndex={999}
      >
        <LaborerForm
          submitLabel="Create Laborer"
          onSubmit={async (data) => {
            const err = await createLaborer(data);
            if (err) throw err;
            toast.success('Laborer created successfully');
            setShowAddModal(false);
            refetch();
          }}
        />
      </FormModal>

      <FormModal
        open={!!editLaborer}
        title="Edit Labour"
        subtitle={editLaborer?.full_name}
        onClose={() => setEditLaborer(null)}
        maxWidth={760}
        zIndex={999}
      >
        {editLaborer ? (
          <LaborerForm
            initial={editLaborer}
            submitLabel="Update Laborer"
            onSubmit={async (data) => {
              const err = await updateLaborer(editLaborer.id, data);
              if (err) throw err;
              toast.success('Laborer updated successfully');
              setEditLaborer(null);
              refetch();
            }}
          />
        ) : null}
      </FormModal>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

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

const addBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--orange)',
  color: '#fff',
  border: 'none',
  padding: '8px 15px',
  borderRadius: 9,
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const linkTextStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
  transition: 'color 0.12s',
};

const actionBtnStyle: React.CSSProperties = {
  padding: 5,
  borderRadius: 7,
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  color: 'var(--text-light)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.14s',
};

// ─── Bulk Update ──────────────────────────────────────────────────────────────

type BulkPreviewItem = {
  rowIndex: number;
  laborerId: string;
  laborerName: string;
  currentData: Laborer;
  changes: Partial<Laborer>;
  fieldsChanged: string[];
};

type BulkSkippedItem = {
  rowIndex: number;
  labourId: string;
  reason: string;
};

type BulkNewItem = {
  rowIndex: number;
  labourId: string;
  data: Record<string, string>;
  confirmed: boolean;
};

type BulkResult = { processed: number; updated: number; added: number; skipped: number };

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-]/g, '');
}

// Bank-only fields (Bank Details template)
const BANK_COLUMN_MAP: Record<string, keyof Laborer> = {
  labourid: 'id_number', laborid: 'id_number', idnumber: 'id_number',
  bankname: 'bank_name', bank: 'bank_name',
  bankaccountnumber: 'bank_account_number', accountnumber: 'bank_account_number', accountno: 'bank_account_number',
};

// Full employee fields (Full Employee Details template)
const FULL_COLUMN_MAP: Record<string, keyof Laborer> = {
  labourid: 'id_number', laborid: 'id_number', idnumber: 'id_number',
  fullname: 'full_name', labourname: 'full_name', laborname: 'full_name', name: 'full_name',
  designation: 'designation', role: 'designation',
  nationality: 'nationality',
  phone: 'phone', phonenumber: 'phone', mobile: 'phone',
  monthlysalary: 'monthly_salary', salary: 'monthly_salary',
  bankname: 'bank_name', bank: 'bank_name',
  bankswiftcode: 'bank_name', // resolved separately, but map so it's recognized
  bankaccountnumber: 'bank_account_number', accountnumber: 'bank_account_number', accountno: 'bank_account_number',
  sitenumber: 'site_number', site: 'site_number',
  roomnumber: 'room_number', room: 'room_number',
  notes: 'notes',
};

const FIELD_LABELS: Partial<Record<keyof Laborer, string>> = {
  full_name: 'Full Name',
  designation: 'Designation',
  nationality: 'Nationality',
  phone: 'Phone',
  monthly_salary: 'Monthly Salary',
  bank_name: 'Bank Name',
  bank_account_number: 'Bank Account No',
  site_number: 'Site Number',
  room_number: 'Room Number',
  notes: 'Notes',
};

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
      current += char;
    }
    result.push(current);
    return result;
  }
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] ?? '').trim(); });
    return row;
  }).filter((row) => Object.values(row).some((v) => v));
}

function rowsToPreview(
  rows: Record<string, string>[],
  laborers: Laborer[],
  templateType: 'bank' | 'full',
): { preview: BulkPreviewItem[]; skipped: BulkSkippedItem[]; newItems: BulkNewItem[] } {
  const byIdNumber = new Map(laborers.map((l) => [l.id_number.trim(), l]));
  const preview: BulkPreviewItem[] = [];
  const skipped: BulkSkippedItem[] = [];
  const newItems: BulkNewItem[] = [];
  const columnMap = templateType === 'full' ? FULL_COLUMN_MAP : BANK_COLUMN_MAP;

  rows.forEach((row, idx) => {
    const idKey = Object.keys(row).find((k) => {
      const n = normalizeHeader(k);
      return n === 'labourid' || n === 'laborid' || n === 'idnumber';
    });
    const labourId = idKey ? (row[idKey] ?? '').trim() : '';
    if (!labourId) { skipped.push({ rowIndex: idx + 2, labourId: '', reason: 'Missing Labour ID' }); return; }

    const laborer = byIdNumber.get(labourId);
    if (!laborer) {
      // Not found — offer to add as new (full template only)
      if (templateType === 'full') {
        newItems.push({ rowIndex: idx + 2, labourId, data: row, confirmed: false });
      } else {
        skipped.push({ rowIndex: idx + 2, labourId, reason: `Labour ID "${labourId}" not found` });
      }
      return;
    }

    const changes: Partial<Laborer> = {};
    const fieldsChanged: string[] = [];

    Object.entries(row).forEach(([header, rawValue]) => {
      const normH = normalizeHeader(header);
      const field = columnMap[normH];
      if (!field || field === 'id_number') return;
      if (!rawValue) return;
      // Cast monthly_salary to number
      const coercedValue: any = field === 'monthly_salary' ? (Number(rawValue) || rawValue) : rawValue;
      if (String((laborer as any)[field] ?? '') !== String(coercedValue)) {
        (changes as any)[field] = coercedValue;
        fieldsChanged.push(FIELD_LABELS[field] ?? field);
      }
    });

    if (!fieldsChanged.length) { skipped.push({ rowIndex: idx + 2, labourId, reason: 'No changes detected' }); return; }
    preview.push({ rowIndex: idx + 2, laborerId: laborer.id, laborerName: laborer.full_name, currentData: laborer, changes, fieldsChanged });
  });

  return { preview, skipped, newItems };
}

function BulkUpdateModal({
  open,
  laborers,
  onClose,
  onDone,
  toast,
}: {
  open: boolean;
  laborers: Laborer[];
  onClose: () => void;
  onDone: () => void;
  toast: ReturnType<typeof useToast>;
}) {
  const [templateType, setTemplateType] = useState<'bank' | 'full'>('bank');
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [dragging, setDragging] = useState(false);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [preview, setPreview] = useState<BulkPreviewItem[]>([]);
  const [skipped, setSkipped] = useState<BulkSkippedItem[]>([]);
  const [newItems, setNewItems] = useState<BulkNewItem[]>([]);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function resetUpload() {
    setStep('upload');
    setParsedRows([]);
    setPreview([]);
    setSkipped([]);
    setNewItems([]);
  }

  async function handleFile(file: File) {
    try {
      let rows: Record<string, string>[] = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = parseCSVText(await file.text());
      } else {
        const buffer = await file.arrayBuffer();
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const ws = workbook.worksheets[0];
        if (!ws) throw new Error('No worksheet found in file');
        const headers: string[] = [];
        ws.getRow(1).eachCell((cell) => { headers.push(String(cell.value ?? '').trim()); });
        ws.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const rowObj: Record<string, string> = {};
          let hasData = false;
          row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const header = headers[colNumber - 1];
            if (header) { const val = cell.text ?? String(cell.value ?? ''); rowObj[header] = val.trim(); if (val.trim()) hasData = true; }
          });
          if (hasData) rows.push(rowObj);
        });
      }
      if (!rows.length) { toast.error('No data rows found in file'); return; }
      setParsedRows(rows);
      const { preview: p, skipped: s, newItems: n } = rowsToPreview(rows, laborers, templateType);
      setPreview(p);
      setSkipped(s);
      setNewItems(n);
      setStep('preview');
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err?.message ?? 'Unknown error'}`);
    }
  }

  function toggleNewItemConfirm(idx: number) {
    setNewItems((prev) => prev.map((item, i) => i === idx ? { ...item, confirmed: !item.confirmed } : item));
  }

  async function applyUpdates() {
    setApplying(true);
    let updated = 0;
    let added = 0;
    let skippedCount = skipped.length;

    const supabase = createClient();
    const { data: draftSheets, error: draftSheetsError } = await supabase
      .from('salary_sheets')
      .select('id')
      .eq('status', 'draft');

    if (draftSheetsError) {
      toast.error(`Could not fetch draft sheets: ${draftSheetsError.message}`);
    }
    const draftSheetIds = (draftSheets ?? []).map((s: any) => s.id as string);

    // Apply updates to existing laborers
    for (const item of preview) {
      const err = await updateLaborer(item.laborerId, item.changes);
      if (err) {
        toast.error(`Failed to update ${item.laborerName}: ${err.message}`);
        skippedCount++;
      } else {
        updated++;
        if (draftSheetIds.length > 0) {
          const entryPatch: Record<string, string> = {};
          if (item.changes.bank_name !== undefined) entryPatch.bank_name = item.changes.bank_name as string;
          if (item.changes.bank_account_number !== undefined) entryPatch.bank_account_number = item.changes.bank_account_number as string;
          if (Object.keys(entryPatch).length > 0) {
            const laborCode = item.currentData.id_number;
            const { error: syncError } = await supabase
              .from('salary_sheet_entries')
              .update(entryPatch)
              .eq('labor_code', laborCode)
              .in('sheet_id', draftSheetIds);
            if (syncError) {
              toast.error(`Salary entry sync failed for ${item.laborerName}: ${syncError.message}`);
            }
          }
        }
      }
    }

    // Add confirmed new laborers
    const confirmedNew = newItems.filter((n) => n.confirmed);
    for (const item of confirmedNew) {
      const row = item.data;
      const getName = (keys: string[]) => {
        for (const k of keys) { const v = row[Object.keys(row).find(h => normalizeHeader(h) === k) ?? ''] ?? ''; if (v) return v; }
        return '';
      };
      const fullName = getName(['fullname', 'labourname', 'laborname', 'name']);
      if (!fullName) { toast.error(`Row ${item.rowIndex}: Full name is required to add new labour`); skippedCount++; continue; }

      const newLaborer: Omit<Laborer, 'id' | 'created_at' | 'updated_at'> = {
        id_number: item.labourId,
        full_name: fullName,
        designation: getName(['designation', 'role']) || '',
        nationality: getName(['nationality']) || '',
        phone: getName(['phone', 'phonenumber', 'mobile']) || '',
        monthly_salary: Number(getName(['monthlysalary', 'salary'])) || null,
        bank_name: getName(['bankname', 'bank']) || null,
        bank_account_number: getName(['bankaccountnumber', 'accountnumber', 'accountno']) || null,
        site_number: getName(['sitenumber', 'site']) || null,
        room_number: getName(['roomnumber', 'room']) || null,
        notes: getName(['notes']) || null,
        supplier_name: '',
        daily_rate: null,
        foreman_id: null,
        start_date: null,
        foreman_commission: null,
        is_active: true,
        front_photo: null,
        back_photo: null,
      };
      const err = await createLaborer(newLaborer);
      if (err) {
        toast.error(`Failed to add ${fullName}: ${err.message}`);
        skippedCount++;
      } else {
        added++;
      }
    }

    if (updated > 0 || added > 0) {
      const parts = [];
      if (updated > 0) parts.push(`${updated} updated`);
      if (added > 0) parts.push(`${added} added`);
      toast.success(`Bulk update complete — ${parts.join(', ')}`);
    }
    setResult({ processed: parsedRows.length, updated, added, skipped: skippedCount });
    setApplying(false);
    setStep('done');
  }

  async function downloadBankTemplate() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Bank Details Update');
    const refWs = wb.addWorksheet('_BankList');
    refWs.state = 'veryHidden';
    OMAN_BANK_LIST.forEach((b, i) => {
      refWs.getCell(i + 1, 1).value = b.name;
      refWs.getCell(i + 1, 2).value = b.swift;
    });
    ws.columns = [
      { header: 'Labour_ID',           key: 'Labour_ID',           width: 16 },
      { header: 'Labour_Name',         key: 'Labour_Name',         width: 28 },
      { header: 'Bank_Name',           key: 'Bank_Name',           width: 30 },
      { header: 'Bank_SWIFT_Code',     key: 'Bank_SWIFT_Code',     width: 18 },
      { header: 'Bank_Account_Number', key: 'Bank_Account_Number', width: 26 },
    ];
    ws.getRow(1).eachCell((cell, col) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col === 1 ? 'FFD97706' : col === 4 ? 'FF4B5563' : 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center' };
    });
    ws.getRow(1).getCell(1).note = 'Required — primary key used to match records';
    ws.getRow(1).getCell(2).note = 'For reference only — not updated by the system';
    ws.getRow(1).getCell(4).note = 'Auto-resolved from Bank_Name — you can also type manually';
    for (let r = 2; r <= 200; r++) {
      ws.getCell(r, 3).dataValidation = {
        type: 'list',
        formulae: [`_BankList!$A$1:$A$${OMAN_BANK_LIST.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Bank',
        error: 'Please select a bank from the list',
      };
    }
    ws.addRow({ Labour_ID: '12345', Labour_Name: 'Example Worker', Bank_Name: 'Bank Muscat', Bank_SWIFT_Code: resolveSwift('Bank Muscat'), Bank_Account_Number: 'OM1234567890' });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Bank_Details_Update_Template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadFullTemplate() {
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Full Employee Details');
    const refWs = wb.addWorksheet('_BankList');
    refWs.state = 'veryHidden';
    OMAN_BANK_LIST.forEach((b, i) => {
      refWs.getCell(i + 1, 1).value = b.name;
    });
    ws.columns = [
      { header: 'Labour_ID',           key: 'Labour_ID',           width: 16 },
      { header: 'Full_Name',           key: 'Full_Name',           width: 28 },
      { header: 'Designation',         key: 'Designation',         width: 20 },
      { header: 'Nationality',         key: 'Nationality',         width: 16 },
      { header: 'Phone',               key: 'Phone',               width: 16 },
      { header: 'Monthly_Salary',      key: 'Monthly_Salary',      width: 16 },
      { header: 'Bank_Name',           key: 'Bank_Name',           width: 30 },
      { header: 'Bank_Account_Number', key: 'Bank_Account_Number', width: 26 },
      { header: 'Site_Number',         key: 'Site_Number',         width: 14 },
      { header: 'Room_Number',         key: 'Room_Number',         width: 14 },
      { header: 'Notes',               key: 'Notes',               width: 30 },
    ];
    ws.getRow(1).eachCell((cell, col) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col === 1 ? 'FFD97706' : 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center' };
    });
    ws.getRow(1).getCell(1).note = 'Required — primary key used to match records. If not found, row will be offered as NEW labour.';
    for (let r = 2; r <= 200; r++) {
      ws.getCell(r, 7).dataValidation = {
        type: 'list',
        formulae: [`_BankList!$A$1:$A$${OMAN_BANK_LIST.length}`],
        showErrorMessage: true,
        errorTitle: 'Invalid Bank',
        error: 'Please select a bank from the list',
      };
    }
    ws.addRow({ Labour_ID: '12345', Full_Name: 'Example Worker', Designation: 'Mason', Nationality: 'Indian', Phone: '99001234', Monthly_Salary: 120, Bank_Name: 'Bank Muscat', Bank_Account_Number: 'OM1234567890', Site_Number: 'S1', Room_Number: 'R1', Notes: '' });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Full_Employee_Details_Template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  const confirmedNewCount = newItems.filter((n) => n.confirmed).length;
  const maxWidth = step === 'preview' ? 1020 : 660;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '32px 16px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', width: '100%', maxWidth, padding: 24, position: 'relative', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: "'Sora', sans-serif" }}>Labour Bulk Update</div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              {step === 'upload' && 'Upload CSV or Excel file to update or add multiple labour records at once'}
              {step === 'preview' && `${preview.length} to update · ${newItems.length} new · ${skipped.length} skipped`}
              {step === 'done' && 'Update complete — labour records have been saved'}
            </p>
          </div>
          <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Template type selector */}
            <div style={{ display: 'flex', gap: 8 }}>
              {(['bank', 'full'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplateType(t)}
                  style={{
                    flex: 1, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: 12,
                    border: templateType === t ? '1.5px solid var(--navy)' : '1px solid var(--border2)',
                    background: templateType === t ? 'var(--navy)' : 'var(--bg-card)',
                    color: templateType === t ? '#fff' : 'var(--text-light)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'bank' ? 'Bank Details Update' : 'Full Employee Details Update'}
                </button>
              ))}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? 'var(--orange)' : 'var(--border2)'}`, borderRadius: 14, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(255,107,43,0.04)' : 'var(--input-bg)', transition: 'all 0.2s' }}
            >
              <Upload size={30} style={{ margin: '0 auto 12px', color: 'var(--text-muted)', display: 'block' }} />
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 5 }}>Drop your file here, or click to browse</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supports .csv and .xlsx files</div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            {templateType === 'bank' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <FileDown size={16} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: '#1e40af' }}>
                  <strong>Bank Details Template</strong> — columns: Labour ID, Labour Name, Bank Name, Bank SWIFT Code, Bank Account Number.
                  Only updates bank details for existing workers.
                </div>
                <button onClick={downloadBankTemplate} style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'white', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Download .xlsx
                </button>
              </div>
            )}

            {templateType === 'full' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                <FileDown size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: '#166534' }}>
                  <strong>Full Employee Details Template</strong> — all fields including name, designation, salary, bank, site/room.
                  Existing workers are updated; new Labour IDs will be offered to add as new labourers.
                </div>
                <button onClick={downloadFullTemplate} style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', background: 'white', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Download .xlsx
                </button>
              </div>
            )}

            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.75, padding: '10px 14px', background: 'var(--input-bg)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Rules:</strong>
              <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                <li><strong>Labour_ID</strong> is the primary key — used to match existing records</li>
                <li>Rows with missing Labour ID are skipped automatically</li>
                <li>Only columns present in the file are updated — all other data is preserved</li>
                <li>Empty cells keep the existing value unchanged</li>
                {templateType === 'full' && <li>Labour IDs not found in the registry are shown as <strong>New Labour</strong> — you can confirm to add them</li>}
                <li>Approved salary sheets remain <strong>frozen</strong> — only draft salary data updates</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === 'preview' && (
          <div>
            {preview.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Records to Update ({preview.length})
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: 'var(--thead-bg)', position: 'sticky', top: 0 }}>
                      <tr>
                        {['Row #', 'Labour ID', 'Name', 'Fields to Update', 'Changes Preview'].map((h) => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((item) => (
                        <tr key={item.laborerId} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '7px 12px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{item.rowIndex}</td>
                          <td style={{ padding: '7px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{item.currentData.id_number}</td>
                          <td style={{ padding: '7px 12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{item.laborerName}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {item.fieldsChanged.map((f) => (
                                <span key={f} style={{ fontSize: 10, fontWeight: 600, background: 'rgba(255,107,43,0.1)', color: 'var(--orange)', borderRadius: 5, padding: '2px 7px' }}>{f}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--text-secondary)' }}>
                            {Object.entries(item.changes).map(([k, v]) => {
                              const label = FIELD_LABELS[k as keyof Laborer] ?? k;
                              const current = String((item.currentData as any)[k] ?? '—');
                              return <div key={k}><strong>{label}:</strong> {current} → {String(v)}</div>;
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {newItems.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#16a34a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  New Labour to Add ({newItems.length})
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>— check the box to confirm adding each new worker</span>
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#f0fdf4', position: 'sticky', top: 0 }}>
                      <tr>
                        {['Add?', 'Row #', 'Labour ID', 'Full Name', 'Designation', 'Bank Name'].map((h) => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#166534', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {newItems.map((item, idx) => {
                        const getName = (keys: string[]) => {
                          for (const k of keys) { const v = item.data[Object.keys(item.data).find(h => normalizeHeader(h) === k) ?? ''] ?? ''; if (v) return v; }
                          return '—';
                        };
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #dcfce7', background: item.confirmed ? 'rgba(34,197,94,0.04)' : 'transparent' }}>
                            <td style={{ padding: '7px 12px' }}>
                              <input
                                type="checkbox"
                                checked={item.confirmed}
                                onChange={() => toggleNewItemConfirm(idx)}
                                style={{ cursor: 'pointer', accentColor: '#16a34a' }}
                              />
                            </td>
                            <td style={{ padding: '7px 12px', color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>{item.rowIndex}</td>
                            <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>{item.labourId}</td>
                            <td style={{ padding: '7px 12px', fontWeight: 600 }}>{getName(['fullname', 'labourname', 'laborname', 'name'])}</td>
                            <td style={{ padding: '7px 12px' }}>{getName(['designation', 'role'])}</td>
                            <td style={{ padding: '7px 12px' }}>{getName(['bankname', 'bank'])}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {skipped.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#dc2626', marginBottom: 8 }}>Skipped / No Changes ({skipped.length})</div>
                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #fecaca', borderRadius: 10 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead style={{ background: '#fef2f2' }}>
                      <tr>
                        {['Row #', 'Labour ID', 'Reason'].map((h) => (
                          <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', color: '#9ca3af' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {skipped.map((s, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #fee2e2' }}>
                          <td style={{ padding: '6px 12px', color: '#9ca3af', fontFamily: 'monospace', fontSize: 11 }}>{s.rowIndex}</td>
                          <td style={{ padding: '6px 12px', color: '#dc2626', fontFamily: 'monospace' }}>{s.labourId || '—'}</td>
                          <td style={{ padding: '6px 12px', color: '#374151' }}>{s.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {preview.length === 0 && newItems.length === 0 && (
              <div style={{ padding: '16px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 13, color: '#92400e', marginBottom: 16 }}>
                No records to update or add. All rows were skipped. Please check your file and try again.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={resetUpload} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 13, cursor: 'pointer', color: 'var(--text-light)', fontWeight: 600 }}>
                Back
              </button>
              <button
                onClick={applyUpdates}
                disabled={applying || (preview.length === 0 && confirmedNewCount === 0)}
                style={{ ...addBtnStyle, background: '#4f46e5', opacity: (applying || (preview.length === 0 && confirmedNewCount === 0)) ? 0.6 : 1, cursor: applying ? 'wait' : ((preview.length === 0 && confirmedNewCount === 0) ? 'not-allowed' : 'pointer') }}
              >
                {applying ? 'Applying…' : `Apply (${preview.length} update${preview.length !== 1 ? 's' : ''}${confirmedNewCount > 0 ? ` + ${confirmedNewCount} new` : ''})`}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === 'done' && result && (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <CheckCircle2 size={44} style={{ color: '#16a34a', margin: '0 auto 14px', display: 'block' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Update Complete</div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Labour registry has been updated successfully.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)' }}>{result.processed}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Rows Processed</div>
              </div>
              <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#16a34a' }}>{result.updated}</div>
                <div style={{ fontSize: 11, color: '#166534', marginTop: 2 }}>Updated</div>
              </div>
              {result.added > 0 && (
                <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb' }}>{result.added}</div>
                  <div style={{ fontSize: 11, color: '#1e40af', marginTop: 2 }}>Added</div>
                </div>
              )}
              <div style={{ textAlign: 'center', padding: '14px 22px', borderRadius: 12, background: '#fef2f2', border: '1px solid #fecaca' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: '#dc2626' }}>{result.skipped}</div>
                <div style={{ fontSize: 11, color: '#9f1239', marginTop: 2 }}>Skipped</div>
              </div>
            </div>
            <button onClick={onDone} style={addBtnStyle}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
