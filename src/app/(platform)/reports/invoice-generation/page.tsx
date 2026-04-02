'use client';
import React, { useRef, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface InvoiceRow {
  id: string;
  siNo: number;
  description: string;
  quantity: number;
  rate: number;
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function InvoiceGenerationPage() {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  const [billTo, setBillTo] = useState('');
  const [npcSpcVatNo, setNpcSpcVatNo] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNo1, setVatNo1] = useState('');
  const [project, setProject] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [vatNo2, setVatNo2] = useState('');
  const [vatPercent, setVatPercent] = useState(5);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [iban, setIban] = useState('');
  const [description, setDescription] = useState('');

  const [rows, setRows] = useState<InvoiceRow[]>([
    { id: '1', siNo: 1, description: '', quantity: 0, rate: 0 },
  ]);

  function addRow() {
    const newId = String(Math.max(...rows.map(r => Number(r.id) || 0)) + 1);
    setRows([
      ...rows,
      { id: newId, siNo: rows.length + 1, description: '', quantity: 0, rate: 0 },
    ]);
  }

  function updateRow(id: string, field: keyof InvoiceRow, value: any) {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function deleteRow(id: string) {
    if (rows.length === 1) return;
    const updated = rows.filter(r => r.id !== id);
    setRows(updated.map((r, idx) => ({ ...r, siNo: idx + 1 })));
  }

  const subtotal = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.rate) || 0), 0);
  const vatAmount = (subtotal * (Number(vatPercent) || 0)) / 100;
  const grandTotal = subtotal + vatAmount;

  async function downloadPDF() {
    if (!invoiceRef.current) return;
    const canvas = await html2canvas(invoiceRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = pageW * (canvas.height / canvas.width);
    const scale = imgH > pageH ? pageH / imgH : 1;

    pdf.addImage(canvas.toDataURL('image/png', 0.98), 'PNG', 0, 0, imgW, imgH * scale);
    pdf.save(`Invoice_${invoiceNo || new Date().getTime()}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Invoice Generation" subtitle="Manual invoice creation with left settings and A4 preview" />

      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: 18, alignItems: 'start' }}>
        {/* LEFT PANEL */}
        <div className="space-y-3">
          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Invoice Details</h2>
            <div className="grid grid-cols-1 gap-3">
              {([
                ['Invoice No', invoiceNo, setInvoiceNo],
                ['Bill To', billTo, setBillTo],
                ['NPC SPC VAT NO', npcSpcVatNo, setNpcSpcVatNo],
                ['Company Name', companyName, setCompanyName],
                ['VAT NO (1)', vatNo1, setVatNo1],
                ['Project', project, setProject],
                ['VAT NO (2)', vatNo2, setVatNo2],
              ] as [string, string, (v: string) => void][]).map(([label, value, setter]) => (
                <label key={label} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                  <input
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </label>
              ))}
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Invoice Date
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Invoice Description</h2>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter invoice description (e.g., 'For Service of work force For The Month Of...')"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              rows={3}
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', resize: 'vertical' }}
            />
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Payment Details</h2>
            <div className="grid grid-cols-1 gap-3">
              {([
                ['Bank Name', bankName, setBankName],
                ['Account No', accountNo, setAccountNo],
                ['IBAN', iban, setIban],
              ] as [string, string, (v: string) => void][]).map(([label, value, setter]) => (
                <label key={label} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {label}
                  <input
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </label>
              ))}
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                VAT %
                <input
                  type="number"
                  value={vatPercent}
                  onChange={e => setVatPercent(Number(e.target.value) || 0)}
                  className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button onClick={addRow} icon={<Plus size={14} />}>Add Row</Button>
            <Button onClick={downloadPDF} icon={<Download size={14} />}>Save PDF</Button>
          </div>
        </div>

        {/* A4 PREVIEW */}
        <div>
          <div
            ref={invoiceRef}
            style={{
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
            }}
          >
            {/* LETTERHEAD SPACE */}
            <div style={{ height: 170 }} />

            {/* TITLE */}
            <div style={{ textAlign: 'center', marginBottom: 5 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  color: '#111',
                  lineHeight: 1,
                }}
              >
                TAX INVOICE
              </span>
            </div>

            {/* INVOICE DETAILS */}
            <div style={{ marginBottom: 12, fontFamily: '"Times New Roman", Times, serif', fontSize: 14, color: '#111', lineHeight: 1.2 }}>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>BILL TO :</span> {billTo || '—'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>NPC SPC VAT NO :</span> {npcSpcVatNo || '—'}
              </div>
              <div>{companyName || '—'}</div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>VAT NO :</span> {vatNo1 || '—'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>PROJECT :</span> {project || '—'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>INVOICE NO :</span> {invoiceNo || '—'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>INVOICE DATE :</span> {invoiceDate || '—'}
              </div>
              <div>
                <span style={{ fontWeight: 700, display: 'inline-block', minWidth: 150 }}>VAT NO :</span> {vatNo2 || '—'}
              </div>
            </div>

            {/* DESCRIPTION */}
            {description && (
              <div style={{ marginBottom: 12, fontSize: 13, color: '#222' }}>
                {description}
              </div>
            )}

            {/* MAIN TABLE */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
              <thead>
                <tr style={{ background: '#111', color: '#fff' }}>
                  <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #333', textAlign: 'center', width: 40 }}>SL NO</th>
                  <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #333', textAlign: 'center' }}>Description</th>
                  <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #333', textAlign: 'center', width: 90 }}>Quantity</th>
                  <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #333', textAlign: 'center', width: 90 }}>Rate (OMR)</th>
                  <th style={{ padding: '8px 8px', fontSize: 11, fontWeight: 700, border: '1px solid #333', textAlign: 'center', width: 100 }}>Amount (OMR)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const amount = (Number(row.quantity) || 0) * (Number(row.rate) || 0);
                  return (
                    <tr key={row.id}>
                      <td style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', textAlign: 'center', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {row.siNo}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', textAlign: 'left', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {row.description}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', textAlign: 'right', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(Number(row.quantity) || 0)}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 12, border: '1px solid #ddd', textAlign: 'right', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(Number(row.rate) || 0)}
                      </td>
                      <td style={{ padding: '6px 8px', fontSize: 12, fontWeight: 600, border: '1px solid #ddd', textAlign: 'right', background: idx % 2 !== 0 ? '#f9f9f9' : '#fff' }}>
                        {fmtNum(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* TOTALS */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 0, marginBottom: 12 }}>
              <table style={{ borderCollapse: 'collapse', width: 300 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '4px 12px 4px 0', fontSize: 13, color: '#333', textAlign: 'left', borderBottom: '1px solid #eee' }}>TOTAL</td>
                    <td style={{ padding: '4px 0', fontSize: 13, color: '#111', textAlign: 'right', borderBottom: '1px solid #eee', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '4px 12px 4px 0', fontSize: 13, color: '#333', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                      VAT {vatPercent}%
                    </td>
                    <td style={{ padding: '4px 0', fontSize: 13, color: '#111', textAlign: 'right', borderBottom: '1px solid #eee', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(vatAmount)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '2px solid #111' }}>
                    <td style={{ padding: '6px 12px 6px 0', fontSize: 14, fontWeight: 700, color: '#333', textAlign: 'left' }}>TOTAL AMOUNT</td>
                    <td style={{ padding: '6px 0', fontSize: 14, fontWeight: 700, color: '#111', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtNum(grandTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* FOOTER */}
            <div style={{ paddingTop: 8, marginTop: 8, marginBottom: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, color: '#333' }}>
                Please Remit Payment To:
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.35, color: '#222' }}>
                <div>
                  <strong>{companyName || 'Company Name'}</strong>
                </div>
                <div>Account Number: {accountNo || '—'}</div>
                <div>IBAN: {iban || '—'}</div>
                <div>Bank: {bankName || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROWS EDITOR */}
      <Card>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Invoice Line Items</h2>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f6f6f6' }}>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>SL No</th>
                <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>Description</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)', width: 100 }}>Quantity</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)', width: 100 }}>Rate (OMR)</th>
                <th style={{ padding: '8px', textAlign: 'right', fontWeight: 700, borderBottom: '1px solid var(--border)', width: 100 }}>Amount</th>
                <th style={{ padding: '8px', textAlign: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)', width: 40 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const amount = (Number(row.quantity) || 0) * (Number(row.rate) || 0);
                return (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{row.siNo}</td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="text"
                        value={row.description}
                        onChange={e => updateRow(row.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 rounded text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        step="0.01"
                        value={row.quantity || ''}
                        onChange={e => updateRow(row.id, 'quantity', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded text-sm outline-none text-right"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td style={{ padding: '8px' }}>
                      <input
                        type="number"
                        step="0.001"
                        value={row.rate || ''}
                        onChange={e => updateRow(row.id, 'rate', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1 rounded text-sm outline-none text-right"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{fmtNum(amount)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button
                        onClick={() => deleteRow(row.id)}
                        disabled={rows.length === 1}
                        style={{
                          background: rows.length === 1 ? '#ddd' : '#fee2e2',
                          color: rows.length === 1 ? '#999' : '#dc2626',
                          border: 'none',
                          borderRadius: 4,
                          padding: '4px 6px',
                          cursor: rows.length === 1 ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          fontSize: 12,
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
