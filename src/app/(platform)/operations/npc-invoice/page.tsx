'use client';
import React, { useMemo, useRef, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useApprovedLaborTimesheets } from '@/hooks/useOperationsTimesheets';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceRow {
  siNo: number;
  description: string;
  workers: number;
  workingHours: number;
  ratePerHour: number;
}

function getDesignation(raw: string | null | undefined) {
  const value = (raw ?? '').trim();
  if (!value) return 'Unspecified';
  const [base] = value.split('#');
  return base.trim() || 'Unspecified';
}

const MONTHS = [
  'JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE',
  'JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER',
];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function genInvoiceNo(year: number, month: number) {
  return `INV-${year}-${String(month + 1).padStart(2, '0')}`;
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function OperationsNpcInvoicePage() {
  const today = new Date();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [selMonth, setSelMonth] = useState(today.getMonth());
  const [selYear,  setSelYear]  = useState(today.getFullYear());
  const { timesheets, loading } = useApprovedLaborTimesheets(selMonth, selYear);

  const [billTo,         setBillTo]         = useState('NPC SPC');
  const [project,        setProject]        = useState('Railway Project');
  const [invoiceNo,      setInvoiceNo]      = useState(() => genInvoiceNo(today.getFullYear(), today.getMonth()));
  const [invoiceDate,    setInvoiceDate]    = useState(today.toISOString().slice(0, 10));
  const [vatPercent,     setVatPercent]     = useState(5);
  const [companyName,    setCompanyName]    = useState('ALMYAR UNITED TRADING LLC');
  const [npcSpcVatNo,    setNpcSpcVatNo]    = useState('OM1100123456');
  const [vatNo1,         setVatNo1]         = useState('OM1100123456');
  const [vatNo2,         setVatNo2]         = useState('OM1100123456');
  const [accountNo,      setAccountNo]      = useState('0123456789');
  const [iban,           setIban]           = useState('OM91000000000000123456');
  const [bankName,       setBankName]       = useState('Bank Muscat');

  const [rows,      setRows]      = useState<InvoiceRow[]>([]);
  const [designationRates, setDesignationRates] = useState<Record<string, number>>({});
  const [generated, setGenerated] = useState(false);

  const designationSummary = useMemo(() => {
    const map = new Map<string, { hours: number; ids: Set<string> }>();
    timesheets.forEach((ts) => {
      const key = getDesignation(ts.designation);
      if (!map.has(key)) map.set(key, { hours: 0, ids: new Set() });
      const b = map.get(key)!;
      b.hours += Number(ts.total_actual ?? 0);
      if (ts.laborer_id) b.ids.add(ts.laborer_id);
    });
    return Array.from(map.entries())
      .map(([designation, b]) => ({ designation, totalHours: b.hours, workers: b.ids.size }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [timesheets]);

  function generateInvoice() {
    setRows(
      designationSummary.map((ds, i) => ({
        siNo: i + 1,
        description: ds.designation,
        workers: ds.workers,
        workingHours: Number(ds.totalHours.toFixed(2)),
        ratePerHour: designationRates[ds.designation] ?? 0,
      }))
    );
    setInvoiceNo(genInvoiceNo(selYear, selMonth));
    setGenerated(true);
  }

  function updateDesignationRate(designation: string, rate: number) {
    setDesignationRates(prev => ({ ...prev, [designation]: rate }));
    setRows(prev => prev.map(r => r.description === designation ? { ...r, ratePerHour: rate } : r));
  }

  const subtotal   = rows.reduce((s, r) => s + r.workingHours * r.ratePerHour, 0);
  const vatAmount  = (subtotal * vatPercent) / 100;
  const grandTotal = subtotal + vatAmount;

  async function downloadPDF() {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    
    // Calculate ideal image height to fit on one A4 page
    const targetImgH = pageW * (pageH / pageW); // Maintain aspect ratio for A4
    const imgW = pageW;
    const imgH = pageW * (canvas.height / canvas.width);
    
    // Scale to fit on one page if content exceeds A4 height
    const scale = imgH > targetImgH ? targetImgH / imgH : 1;
    const finalW = imgW;
    const finalH = imgH * scale;
    
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, finalW, finalH);
    pdf.save(`${invoiceNo || 'invoice'}.pdf`);
  }

  function handleMonthChange(m: number) { setSelMonth(m); setInvoiceNo(genInvoiceNo(selYear, m)); setGenerated(false); }
  function handleYearChange(y: number)  { setSelYear(y);  setInvoiceNo(genInvoiceNo(y, selMonth)); setGenerated(false); }

  /* ── RENDER ──────────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '310px 1fr', gap: 18, alignItems: 'start' }}>

      {/* ═══ LEFT CONTROL PANEL ═══ */}
      <div className="npc-no-print" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Timesheet source */}
        <div style={panelSt}>
          <div style={panelTitleSt}>Timesheet Source</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={selMonth} onChange={e => handleMonthChange(Number(e.target.value))} style={{ ...inputSt, flex: 1 }}>
              {MONTHS_SHORT.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <input type="number" min={2020} max={2100} value={selYear}
              onChange={e => handleYearChange(Number(e.target.value) || today.getFullYear())}
              style={{ ...inputSt, width: 78 }} />
          </div>

          <div style={{ marginTop: 8 }}>
            {loading ? (
              <div style={mutedSt}>Loading timesheets…</div>
            ) : designationSummary.length === 0 ? (
              <div style={mutedSt}>No approved timesheets for {MONTHS_SHORT[selMonth]} {selYear}.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--thead-bg)' }}>
                    <th style={thSt}>Designation</th>
                    <th style={{ ...thSt, textAlign: 'right' }}>Workers</th>
                    <th style={{ ...thSt, textAlign: 'right' }}>Hours</th>
                    <th style={{ ...thSt, textAlign: 'right' }}>Rate (OMR)</th>
                  </tr>
                </thead>
                <tbody>
                  {designationSummary.map(ds => (
                    <tr key={ds.designation} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={tdSt}>{ds.designation}</td>
                      <td style={{ ...tdSt, textAlign: 'right' }}>{ds.workers}</td>
                      <td style={{ ...tdSt, textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{ds.totalHours.toFixed(2)}</td>
                      <td style={{ ...tdSt, textAlign: 'right', padding: '4px 6px' }}>
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={designationRates[ds.designation] ?? ''}
                          placeholder="0.000"
                          onChange={e => updateDesignationRate(ds.designation, Number(e.target.value) || 0)}
                          style={{
                            width: 84,
                            textAlign: 'right',
                            border: '1px solid var(--border2)',
                            borderRadius: 6,
                            padding: '3px 6px',
                            fontSize: 11,
                            background: 'var(--bg-canvas)',
                            color: 'var(--text-light)',
                            outline: 'none',
                            fontFamily: 'inherit',
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button onClick={generateInvoice} disabled={loading || !designationSummary.length}
            style={{ marginTop: 10, width: '100%', padding: '9px 0', borderRadius: 8, border: 'none',
              background: designationSummary.length ? 'var(--orange)' : 'var(--border2)',
              color: designationSummary.length ? '#fff' : 'var(--text-muted)',
              fontWeight: 700, fontSize: 13, cursor: designationSummary.length ? 'pointer' : 'default' }}>
            <RefreshCw size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Generate Invoice
          </button>
        </div>

        {/* Invoice settings */}
        <div style={panelSt}>
          <div style={panelTitleSt}>Invoice Settings</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {([
              ['Bill To',         billTo,       setBillTo],
              ['NPC SPC VAT NO',   npcSpcVatNo,  setNpcSpcVatNo],
              ['Company Name',    companyName,  setCompanyName],
              ['VAT NO (1)',      vatNo1,       setVatNo1],
              ['Project',         project,      setProject],
              ['Invoice No',      invoiceNo,    setInvoiceNo],
              ['Bank Name',       bankName,     setBankName],
              ['Account No',      accountNo,    setAccountNo],
              ['IBAN',            iban,         setIban],
            ] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
              <label key={lbl} style={labelSt}>{lbl}
                <input value={val} onChange={e => setter(e.target.value)} style={inputSt} />
              </label>
            ))}
            <label style={labelSt}>Invoice Date
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inputSt} />
            </label>
            <label style={labelSt}>VAT NO (2)
              <input value={vatNo2} onChange={e => setVatNo2(e.target.value)} style={inputSt} />
            </label>
            <label style={labelSt}>VAT %
              <input type="number" value={vatPercent} onChange={e => setVatPercent(Number(e.target.value) || 0)} style={inputSt} />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={downloadPDF} disabled={!generated || !rows.length}
            style={{ width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
              background: generated && rows.length ? '#1a1a2e' : 'var(--border2)',
              color: generated && rows.length ? '#fff' : 'var(--text-muted)',
              fontWeight: 700, fontSize: 13, cursor: generated && rows.length ? 'pointer' : 'default' }}>
            <Download size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
            Download PDF
          </button>
        </div>
      </div>

      {/* ═══ A4 INVOICE PREVIEW ═══ */}
      <div ref={invoiceRef} className="npc-invoice-area" style={{
        background: '#fff',
        width: '100%',
        maxWidth: 794,
        minHeight: 1123,
        padding: '0 56px 56px',
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: 13,
        color: '#111',
        boxShadow: '0 1px 18px rgba(0,0,0,0.12)',
        boxSizing: 'border-box',
        lineHeight: 1.5,
      }}>

        {/* ── LETTERHEAD SPACE ── */}
        <div style={{ height: 170 }} />

        {/* ── 1. TAX INVOICE – centered ── */}
        <div style={{ textAlign: 'center', marginBottom: 5 }}>
          <span style={{
            fontSize: 28, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', color: '#111',
            lineHeight: 1,
          }}>
            TAX INVOICE
          </span>
        </div>

        {/* ── 2. INVOICE DETAILS ── */}
        <div style={{ marginBottom: 12, fontFamily: '"Times New Roman", Times, serif', fontSize: 14, color: '#111', lineHeight: 1.2 }}>
          <div><span style={invoiceFieldLabelSt}>BILL TO :</span> {billTo || '—'}</div>
          <div><span style={invoiceFieldLabelSt}>NPC SPC VAT NO :</span> {npcSpcVatNo}</div>
          <div>{companyName || '—'}</div>
          <div><span style={invoiceFieldLabelSt}>VAT NO :</span> {vatNo1}</div>
          <div><span style={invoiceFieldLabelSt}>PROJECT :</span> {project || '—'}</div>
          <div><span style={invoiceFieldLabelSt}>INVOICE NO :</span> {invoiceNo || '—'}</div>
          <div><span style={invoiceFieldLabelSt}>INVOICE DATE :</span> {invoiceDate}</div>
          <div><span style={invoiceFieldLabelSt}>VAT NO :</span> {vatNo2}</div>
        </div>

        {/* ── 3. DESCRIPTION LINE ── */}
        <div style={{ marginBottom: 12, fontSize: 13, color: '#222' }}>
          For Service of work force For The Month Of{' '}
          <span style={{ fontWeight: 700 }}>{MONTHS[selMonth]} {selYear}</span>
        </div>

        {/* ── 4. MAIN TABLE ── */}
        {!generated || rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#aaa', fontSize: 13, border: '1px solid #ddd' }}>
            {loading ? 'Loading timesheets…' : 'Click "Generate Invoice" to populate rows from approved timesheets.'}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
              <thead>
                <tr style={{ background: '#111', color: '#fff' }}>
                  <th style={{ ...hdrCell, width: 40, textAlign: 'center', whiteSpace: 'nowrap' }}>SL NO</th>
                  <th style={{ ...hdrCell, textAlign: 'center' }}>Description</th>
                  <th style={{ ...hdrCell, textAlign: 'center', width: 90 }}>Working Hours</th>
                  <th style={{ ...hdrCell, textAlign: 'center', width: 90 }}>Rate (OMR)</th>
                  <th style={{ ...hdrCell, textAlign: 'center', width: 100 }}>Amount (OMR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const amount = row.workingHours * row.ratePerHour;
                  return (
                    <tr key={idx}>
                      <td style={{ ...bodyCell, textAlign: 'left', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>{row.siNo}</td>
                      <td style={{ ...bodyCell, textAlign: 'left', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {row.description}
                      </td>
                      <td style={{ ...bodyCell, textAlign: 'left', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(row.workingHours)}
                      </td>
                      <td style={{ ...bodyCell, textAlign: 'left', padding: '6px 6px', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(row.ratePerHour)}
                      </td>
                      <td style={{ ...bodyCell, textAlign: 'left', fontWeight: 600, background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── 5. TOTALS ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0, marginBottom: 12 }}>
              <table style={{ borderCollapse: 'collapse', width: 300 }}>
                <tbody>
                  <tr>
                    <td style={totLabelCell}>TOTAL</td>
                    <td style={totValueCell}>{fmtNum(subtotal)}</td>
                  </tr>
                  <tr>
                    <td style={totLabelCell}>VAT {vatPercent}%</td>
                    <td style={totValueCell}>{fmtNum(vatAmount)}</td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #111' }}>
                    <td style={{ ...totLabelCell, fontWeight: 700, paddingTop: 6, fontSize: 14 }}>TOTAL AMOUNT</td>
                    <td style={{ ...totValueCell, fontWeight: 700, paddingTop: 6, fontSize: 14 }}>{fmtNum(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── 6. FOOTER — Bank Details ── */}
        <div style={{ paddingTop: 8, marginTop: 'auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, color: '#333' }}>
            Please Remit Payment To:
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.35, color: '#222' }}>
            <div><strong>{companyName}</strong></div>
            <div>Account Number: {accountNo}</div>
            <div>IBAN: {iban}</div>
            <div>Bank: {bankName}</div>
          </div>
        </div>

      </div>
    </div>
  );
}

/* ── Shared control panel styles ─────────────────────────────────────── */
const panelSt: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: 12,
  padding: '14px', background: 'var(--bg-card)',
};
const panelTitleSt: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
};
const inputSt: React.CSSProperties = {
  width: '100%', border: '1px solid var(--border2)', background: 'var(--bg-canvas)',
  borderRadius: 7, padding: '7px 9px', fontSize: 12, color: 'var(--text-light)',
  outline: 'none', marginTop: 3, boxSizing: 'border-box',
};
const labelSt: React.CSSProperties = {
  fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column',
};
const thSt: React.CSSProperties = {
  padding: '5px 8px', fontSize: 10, fontWeight: 700,
  color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase',
};
const tdSt: React.CSSProperties = { padding: '5px 8px', fontSize: 11, color: 'var(--text-light)' };
const mutedSt: React.CSSProperties = { fontSize: 11, color: 'var(--text-muted)', padding: '6px 0' };

/* ── Invoice table cell styles ───────────────────────────────────────── */
const hdrCell: React.CSSProperties = {
  padding: '8px 8px', fontSize: 11, fontWeight: 700,
  border: '1px solid #333', letterSpacing: 0.3,
};
const bodyCell: React.CSSProperties = {
  padding: '6px 8px', fontSize: 12,
  border: '1px solid #ddd', color: '#111',
};
const totLabelCell: React.CSSProperties = {
  padding: '4px 12px 4px 0', fontSize: 13, color: '#333',
  textAlign: 'left', borderBottom: '1px solid #eee',
};
const totValueCell: React.CSSProperties = {
  padding: '4px 0', fontSize: 13, color: '#111',
  textAlign: 'right', borderBottom: '1px solid #eee',
  fontVariantNumeric: 'tabular-nums',
};
const invoiceFieldLabelSt: React.CSSProperties = {
  fontFamily: '"Times New Roman", Times, serif',
  fontSize: 14, fontWeight: 700, color: '#111',
  display: 'inline-block', minWidth: 150,
};
