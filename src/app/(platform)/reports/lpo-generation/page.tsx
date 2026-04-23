'use client';

import React, { useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Plus, Printer, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LpoItemRow {
  id: string;
  slNo: number;
  itemNo: string;
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
}

function fmtAmount(n: number) {
  return Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function toWordsUnder1000(n: number): string {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

  const num = Math.floor(n);
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const t = Math.floor(num / 10);
    const r = num % 10;
    return r ? `${tens[t]} ${ones[r]}` : tens[t];
  }
  const h = Math.floor(num / 100);
  const r = num % 100;
  return r ? `${ones[h]} hundred ${toWordsUnder1000(r)}` : `${ones[h]} hundred`;
}

function numberToWords(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  const whole = Math.floor(safe);
  const frac = Math.round((safe - whole) * 1000);

  const parts: string[] = [];
  const million = Math.floor(whole / 1000000);
  const thousand = Math.floor((whole % 1000000) / 1000);
  const rest = whole % 1000;

  if (million) parts.push(`${toWordsUnder1000(million)} million`);
  if (thousand) parts.push(`${toWordsUnder1000(thousand)} thousand`);
  if (rest || !parts.length) parts.push(toWordsUnder1000(rest));

  const wholeWords = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (!frac) return `${wholeWords} riyals only`;
  return `${wholeWords} riyals and ${frac} baiza only`;
}

function formatDateDisplay(dateValue: string) {
  if (!dateValue) return '-';
  const parts = dateValue.split('-');
  if (parts.length !== 3) return dateValue;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function LpoGenerationPage() {
  const previewRef = useRef<HTMLDivElement>(null);

  const [companyName, setCompanyName] = useState('ALMAYAR UNITED TRADING LLC');
  const [companyAddress, setCompanyAddress] = useState('FALAJ ALQABAIL- SOHAR, SULTANATE OF OMAN');
  const [companyCrNo, setCompanyCrNo] = useState('1236561');
  const [companyPhone, setCompanyPhone] = useState('+96895174800');
  const [transitionText, setTransitionText] = useState('With reference to the above we are pleased to place out order to supply the following');

  const [poNumber, setPoNumber] = useState('AMU/EFR/LPO12355/25');
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));

  const [vendorName, setVendorName] = useState('AFAQ AL SIYH AL-SHARQI TRADING');
  const [vendorAddress, setVendorAddress] = useState('Muscat, Sultanate of Oman');
  const [vendorContact, setVendorContact] = useState('+96899007156');
  const [vendorVat, setVendorVat] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');

  const [buyerName, setBuyerName] = useState('ALMAYAR UNITED TRADING LLC');
  const [buyerAddress, setBuyerAddress] = useState('Sohar, Sultanate of Oman');
  const [buyerContact, setBuyerContact] = useState('');
  const [buyerVat, setBuyerVat] = useState('OM1100bah');
  const [buyerEmail, setBuyerEmail] = useState('info@almayarunited.com');

  const [items, setItems] = useState<LpoItemRow[]>([
    {
      id: '1',
      slNo: 1,
      itemNo: '1',
      description: '58 SEATOR BUS # 7473 WK WITH DRIVER',
      unit: 'Month',
      qty: 1,
      unitPrice: 1300,
    },
  ]);

  const [discount, setDiscount] = useState(0);
  const [vatPercent, setVatPercent] = useState(5);

  const [deliveryLocation, setDeliveryLocation] = useState('Buraimi');
  const [completionDate, setCompletionDate] = useState('Six month validity from start date');

  const [termsText, setTermsText] = useState(
    [
      'Working Hours: 10 Hours per day and 26 working days in a month.',
      'Mobilization and demobilization shall be included in monthly rent.',
      'Payment: 60 days from invoice date.',
      'Contract validity: Six month validity and can be renewed based on requirement.',
      'Client (NPC) will provide diesel, food and accommodation as per contract.',
      'Contractor shall submit signed timesheets monthly for billing.',
      'If breakdown exceeds 3 days, replacement bus must be arranged by vendor.',
      'Safety violations and penalties will be deducted from monthly invoice as per project policy.',
    ].join('\n')
  );

  const [signatureName, setSignatureName] = useState('Baraa Ismail Kadhim');
  const [signatureDesignation, setSignatureDesignation] = useState('Managing Director');
  const [signatureSideLabel, setSignatureSideLabel] = useState('Vendor');

  const normalizedItems = useMemo(() => {
    return items.map((row, idx) => {
      const qty = Number(row.qty) || 0;
      const unitPrice = Number(row.unitPrice) || 0;
      return {
        ...row,
        slNo: idx + 1,
        qty,
        unitPrice,
        total: qty * unitPrice,
      };
    });
  }, [items]);

  const subtotal = useMemo(() => normalizedItems.reduce((sum, row) => sum + row.total, 0), [normalizedItems]);
  const taxableAmount = Math.max(0, subtotal - (Number(discount) || 0));
  const vatAmount = taxableAmount * ((Number(vatPercent) || 0) / 100);
  const grandTotal = taxableAmount + vatAmount;

  const terms = useMemo(
    () => termsText.split('\n').map((line) => line.trim()).filter(Boolean),
    [termsText],
  );

  const amountInWords = useMemo(
    () => numberToWords(grandTotal).replace(/\b\w/g, (c) => c.toUpperCase()),
    [grandTotal],
  );

  function updateRow(id: string, patch: Partial<LpoItemRow>) {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        slNo: prev.length + 1,
        itemNo: String(prev.length + 1),
        description: '',
        unit: 'Month',
        qty: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeRow(id: string) {
    setItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((row) => row.id !== id);
    });
  }

  async function downloadPdfA4() {
    if (!previewRef.current) return;

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = pageW * (canvas.height / canvas.width);
    const scale = imgH > pageH ? pageH / imgH : 1;

    pdf.addImage(canvas.toDataURL('image/png', 0.98), 'PNG', 0, 0, imgW, imgH * scale);
    pdf.save(`LPO_${poNumber || new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function printA4() {
    if (!previewRef.current) return;
    const popup = window.open('', '_blank', 'width=980,height=900');
    if (!popup) return;

    popup.document.write(`
      <html>
        <head>
          <title>LPO - ${poNumber}</title>
          <style>
            @page { size: A4; margin: 8mm; }
            body { margin: 0; background: #fff; }
          </style>
        </head>
        <body>
          ${previewRef.current.outerHTML}
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  }

  return (
    <div className="p-6 space-y-6">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18, alignItems: 'start' }}>
        <div className="space-y-3">
          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>LPO Header</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Company Name
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Address
                <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>CR No
                  <input value={companyCrNo} onChange={(e) => setCompanyCrNo(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </label>
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Phone
                  <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </label>
              </div>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Transition Phrase
                <input value={transitionText} onChange={(e) => setTransitionText(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>P.O Number
                <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>P.O Date
                <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Vendor Details</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Vendor Name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <textarea placeholder="Vendor Address" value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} rows={2} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ resize: 'vertical', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Vendor Contact" value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Vendor Email" value={vendorEmail} onChange={(e) => setVendorEmail(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Vendor VAT" value={vendorVat} onChange={(e) => setVendorVat(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Buyer Details</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Buyer Name" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <textarea placeholder="Buyer Address" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} rows={2} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ resize: 'vertical', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Buyer Contact" value={buyerContact} onChange={(e) => setBuyerContact(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Buyer Email" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Buyer VAT" value={buyerVat} onChange={(e) => setBuyerVat(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Commercials and Terms</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Discount (OMR)
                <input type="number" step="0.001" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>VAT %
                <input type="number" step="0.01" value={vatPercent} onChange={(e) => setVatPercent(Number(e.target.value) || 0)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Delivery Location
                <input value={deliveryLocation} onChange={(e) => setDeliveryLocation(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Date
                <input value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Terms (one line per point)
                <textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} rows={8} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ resize: 'vertical', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <input placeholder="Signature Name" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Designation" value={signatureDesignation} onChange={(e) => setSignatureDesignation(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Side Label" value={signatureSideLabel} onChange={(e) => setSignatureSideLabel(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={addRow} icon={<Plus size={14} />}>Add Row</Button>
            <Button onClick={downloadPdfA4} icon={<Download size={14} />}>Save A4 PDF</Button>
            <Button onClick={printA4} icon={<Printer size={14} />}>Print</Button>
          </div>
        </div>

        <div>
          <div
            ref={previewRef}
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 794,
              minHeight: 1123,
              padding: '24px 24px 34px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 18px rgba(0,0,0,0.12)',
              color: '#111',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            {/* Section 1 */}
            <div style={{ border: '1px solid #000', padding: '6px 8px', marginBottom: 10, fontSize: 10.6, fontWeight: 700, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <span>PURCHASE ORDER</span>
              <span>{companyName || '-'}</span>
              <span>{companyAddress || '-'}</span>
              <span>CR NO:{companyCrNo || '-'}</span>
              <span>{companyPhone || '-'}</span>
            </div>

            {/* Section 2 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontSize: 10.8 }}>
              <thead>
                <tr style={{ background: '#111', color: '#fff' }}>
                  <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>VENDOR</th>
                  <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>BUYER</th>
                  <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>P.O NUMBER</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #000', width: '38%', verticalAlign: 'top', padding: 8 }}>
                    <div style={{ fontWeight: 700 }}>{vendorName || '-'}</div>
                    <div>{vendorAddress || '-'}</div>
                    <div>Phone: {vendorContact || '-'}</div>
                    <div>{vendorEmail ? `Email: ${vendorEmail}` : ''}</div>
                    <div>{vendorVat ? `VAT Reg NO: ${vendorVat}` : ''}</div>
                  </td>
                  <td style={{ border: '1px solid #000', width: '38%', verticalAlign: 'top', padding: 8 }}>
                    <div style={{ fontWeight: 700 }}>{buyerName || '-'}</div>
                    <div>{buyerAddress || '-'}</div>
                    <div>{buyerVat ? `VAT Reg NO: ${buyerVat}` : ''}</div>
                    <div>{buyerEmail || ''}</div>
                    <div>{buyerContact ? `Phone: ${buyerContact}` : ''}</div>
                  </td>
                  <td style={{ border: '1px solid #000', width: '24%', verticalAlign: 'top', padding: 8 }}>
                    <div><strong>{poNumber || '-'}</strong></div>
                    <div style={{ marginTop: 6 }}><strong>Date:</strong> {formatDateDisplay(poDate)}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section 3 */}
            <div style={{ marginBottom: 8, fontSize: 10.8 }}>{transitionText || '-'}</div>

            {/* Section 4 */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: 10.6 }}>
              <thead>
                <tr>
                  {['SL', 'No', 'Description', 'Unit', 'QTY', 'Unit Price/MONTH', 'Total/RO'].map((head) => (
                    <th key={head} style={{ border: '1px solid #000', padding: '6px 5px', background: '#f5f5f5', textAlign: 'center' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {normalizedItems.map((row) => (
                  <tr key={row.id}>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.slNo}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.itemNo || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px' }}>{row.description || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center' }}>{row.unit || '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right' }}>{fmtAmount(row.qty)}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right' }}>{fmtAmount(row.unitPrice)}</td>
                    <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right' }}>{fmtAmount(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
              <table style={{ borderCollapse: 'collapse', width: 290, fontSize: 10.8 }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 700 }}>Total</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>{fmtAmount(subtotal)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 700 }}>Discount</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>{fmtAmount(discount)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 700 }}>Add VAT {vatPercent} %</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right' }}>{fmtAmount(vatAmount)}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', fontWeight: 800 }}>Grand Total</td>
                    <td style={{ border: '1px solid #000', padding: '5px 6px', textAlign: 'right', fontWeight: 800 }}>{fmtAmount(grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: 10.8, marginBottom: 10, fontWeight: 700 }}>{amountInWords.toUpperCase()}</div>

            {/* Section 5 */}
            <div style={{ border: '1px solid #000', padding: '8px 10px', fontSize: 10.6, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Operational and Legal Clauses</div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {terms.map((term, idx) => (
                  <li key={`${term}-${idx}`} style={{ marginBottom: 3 }}>{term}</li>
                ))}
              </ol>
              <div style={{ marginTop: 8 }}><strong>Delivery Location:</strong> {deliveryLocation || '-'}</div>
              <div><strong>Completion Date:</strong> {completionDate || '-'}</div>
            </div>

            {/* Section 6 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', alignItems: 'end', marginTop: 24, fontSize: 11 }}>
              <div style={{ fontWeight: 700 }}>{signatureSideLabel || '-'}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 6, fontWeight: 700 }}>{signatureName || '-'}</div>
                <div>{signatureDesignation || '-'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ borderTop: '1px solid #111', paddingTop: 5, display: 'inline-block', minWidth: 150 }}>Signature</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>LPO Line Items</h2>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f6f6f6' }}>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>SL</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>No</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Description</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'left' }}>Unit</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>QTY</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Unit Price/MONTH</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Total/RO</th>
                <th style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {normalizedItems.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 8 }}>{row.slNo}</td>
                  <td style={{ padding: 8, width: 90 }}>
                    <input value={row.itemNo} onChange={(e) => updateRow(row.id, { itemNo: e.target.value })} className="w-full px-2 py-1 rounded text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </td>
                  <td style={{ padding: 8 }}>
                    <input value={row.description} onChange={(e) => updateRow(row.id, { description: e.target.value })} className="w-full px-2 py-1 rounded text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </td>
                  <td style={{ padding: 8, width: 110 }}>
                    <input value={row.unit} onChange={(e) => updateRow(row.id, { unit: e.target.value })} className="w-full px-2 py-1 rounded text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </td>
                  <td style={{ padding: 8, width: 96 }}>
                    <input type="number" step="0.001" value={row.qty} onChange={(e) => updateRow(row.id, { qty: Number(e.target.value) || 0 })} className="w-full px-2 py-1 rounded text-sm outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </td>
                  <td style={{ padding: 8, width: 130 }}>
                    <input type="number" step="0.001" value={row.unitPrice} onChange={(e) => updateRow(row.id, { unitPrice: Number(e.target.value) || 0 })} className="w-full px-2 py-1 rounded text-sm outline-none text-right" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  </td>
                  <td style={{ padding: 8, textAlign: 'right', width: 120, fontWeight: 700 }}>{fmtAmount(row.total)}</td>
                  <td style={{ padding: 8, textAlign: 'center', width: 60 }}>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={normalizedItems.length === 1}
                      style={{
                        background: normalizedItems.length === 1 ? '#ddd' : '#fee2e2',
                        color: normalizedItems.length === 1 ? '#999' : '#dc2626',
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 6px',
                        cursor: normalizedItems.length === 1 ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
