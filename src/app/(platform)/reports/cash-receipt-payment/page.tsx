'use client';

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CashReceiptPaymentPage() {
  const previewRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [receiptNo, setReceiptNo] = useState(
    `CRP-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [receiptDate, setReceiptDate] = useState(today);

  const [payerName, setPayerName] = useState('');
  const [payerProject, setPayerProject] = useState('');
  const [payerVatNo, setPayerVatNo] = useState('');

  const [receivedByName, setReceivedByName] = useState('');
  const [receivedById, setReceivedById] = useState('');
  const [payeeCompanyName, setPayeeCompanyName] = useState('');
  const [invoiceRefs, setInvoiceRefs] = useState('');

  const [basicAmount, setBasicAmount] = useState('');
  const [vatPercent, setVatPercent] = useState('5');
  const [vat, setVat] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const [payCash, setPayCash] = useState(false);
  const [payCheque, setPayCheque] = useState(false);
  const [payMoneyOrder, setPayMoneyOrder] = useState(false);
  const [payBankTransfer, setPayBankTransfer] = useState(false);

  function fmt(val: string) {
    const num = Number(val);
    if (!Number.isFinite(num)) return '-';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }

  function renderPaymentOption(checked: boolean, label: string) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span
          style={{
            width: 14,
            height: 14,
            border: '1px solid #111',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          {checked ? '✓' : ''}
        </span>
        <span>{label}</span>
      </div>
    );
  }

  function recalculateAmounts(nextBasicAmount: string, nextVatPercent: string) {
    const basic = Number(nextBasicAmount) || 0;
    const percent = Number(nextVatPercent) || 0;
    const vatAmount = (basic * percent) / 100;

    setVat(vatAmount.toFixed(3));
    setTotalAmount((basic + vatAmount).toFixed(3));
  }

  async function saveAsPdf() {
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
    pdf.save(`Cash_Receipt_Payment_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Cash Receipt" subtitle="Settings on left, printable A4 receipt on right" />

      <div style={{ display: 'grid', gridTemplateColumns: '330px 1fr', gap: 18, alignItems: 'start' }}>
        <div className="space-y-3">
          <Card>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Receipt Settings</h2>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Receipt No
                <input value={receiptNo} onChange={e => setReceiptNo(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>Receipt Date
                <input value={receiptDate} onChange={e => setReceiptDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </label>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payer Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Name" value={payerName} onChange={e => setPayerName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Project" value={payerProject} onChange={e => setPayerProject(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="VAT No" value={payerVatNo} onChange={e => setPayerVatNo(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none md:col-span-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payee Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Company Name" value={payeeCompanyName} onChange={e => setPayeeCompanyName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none md:col-span-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Received By Name" value={receivedByName} onChange={e => setReceivedByName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Received By ID" value={receivedById} onChange={e => setReceivedById(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Paid Against</h2>
            <input placeholder="Invoice Refs" value={invoiceRefs} onChange={e => setInvoiceRefs(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Payment Details / Breakdown</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <input placeholder="Basic Amount" type="number" step="0.01" value={basicAmount} onChange={e => {
                  const val = e.target.value;
                  setBasicAmount(val);
                  recalculateAmounts(val, vatPercent);
                }} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <input placeholder="VAT %" type="number" step="0.01" value={vatPercent} onChange={e => {
                  const val = e.target.value;
                  setVatPercent(val);
                  recalculateAmounts(basicAmount, val);
                }} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <input placeholder={`VAT (${vatPercent || 0}%)`} type="number" step="0.01" value={vat} disabled className="w-full px-3 py-2 rounded-lg text-sm outline-none opacity-60" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <input placeholder="Total Amount" type="number" step="0.01" value={totalAmount} disabled className="w-full px-3 py-2 rounded-lg text-sm outline-none opacity-60" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>

              <div className="space-y-3">
                <div className="rounded-lg px-3 py-2" style={{ background: '#fff3e9', border: '1px solid #f59e0b' }}>
                  <p className="text-xs font-semibold" style={{ color: '#9a3412' }}>Current Balance (write by hand)</p>
                  <div className="h-7 mt-1" style={{ borderBottom: '1px dashed #f59e0b' }} />
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: '#fff3e9', border: '1px solid #f59e0b' }}>
                  <p className="text-xs font-semibold" style={{ color: '#9a3412' }}>Payment Amount (write by hand)</p>
                  <div className="h-7 mt-1" style={{ borderBottom: '1px dashed #f59e0b' }} />
                </div>
                <div className="rounded-lg px-3 py-2" style={{ background: '#fff3e9', border: '1px solid #f59e0b' }}>
                  <p className="text-xs font-semibold" style={{ color: '#9a3412' }}>Balance Due (write by hand)</p>
                  <div className="h-7 mt-1" style={{ borderBottom: '1px dashed #f59e0b' }} />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Method of Payment</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm" style={{ color: 'var(--text-primary)' }}>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={payCash} onChange={e => setPayCash(e.target.checked)} /> Cash</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={payCheque} onChange={e => setPayCheque(e.target.checked)} /> Cheque</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={payMoneyOrder} onChange={e => setPayMoneyOrder(e.target.checked)} /> Money Order</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={payBankTransfer} onChange={e => setPayBankTransfer(e.target.checked)} /> Bank Transfer</label>
            </div>
          </Card>

          <div className="flex justify-start">
            <Button onClick={saveAsPdf} icon={<Download size={14} />}>Save A4 PDF</Button>
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
              padding: '22px 36px 22px',
              boxSizing: 'border-box',
              boxShadow: '0 1px 18px rgba(0,0,0,0.12)',
              color: '#111',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <div style={{ height: 200 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>CASH RECEIPT</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div><strong>Receipt No:</strong> {receiptNo || '-'}</div>
                <div><strong>Date:</strong> {receiptDate || '-'}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ border: '1px solid #ddd' }}>
                <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Payer Details</div>
                <div style={{ padding: 8, fontSize: 12, lineHeight: 1.5 }}>
                  <div><strong>Name:</strong> {payerName || '-'}</div>
                  <div><strong>Project:</strong> {payerProject || '-'}</div>
                  <div><strong>VAT No:</strong> {payerVatNo || '-'}</div>
                </div>
              </div>

              <div style={{ border: '1px solid #ddd' }}>
                <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Payee Details</div>
                <div style={{ padding: 8, fontSize: 12, lineHeight: 1.5 }}>
                  <div><strong>Company Name:</strong> {payeeCompanyName || '-'}</div>
                  <div><strong>Received By Name:</strong> {receivedByName || '-'}</div>
                  <div><strong>Received By ID:</strong> {receivedById || '-'}</div>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #ddd', marginBottom: 8 }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Paid Against</div>
              <div style={{ padding: 8, fontSize: 12 }}><strong>Invoice Refs:</strong> {invoiceRefs || '-'}</div>
            </div>

            <div style={{ border: '1px solid #ddd', marginBottom: 8 }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Payment Details / Breakdown</div>
              <div style={{ padding: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ padding: '4px 0' }}><strong>Basic Amount</strong></td><td style={{ textAlign: 'right' }}>{fmt(basicAmount)}</td></tr>
                    <tr><td style={{ padding: '4px 0' }}><strong>VAT ({vatPercent || 0}%)</strong></td><td style={{ textAlign: 'right' }}>{fmt(vat)}</td></tr>
                    <tr><td style={{ padding: '4px 0' }}><strong>Total Amount</strong></td><td style={{ textAlign: 'right' }}>{fmt(totalAmount)}</td></tr>
                  </tbody>
                </table>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ padding: '4px 0' }}><strong>Current Balance</strong></td><td style={{ textAlign: 'right' }}>________________</td></tr>
                    <tr><td style={{ padding: '4px 0' }}><strong>Payment Amount</strong></td><td style={{ textAlign: 'right' }}>________________</td></tr>
                    <tr><td style={{ padding: '4px 0' }}><strong>Balance Due</strong></td><td style={{ textAlign: 'right' }}>________________</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ border: '1px solid #ddd', marginBottom: 8 }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Method of Payment</div>
              <div style={{ padding: 8, fontSize: 12, lineHeight: 1.5 }}>
                {renderPaymentOption(payCash, 'Cash')}
                {renderPaymentOption(payCheque, 'Cheque')}
                {renderPaymentOption(payMoneyOrder, 'Money Order')}
                {renderPaymentOption(payBankTransfer, 'Bank Transfer')}
              </div>
            </div>

            <div style={{ border: '1px solid #ddd' }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Authorization</div>
              <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Payer Signature</div>
                  <div style={{ borderTop: '1px solid #111' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Received-By Signature</div>
                  <div style={{ borderTop: '1px solid #111' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Company Stamp</div>
                  <div style={{ borderTop: '1px solid #111' }} />
                </div>
              </div>
            </div>

            <div style={{ height: 70 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
