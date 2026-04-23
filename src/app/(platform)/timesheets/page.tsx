'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useLaborers } from '@/hooks/useLaborers';
import { useMachines } from '@/hooks/useMachines';
import { useTimesheetHistory, approveTimesheet, deleteTimesheet } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { timesheetStatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { Plus, Search, Trash2, Download } from 'lucide-react';
import { toDisplayDesignation } from '@/lib/designation';
import { exportToCSV } from '@/lib/exportUtils';
import jsPDF from 'jspdf';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type SheetType = 'labor' | 'vehicle' | 'equipment';

const TYPE_COLORS: Record<SheetType, { bg: string; color: string }> = {
  labor:     { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
  vehicle:   { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  equipment: { bg: 'rgba(34,197,94,0.1)',    color: '#16a34a' },
};

export default function TimesheetsPage() {
  const { timesheets, loading: tsLoading, refetch } = useTimesheetHistory();
  const { laborers, loading: labLoading } = useLaborers(false);
  const { machines, loading: machLoading } = useMachines();
  const toast = useToast();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<'All' | SheetType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'approved' | 'draft'>('All');
  const [monthFilter, setMonthFilter] = useState('All');
  const [search, setSearch] = useState('');

  const laborerMap  = new Map(laborers.map(l => [l.id, l]));
  const vehicleMap  = new Map(machines.filter(m => m.category === 'vehicle').map(m => [m.id, m]));
  const equipMap    = new Map(machines.filter(m => m.category === 'equipment').map(m => [m.id, m]));
  const laborerIds  = new Set(laborers.map(l => l.id));
  const vehicleIds  = new Set(machines.filter(m => m.category === 'vehicle').map(m => m.id));
  const equipIds    = new Set(machines.filter(m => m.category === 'equipment').map(m => m.id));

  function resolveType(ts: (typeof timesheets)[0]): SheetType {
    if (ts.sheet_type) return ts.sheet_type as SheetType;
    const id = ts.laborer_id ?? '';
    if (laborerIds.has(id)) return 'labor';
    if (vehicleIds.has(id)) return 'vehicle';
    if (equipIds.has(id))   return 'equipment';
    return 'labor';
  }

  function resolveName(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id ?? '';
    if (type === 'labor')     return laborerMap.get(id)?.full_name ?? ts.labor_name ?? ts.designation ?? '—';
    if (type === 'vehicle')   return vehicleMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    if (type === 'equipment') return equipMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    return '—';
  }

  function editLink(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id;
    if (type === 'labor')     return `/timesheet?laborer=${id ?? ''}&ts=${ts.id}`;
    if (type === 'vehicle')   return `/vehicle-timesheet?vehicle=${id ?? ''}&ts=${ts.id}`;
    if (type === 'equipment') return `/equipment-timesheet?equipment=${id ?? ''}&ts=${ts.id}`;
    return `/timesheet?ts=${ts.id}`;
  }

  function printLink(ts: (typeof timesheets)[0], type: SheetType): string {
    if (type === 'labor') return `/timesheet?ts=${ts.id}&print=1`;
    if (type === 'vehicle') return `/vehicle-timesheet?ts=${ts.id}&print=1`;
    if (type === 'equipment') return `/equipment-timesheet?ts=${ts.id}&print=1`;
    return `/timesheet?ts=${ts.id}&print=1`;
  }

  const monthOptions = Array.from(
    new Set(timesheets.map(ts => `${MONTHS[ts.month]} ${ts.year}`))
  );
  const visibleMonthOptions = monthOptions.length > 0 ? monthOptions : MONTHS;

  const filtered = timesheets.filter(ts => {
    const type = resolveType(ts);
    const name = resolveName(ts, type).toLowerCase();
    const designationText = (
      type === 'labor'
        ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
        : (ts.designation || '')
    ).toLowerCase();
    const normalizedStatus = (ts.status ?? '').toLowerCase();
    const fullMonthLabel = `${MONTHS[ts.month]} ${ts.year}`;
    const normalizedSearch = search.toLowerCase();
    const matchType   = typeFilter === 'All' || type === typeFilter;
    const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter;
    const matchMonth = monthFilter === 'All' || fullMonthLabel === monthFilter || MONTHS[ts.month] === monthFilter;
    const matchSearch = !search || name.includes(normalizedSearch) ||
      fullMonthLabel.toLowerCase().includes(normalizedSearch) ||
      designationText.includes(normalizedSearch);
    return matchType && matchStatus && matchMonth && matchSearch;
  });

  function handleDownloadCurrentView() {
    if (!filtered.length) {
      toast.error('No timesheets to download for current filters');
      return;
    }

    const approvedCount = filtered.filter(ts => (ts.status ?? '').toLowerCase() === 'approved').length;
    const draftCount = filtered.filter(ts => (ts.status ?? '').toLowerCase() === 'draft').length;
    const totalHours = filtered.reduce((sum, ts) => sum + Number(ts.total_actual ?? 0), 0);

    const headers = ['Type', 'Name', 'Designation / ID', 'Month', 'Year', 'Total Hours', 'Status'];
    const rows: string[][] = filtered.map((ts) => {
      const type = resolveType(ts);
      const name = resolveName(ts, type);
      const designation = type === 'labor'
        ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
        : (ts.designation || '—');

      return [
        type,
        name,
        designation,
        MONTHS[ts.month],
        String(ts.year),
        String(Number(ts.total_actual ?? 0)),
        (ts.status ?? 'draft').toUpperCase(),
      ];
    });

    rows.push(
      ['', '', '', '', '', '', ''],
      ['Summary', 'Selected Timesheets', String(filtered.length), '', '', '', ''],
      ['Summary', 'Approved', String(approvedCount), '', '', '', ''],
      ['Summary', 'Draft', String(draftCount), '', '', '', ''],
      ['Summary', 'Total Hours', String(totalHours), '', '', '', ''],
      ['Summary', 'Type Filter', typeFilter, '', '', '', ''],
      ['Summary', 'Status Filter', statusFilter, '', '', '', ''],
      ['Summary', 'Month Filter', monthFilter, '', '', '', ''],
      ['Summary', 'Search Filter', search || 'All', '', '', '', ''],
    );

    const dateStamp = new Date().toISOString().slice(0, 10);
    exportToCSV(headers, rows, `timesheets-current-view-${dateStamp}`);
    toast.success('Downloaded current timesheet view');
  }

  function handleDownloadCurrentViewPdf() {
    if (!filtered.length) {
      toast.error('No timesheets to download for current filters');
      return;
    }

    const approvedCount = filtered.filter(ts => (ts.status ?? '').toLowerCase() === 'approved').length;
    const draftCount = filtered.filter(ts => (ts.status ?? '').toLowerCase() === 'draft').length;
    const totalHours = filtered.reduce((sum, ts) => sum + Number(ts.total_actual ?? 0), 0);

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 8;
    const marginTop = 10;
    let y = marginTop;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Timesheets - Current Filtered View by Designation', marginX, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
    y += 5;
    pdf.text(`Selected: ${filtered.length} | Approved: ${approvedCount} | Draft: ${draftCount} | Total Hours: ${totalHours.toFixed(2)}`, marginX, y);
    y += 5;
    pdf.text(`Filters -> Type: ${typeFilter}, Status: ${statusFilter}, Month: ${monthFilter}, Search: ${search || 'All'}`, marginX, y);
    y += 7;

    const headers = ['Type', 'Name', 'Designation / ID', 'Month', 'Year', 'Hours', 'Status'];
    const colWidths = [22, 60, 72, 28, 16, 18, 24];
    const tableWidth = colWidths.reduce((sum, w) => sum + w, 0);
    const rowHeight = 6;

    // Group timesheets by designation
    const groupedByDesignation = new Map<string, typeof filtered>();
    filtered.forEach((ts) => {
      const type = resolveType(ts);
      const designation = type === 'labor'
        ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
        : (ts.designation || '—');
      
      if (!groupedByDesignation.has(designation)) {
        groupedByDesignation.set(designation, []);
      }
      groupedByDesignation.get(designation)!.push(ts);
    });

    // Sort designations alphabetically
    const sortedDesignations = Array.from(groupedByDesignation.keys()).sort();

    function drawTableHeader() {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y - 4.5, tableWidth, rowHeight, 'F');
      pdf.rect(marginX, y - 4.5, tableWidth, rowHeight);

      let x = marginX;
      headers.forEach((header, idx) => {
        pdf.text(header, x + 1, y - 0.5);
        x += colWidths[idx];
        if (idx < colWidths.length - 1) {
          pdf.line(x, y - 4.5, x, y + 1.5);
        }
      });
      y += rowHeight;
    }

    function ensurePageSpace(requiredHeight: number = 8) {
      if (y + requiredHeight > pageHeight - 10) {
        pdf.addPage();
        y = marginTop;
      }
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);

    // Process each designation group
    sortedDesignations.forEach((designation, designationIdx) => {
      const groupedRows = groupedByDesignation.get(designation) || [];

      // Draw designation header
      ensurePageSpace(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`${designation} (${groupedRows.length} items)`, marginX, y);
      pdf.setTextColor(0, 0, 0);
      y += 5;

      // Draw table header for this group
      drawTableHeader();

      // Draw rows for this group
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);

      groupedRows.forEach((ts) => {
        const type = resolveType(ts);
        const name = resolveName(ts, type);
        const designationCell = type === 'labor'
          ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
          : (ts.designation || '—');

        const rowValues = [
          type,
          name,
          designationCell,
          MONTHS[ts.month],
          String(ts.year),
          Number(ts.total_actual ?? 0).toFixed(2),
          (ts.status ?? 'draft').toUpperCase(),
        ];

        ensurePageSpace(6);

        pdf.rect(marginX, y - 4.5, tableWidth, rowHeight);
        let x = marginX;
        rowValues.forEach((cell, idx) => {
          const safeCell = String(cell ?? '');
          const lines = pdf.splitTextToSize(safeCell, colWidths[idx] - 2) as string[];
          pdf.text(lines[0] || '-', x + 1, y - 0.5);

          x += colWidths[idx];
          if (idx < colWidths.length - 1) {
            pdf.line(x, y - 4.5, x, y + 1.5);
          }
        });
        y += rowHeight;
      });

      // Add spacing after each group
      if (designationIdx < sortedDesignations.length - 1) {
        y += 3;
      }
    });

    // Draw summary at the end
    ensurePageSpace(12);
    y += 3;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Summary', marginX, y);
    y += 4;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const summaryRows = [
      [`Total Selected Timesheets:`, String(filtered.length)],
      [`Approved:`, String(approvedCount)],
      [`Draft:`, String(draftCount)],
      [`Total Hours:`, totalHours.toFixed(2)],
    ];

    summaryRows.forEach(([label, value]) => {
      pdf.text(label, marginX, y);
      pdf.text(value, marginX + 80, y);
      y += 4;
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    pdf.save(`timesheets-by-designation-${dateStamp}.pdf`);
    toast.success('Downloaded timesheet PDF organized by designation');
  }

  if (tsLoading || labLoading || machLoading) return <PageSpinner />;

  const typeTabs: { label: string; value: 'All' | SheetType }[] = [
    { label: 'All',       value: 'All' },
    { label: 'Labor',     value: 'labor' },
    { label: 'Vehicle',   value: 'vehicle' },
    { label: 'Equipment', value: 'equipment' },
  ];

  const statusTabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All',      value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft',    value: 'draft' },
  ];

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { label: 'New Labor Timesheet',     href: '/timesheet',           color: '#3b82f6' },
          { label: 'New Vehicle Timesheet',   href: '/vehicle-timesheet',   color: '#d97706' },
          { label: 'New Equipment Timesheet', href: '/equipment-timesheet', color: '#16a34a' },
        ] as const).map(btn => (
          <Link key={btn.href} href={btn.href} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#fff', border: 'none',
            padding: '8px 15px', borderRadius: 9,
            fontSize: '12.5px', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', whiteSpace: 'nowrap',
            background: btn.color,
          }}>
            <Plus size={13} /> {btn.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeTabs.map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              border: typeFilter === t.value ? '1px solid var(--navy)' : '1px solid var(--border2)',
              background: typeFilter === t.value ? 'var(--navy)' : 'var(--bg-card)',
              color: typeFilter === t.value ? '#fff' : 'var(--text-light)',
            }}>{t.label}</button>
          ))}
          <span style={{ color: 'var(--border2)', margin: '0 4px' }}>|</span>
          {statusTabs.map(t => (
            <button key={t.value} onClick={() => setStatusFilter(t.value)} style={{
              fontSize: 12, fontWeight: 500, padding: '5px 13px', borderRadius: 8, cursor: 'pointer',
              border: statusFilter === t.value ? '1px solid var(--orange)' : '1px solid var(--border2)',
              background: statusFilter === t.value ? 'var(--orange)' : 'var(--bg-card)',
              color: statusFilter === t.value ? '#fff' : 'var(--text-light)',
            }}>{t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadCurrentView}
            disabled={!filtered.length}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: filtered.length ? 'var(--navy)' : '#d1d5db',
              color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 9,
              fontSize: '12.5px', fontWeight: 600,
              cursor: filtered.length ? 'pointer' : 'not-allowed',
              opacity: filtered.length ? 1 : 0.8,
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={handleDownloadCurrentViewPdf}
            disabled={!filtered.length}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: filtered.length ? 'var(--orange)' : '#d1d5db',
              color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 9,
              fontSize: '12.5px', fontWeight: 600,
              cursor: filtered.length ? 'pointer' : 'not-allowed',
              opacity: filtered.length ? 1 : 0.8,
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={14} /> PDF
          </button>
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, month, or designation..."
              style={{ border: 'none', background: 'transparent', fontSize: '12.5px', color: 'var(--text-light)', width: 190, outline: 'none' }} />
          </div>
          <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{
            fontSize: 12, fontWeight: 500, padding: '7px 13px', borderRadius: 9,
            border: '1px solid var(--border2)', background: 'var(--bg-card)',
            color: 'var(--text-light)', cursor: 'pointer', outline: 'none',
          }}>
            <option value="All">All Months</option>
            {visibleMonthOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 13, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          All Timesheets ({filtered.length})
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No timesheets found. Use the buttons above to create one.
          </div>
        ) : (
          <div style={{ maxHeight: 480, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  {['Type', 'Name', 'ID / Reg No', 'Month', 'Total Hours', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 13px', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left', letterSpacing: '0.5px', textTransform: 'uppercase', background: 'var(--thead-bg)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ts => {
                  const type = resolveType(ts);
                  const name = resolveName(ts, type);
                  const colors = TYPE_COLORS[type];
                  const normalizedStatus = (ts.status ?? '').toLowerCase();
                  const isLocked = normalizedStatus === 'approved';
                  return (
                    <tr key={ts.id}
                      style={{ borderBottom: '1px solid #f4f1ed', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 9px', borderRadius: 6,
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          background: colors.bg, color: colors.color,
                        }}>{type}</span>
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {name}
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)', fontFamily: 'monospace', fontWeight: 600 }}>
                        {type === 'labor'
                          ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
                          : (ts.designation || '—')}
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: 12, color: 'var(--text-light)' }}>
                        {MONTHS[ts.month]} {ts.year}
                      </td>
                      <td style={{ padding: '10px 13px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ts.total_actual} hrs
                      </td>
                      <td style={{ padding: '10px 13px' }}>{timesheetStatusBadge(ts.status)}</td>
                      <td style={{ padding: '10px 13px' }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={printLink(ts, type)} target="_blank" rel="noreferrer" style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            border: 'none', background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                            textDecoration: 'none',
                          }}>PRINT</Link>
                          <Link href={editLink(ts, type)} style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            border: '1px solid var(--border2)', background: 'var(--bg-card)',
                            color: isLocked ? 'var(--text-muted)' : 'var(--text-light)',
                            textDecoration: 'none',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.5 : 1,
                            pointerEvents: isLocked ? 'none' : 'auto',
                          }}>EDIT</Link>
                          {!isLocked && (
                            <button onClick={() => setConfirmDeleteId(ts.id)} style={{
                              fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                              border: 'none', cursor: 'pointer',
                              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}><Trash2 size={11} /> DEL</button>
                          )}
                          <button onClick={async () => {
                            if (isLocked) return;
                            await approveTimesheet(ts.id);
                            refetch(); toast.success('Timesheet approved');
                          }} style={{
                            fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 6,
                            border: 'none', cursor: isLocked ? 'default' : 'pointer',
                            background: isLocked ? '#d1d5db' : 'var(--orange)',
                            color: isLocked ? '#6b7280' : '#fff',
                            opacity: isLocked ? 0.7 : 1,
                          }}>{isLocked ? 'APPROVED' : 'APPROVE'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {confirmDeleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 14, padding: '28px 32px', width: 340,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <Trash2 size={32} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Delete Timesheet?</p>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 24 }}>This action cannot be undone. All entries will be permanently removed.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{
                padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border2)', background: 'var(--bg-card)', color: 'var(--text-light)',
              }}>Cancel</button>
              <button onClick={async () => {
                const selected = timesheets.find(ts => ts.id === confirmDeleteId);
                const selectedStatus = (selected?.status ?? '').toLowerCase();
                if (selectedStatus === 'approved') {
                  setConfirmDeleteId(null);
                  toast.error('Approved timesheets cannot be deleted');
                  return;
                }
                const err = await deleteTimesheet(confirmDeleteId);
                setConfirmDeleteId(null);
                if (err) { toast.error('Failed to delete timesheet'); return; }
                refetch(); toast.success('Timesheet deleted');
              }} style={{
                padding: '8px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: 'none', background: '#ef4444', color: '#fff',
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
