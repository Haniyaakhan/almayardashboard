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
import jsPDF from 'jspdf';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type SheetType = 'labor' | 'vehicle' | 'equipment' | 'tunnel_employee' | 'tunnel_vehicle';

const TYPE_COLORS: Record<SheetType, { bg: string; color: string }> = {
  labor:           { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6' },
  vehicle:         { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  equipment:       { bg: 'rgba(34,197,94,0.1)',    color: '#16a34a' },
  tunnel_employee: { bg: 'rgba(168,85,247,0.12)',  color: '#7c3aed' },
  tunnel_vehicle:  { bg: 'rgba(234,88,12,0.12)',   color: '#ea580c' },
};

function getTimesheetDisplayName(value: string | undefined | null) {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/);
  if (parts.length > 2 || (parts.length > 1 && trimmed.length > 16)) {
    return parts[0];
  }
  return trimmed;
}

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
    // fallback: if sheet_type is present but not recognized, treat tunnel_vehicle as vehicle
    if (ts.sheet_type === 'tunnel_vehicle') return 'tunnel_vehicle' as SheetType;
    return 'labor';
  }

  function resolveName(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id ?? '';
      if (type === 'labor' || type === 'tunnel_employee')
      return laborerMap.get(id)?.full_name ?? ts.labor_name ?? ts.designation ?? '—';
      if (type === 'vehicle' || type === 'tunnel_vehicle')   return vehicleMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    if (type === 'equipment') return equipMap.get(id)?.name ?? ts.labor_name ?? ts.designation ?? '—';
    return '—';
  }

  function editLink(ts: (typeof timesheets)[0], type: SheetType): string {
    const id = ts.laborer_id;
    if (type === 'labor')     return `/timesheet?laborer=${id ?? ''}&ts=${ts.id}`;
    if (type === 'tunnel_employee') return `/tunnelemployeestimesheet?laborer=${id ?? ''}&ts=${ts.id}`;
      if (type === 'vehicle')   return `/vehicle-timesheet?vehicle=${id ?? ''}&ts=${ts.id}`;
      if (type === 'tunnel_vehicle') return `/tunnel-vehicle-timesheet?vehicle=${id ?? ''}&ts=${ts.id}`;
    if (type === 'equipment') return `/equipment-timesheet?equipment=${id ?? ''}&ts=${ts.id}`;
    return `/timesheet?ts=${ts.id}`;
  }

  function printLink(ts: (typeof timesheets)[0], type: SheetType): string {
    if (type === 'labor') return `/timesheet?ts=${ts.id}&print=1`;
    if (type === 'tunnel_employee') return `/tunnelemployeestimesheet?ts=${ts.id}&print=1`;
    if (type === 'vehicle') return `/vehicle-timesheet?ts=${ts.id}&print=1`;
    if (type === 'tunnel_vehicle') return `/tunnel-vehicle-timesheet?ts=${ts.id}&print=1`;
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
    const normalizedSearch = search.trim().toLowerCase();
    const laborerIdText = String(ts.laborer_id ?? '').toLowerCase();
    const idNumberText = (
      type === 'labor' || type === 'tunnel_employee'
        ? laborerMap.get(ts.laborer_id ?? '')?.id_number ?? ''
        : ''
    ).toLowerCase();
    const matchType   = typeFilter === 'All' || type === typeFilter;
    const matchStatus = statusFilter === 'All' || normalizedStatus === statusFilter;
    const matchMonth = monthFilter === 'All' || fullMonthLabel === monthFilter || MONTHS[ts.month] === monthFilter;
    const matchSearch = !search || name.includes(normalizedSearch) ||
      fullMonthLabel.toLowerCase().includes(normalizedSearch) ||
      designationText.includes(normalizedSearch) ||
      laborerIdText.includes(normalizedSearch) ||
      idNumberText.includes(normalizedSearch);
    return matchType && matchStatus && matchMonth && matchSearch;
  });

  const allMonthKeys = Array.from(new Set(timesheets.map(ts => `${MONTHS[ts.month]} ${ts.year}`)));
  const sortedMonthKeys = [...allMonthKeys].sort((a, b) => {
    const [aMonth, aYear] = a.split(' ');
    const [bMonth, bYear] = b.split(' ');
    const aIndex = MONTHS.indexOf(aMonth);
    const bIndex = MONTHS.indexOf(bMonth);
    const yearDiff = Number(bYear) - Number(aYear);
    return yearDiff || bIndex - aIndex;
  });
  const recentMonthKeys = new Set(sortedMonthKeys.slice(0, 1));
  const isArchiveSearch = search.trim() !== '' || typeFilter !== 'All' || statusFilter !== 'All' || monthFilter !== 'All';
  const displayedTimesheets = isArchiveSearch
    ? filtered
    : filtered.filter(ts => recentMonthKeys.has(`${MONTHS[ts.month]} ${ts.year}`));
  const archivedCount = filtered.filter(ts => !recentMonthKeys.has(`${MONTHS[ts.month]} ${ts.year}`)).length;

  const selectedMonthTimesheets = monthFilter === 'All'
    ? []
    : timesheets.filter(ts => {
        const type = resolveType(ts);
        return (
          `${MONTHS[ts.month]} ${ts.year}` === monthFilter &&
          (type === 'labor' || type === 'tunnel_employee')
        );
      });

  function handleDownloadDesignationHoursPdf() {
    if (monthFilter === 'All') {
      toast.error('Select a month to download designation hours summary');
      return;
    }

    if (!selectedMonthTimesheets.length) {
      toast.error(`No labour timesheets found for ${monthFilter}`);
      return;
    }

    const totalsByDesignation = new Map<string, number>();
    selectedMonthTimesheets.forEach(ts => {
      const type = resolveType(ts);
      const designation = type === 'labor'
        ? toDisplayDesignation(ts.designation || laborerMap.get(ts.laborer_id ?? '')?.designation || 'Unspecified')
        : (ts.designation || type.replace(/_/g, ' '));
      const current = totalsByDesignation.get(designation) ?? 0;
      totalsByDesignation.set(designation, current + Number(ts.total_actual ?? 0));
    });

    const rows = Array.from(totalsByDesignation.entries())
      .map(([designation, hours]) => ({ designation, hours }))
      .sort((a, b) => b.hours - a.hours || a.designation.localeCompare(b.designation));

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 12;
    const marginY = 12;
    let y = marginY;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Designation Hours Summary', marginX, y);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Month: ${monthFilter}`, marginX, y);
    const generatedText = `Generated: ${new Date().toLocaleDateString()}`;
    const generatedX = pageWidth - marginX - pdf.getTextWidth(generatedText);
    pdf.text(generatedText, generatedX, y);
    y += 8;

    const tableX = marginX;
    const tableWidth = pageWidth - marginX * 2;
    const colWidths = [tableWidth * 0.7, tableWidth * 0.3];
    const rowHeight = 9;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(tableX, y - 7, tableWidth, rowHeight, 'F');
    pdf.rect(tableX, y - 7, tableWidth, rowHeight);
    pdf.text('Designation', tableX + 2, y - 2);
    pdf.text('Total Hours', tableX + colWidths[0] + 2, y - 2);
    y += rowHeight;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    rows.forEach(({ designation, hours }) => {
      if (y + rowHeight > pageHeight - marginY) {
        pdf.addPage();
        y = marginY;
      }
      pdf.rect(tableX, y - 7, tableWidth, rowHeight);
      pdf.text(designation, tableX + 2, y - 2);
      pdf.text(hours.toFixed(2), tableX + colWidths[0] + 2, y - 2);
      y += rowHeight;
    });

    const filename = `designation-hours-${monthFilter.replace(/\s+/g, '_').toLowerCase()}.pdf`;
    pdf.save(filename);
    toast.success(`Downloaded designation hours summary for ${monthFilter}`);
  }

  if (tsLoading || labLoading || machLoading) return <PageSpinner />;

  const typeTabs: { label: string; value: 'All' | SheetType }[] = [
    { label: 'All',             value: 'All' },
    { label: 'Labor',           value: 'labor' },
    { label: 'Tunnel Employee', value: 'tunnel_employee' },
    { label: 'Tunnel Vehical',  value: 'tunnel_vehicle' },
    { label: 'Vehicle',         value: 'vehicle' },
    { label: 'Equipment',       value: 'equipment' },
  ];

  const statusTabs: { label: string; value: 'All' | 'approved' | 'draft' }[] = [
    { label: 'All',      value: 'All' },
    { label: 'Approved', value: 'approved' },
    { label: 'Draft',    value: 'draft' },
  ];

  async function handleApproveAll() {
    const draftTimesheets = displayedTimesheets.filter(
      ts => (ts.status ?? '').toLowerCase() === 'draft'
    );
    if (draftTimesheets.length === 0) {
      toast.error('No draft timesheets to approve');
      return;
    }
    try {
      for (const ts of draftTimesheets) {
        await approveTimesheet(ts.id);
      }
      refetch();
      toast.success(`Approved ${draftTimesheets.length} timesheet(s)`);
    } catch (err) {
      toast.error('Failed to approve some timesheets');
    }
  }

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { label: 'Labor',              href: '/timesheet',                 color: '#3b82f6' },
          { label: 'Tunnel 1',          href: '/tunnelemployeestimesheet',  color: '#7c3aed' },
          { label: 'Tunnel 2',          href: '/tunnelemployeestimesheet2', color: '#6d28d9' },
          { label: 'Vehicle',           href: '/vehicle-timesheet',         color: '#d97706' },
          { label: 'Tunnel Vehical',    href: '/tunnel-vehicle-timesheet',  color: '#ea580c' },
          { label: 'Equipment',         href: '/equipment-timesheet',       color: '#16a34a' },
        ] as const).map(btn => (
          <Link key={btn.href} href={btn.href} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#fff', border: 'none',
            padding: '6px 12px', borderRadius: 9,
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleDownloadDesignationHoursPdf}
              disabled={monthFilter === 'All' || !selectedMonthTimesheets.length}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: monthFilter !== 'All' && selectedMonthTimesheets.length ? 'var(--orange)' : '#d1d5db',
                color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 9,
                fontSize: '12.5px', fontWeight: 600,
                cursor: monthFilter !== 'All' && selectedMonthTimesheets.length ? 'pointer' : 'not-allowed',
                opacity: monthFilter !== 'All' && selectedMonthTimesheets.length ? 1 : 0.8,
                whiteSpace: 'nowrap',
              }}
            >
              <Download size={14} /> Designation Hours
            </button>
            <Link href="/operations/npc-invoice" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#10b981', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 9,
              fontSize: '12.5px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap',
            }}>
              <Download size={14} /> NPC Invoice
            </Link>
          </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {isArchiveSearch ? 'Filtered Timesheets' : 'Recent Timesheets'} ({displayedTimesheets.length})
          </div>
          {displayedTimesheets.some(ts => (ts.status ?? '').toLowerCase() === 'draft') && (
            <button onClick={handleApproveAll} style={{
              fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 6,
              border: 'none', cursor: 'pointer', background: 'var(--orange)', color: '#fff',
            }}>
              Approve All
            </button>
          )}
        </div>
        {displayedTimesheets.length === 0 ? (
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
                {displayedTimesheets.map(ts => {
                  const type = resolveType(ts);
                  const fullName = resolveName(ts, type);
                  const name = getTimesheetDisplayName(fullName);
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
                      <td style={{ padding: '10px 13px', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }} title={fullName}>
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
