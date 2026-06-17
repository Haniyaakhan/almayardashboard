'use client';

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ChequeReceiptPaymentPage() {
  const previewRef = useRef<HTMLDivElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [receiptNo, setReceiptNo] = useState(
    `CHQ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [receiptDate, setReceiptDate] = useState(today);

  const [payerName, setPayerName] = useState('');
  const [payerProject, setPayerProject] = useState('');
  const [payerVatNo, setPayerVatNo] = useState('');

  const [receivedByName, setReceivedByName] = useState('');
  const [receivedById, setReceivedById] = useState('');
  const [payeeCompanyName, setPayeeCompanyName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeAmount, setChequeAmount] = useState('');
  const [amountInWords, setAmountInWords] = useState('');

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
    pdf.save(`Cheque_Receipt_Payment_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">
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
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Cheque Details</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Cheque Number" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Amount" type="number" step="0.01" value={chequeAmount} onChange={e => setChequeAmount(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input placeholder="Amount in Words" value={amountInWords} onChange={e => setAmountInWords(e.target.value)} className="px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
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
              backgroundImage: "url('/LATTER BACKGROUND_1.jpg')",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'top center',
              backgroundSize: '100% auto',
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
                <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>CHEQUE RECEIPT</div>
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
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Cheque Details</div>
              <div style={{ padding: 8, fontSize: 12, lineHeight: 1.5 }}>
                <div><strong>Cheque Number:</strong> {chequeNumber || '________________'}</div>
                <div><strong>Bank Name:</strong> {bankName || '________________'}</div>
                <div><strong>Amount:</strong> {chequeAmount ? Number(chequeAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '________________'}</div>
                <div><strong>Amount in Words:</strong> {amountInWords || '________________'}</div>
              </div>
            </div>

            <div style={{ border: '1px solid #ddd' }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Method of Payment</div>
              <div style={{ padding: 8, fontSize: 12, lineHeight: 1.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                  >✓</span>
                  <span>Cheque</span>
                </div>
              </div>
            </div>

            <div style={{ border: '1px solid #ddd', marginTop: 8 }}>
              <div style={{ background: '#f6f6f6', padding: '6px 8px', fontWeight: 700, fontSize: 12 }}>Authorization</div>
              <div style={{ padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, minHeight: 180 }}>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Payer Signature</div>
                  <div style={{ borderTop: '1px solid #111', marginTop: 80 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Received-By Signature</div>
                  <div style={{ borderTop: '1px solid #111', marginTop: 80 }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, marginBottom: 20 }}>Company Stamp</div>
                  <div style={{ borderTop: '1px solid #111', marginTop: 80 }} />
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
