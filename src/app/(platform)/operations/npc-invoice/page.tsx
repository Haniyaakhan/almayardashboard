'use client';
import React, { useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LineItem {
  description: string;
  workingHours: number;
  hourlyRate: number;
}

export default function OperationsNpcInvoicePage() {
  const [billTo, setBillTo] = useState('NPC SPC');
  const [project, setProject] = useState('Railway Project');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceDescription, setServiceDescription] = useState('Labor Supply Services');
  const [vatPercent, setVatPercent] = useState(5);
  const [items, setItems] = useState<LineItem[]>([{ description: 'Labor Supply - 8 Workers', workingHours: 0, hourlyRate: 0 }]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (Number(i.workingHours) * Number(i.hourlyRate)), 0), [items]);
  const vatAmount = useMemo(() => (subtotal * vatPercent) / 100, [subtotal, vatPercent]);
  const total = subtotal + vatAmount;

  function updateItem(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((i, iIdx) => (iIdx === idx ? { ...i, ...patch } : i)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', workingHours: 0, hourlyRate: 0 }]);
  }

  return (
    <div>


      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
        <Card padding="p-4">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(130px, 1fr))', gap: 10, marginBottom: 10 }}>
            <input value={billTo} onChange={(e) => setBillTo(e.target.value)} placeholder="Bill To" style={inputStyle} />
            <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" style={inputStyle} />
            <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice No" style={inputStyle} />
            <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} style={inputStyle} />
            <input value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} placeholder="Service Description" style={{ ...inputStyle, gridColumn: '1 / -1' }} />
            <input value={String(vatPercent)} onChange={(e) => setVatPercent(Number(e.target.value) || 0)} placeholder="VAT %" style={inputStyle} />
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  <th style={thStyle}>Description</th>
                  <th style={thStyle}>Hours</th>
                  <th style={thStyle}>Hourly Rate</th>
                  <th style={thStyle}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const amount = Number(item.workingHours) * Number(item.hourlyRate);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f4f1ed' }}>
                      <td style={tdStyle}><input value={item.description} onChange={(e) => updateItem(idx, { description: e.target.value })} style={inputCellStyle} /></td>
                      <td style={tdStyle}><input value={String(item.workingHours)} onChange={(e) => updateItem(idx, { workingHours: Number(e.target.value) || 0 })} style={inputCellStyle} /></td>
                      <td style={tdStyle}><input value={String(item.hourlyRate)} onChange={(e) => updateItem(idx, { hourlyRate: Number(e.target.value) || 0 })} style={inputCellStyle} /></td>
                      <td style={tdStyle}>{amount.toFixed(3)} OMR</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button variant="secondary" onClick={addItem}>Add Line</Button>
            <Button variant="secondary" onClick={() => window.print()}>Print / Save PDF</Button>
          </div>
        </Card>

        <Card padding="p-4">
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
            <FileText size={16} /> Live Preview
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.6 }}>
            <div><strong>Bill To:</strong> {billTo || '—'}</div>
            <div><strong>Project:</strong> {project || '—'}</div>
            <div><strong>Invoice No:</strong> {invoiceNo || 'Auto/Manual'}</div>
            <div><strong>Date:</strong> {invoiceDate}</div>
            <div><strong>Description:</strong> {serviceDescription || '—'}</div>
            <hr style={{ margin: '10px 0', borderColor: 'var(--border)' }} />
            <div><strong>Subtotal:</strong> {subtotal.toFixed(3)} OMR</div>
            <div><strong>VAT ({vatPercent}%):</strong> {vatAmount.toFixed(3)} OMR</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}><strong>Total:</strong> {total.toFixed(3)} OMR</div>
            <hr style={{ margin: '10px 0', borderColor: 'var(--border)' }} />
            <div>ALMYAR UNITED TRADING LLC</div>
            <div>Bank Muscat</div>
            <div>Remittance as per company bank details.</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  borderRadius: 9,
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
  outline: 'none',
};

const thStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '8px 10px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const inputCellStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  borderRadius: 7,
  padding: '6px 8px',
  fontSize: 12,
  color: 'var(--text-light)',
  outline: 'none',
};
