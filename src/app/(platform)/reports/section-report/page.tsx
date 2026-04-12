'use client';

import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2, FileSpreadsheet, FileText } from 'lucide-react';

type SectionRow = {
  date: string;
  description: string;
  plateNo: string;
  invoiceNumber: string;
  amount: string;
  vat: string;
};

function createEmptyRow(): SectionRow {
  return { date: '', description: '', plateNo: '', invoiceNumber: '', amount: '', vat: '' };
}

function normalizeRow(row: Partial<SectionRow> | undefined): SectionRow {
  return {
    date: row?.date ?? '',
    description: row?.description ?? '',
    plateNo: row?.plateNo ?? '',
    invoiceNumber: row?.invoiceNumber ?? '',
    amount: row?.amount ?? '',
    vat: row?.vat ?? '',
  };
}

function isRowComplete(row: SectionRow): boolean {
  return (
    (row.date || '').trim() !== '' &&
    (row.description || '').trim() !== '' &&
    (row.plateNo || '').trim() !== '' &&
    (row.invoiceNumber || '').trim() !== '' &&
    (row.amount || '').trim() !== '' &&
    (row.vat || '').trim() !== ''
  );
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function format2(value: number): string {
  return value.toFixed(2);
}

export default function SectionReportPage() {
  const [rows, setRows] = useState<SectionRow[]>([
    createEmptyRow(),
  ]);

  const computedRows = useMemo(() => {
    return rows.map((row, idx) => {
      const safeRow = normalizeRow(row);
      const amountNum = toNumber(safeRow.amount);
      const vatNum = toNumber(safeRow.vat);
      return {
        slNo: idx + 1,
        date: safeRow.date,
        description: safeRow.description,
        plateNo: safeRow.plateNo,
        invoiceNumber: safeRow.invoiceNumber,
        amount: amountNum,
        vat: vatNum,
        totalAmount: amountNum + vatNum,
      };
    });
  }, [rows]);

  const totals = useMemo(() => {
    return computedRows.reduce(
      (acc, row) => {
        acc.amount += row.amount;
        acc.vat += row.vat;
        acc.totalAmount += row.totalAmount;
        return acc;
      },
      { amount: 0, vat: 0, totalAmount: 0 }
    );
  }, [computedRows]);

  function updateRow(index: number, field: keyof SectionRow, value: string) {
    setRows((prev) => {
      const next = prev.map((row, i) => {
        const safeRow = normalizeRow(row);
        return i === index ? { ...safeRow, [field]: value } : safeRow;
      });
      const isLastRow = index === next.length - 1;
      if (isLastRow && isRowComplete(next[index])) {
        return [...next, createEmptyRow()];
      }
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function removeRow(index: number) {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }

  async function downloadExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Section Report');

    sheet.addRow(['Section Report']);
    sheet.addRow([`Generated: ${new Date().toLocaleDateString()}`]);
    sheet.addRow([]);
    sheet.addRow(['SL/No.', 'Date', 'Description', 'Plate No', 'Invoice No', 'Amount', 'VAT', 'Total Amount']);

    computedRows.forEach((row) => {
      sheet.addRow([
        row.slNo,
        row.date || '-',
        row.description || '-',
        row.plateNo || '-',
        row.invoiceNumber || '-',
        row.amount,
        row.vat,
        row.totalAmount,
      ]);
    });

    sheet.addRow([]);
    sheet.addRow(['', '', '', '', 'Grand Total', totals.amount, totals.vat, totals.totalAmount]);

    sheet.columns = [
      { width: 10 },
      { width: 14 },
      { width: 30 },
      { width: 20 },
      { width: 18 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
    ];

    const headerRow = sheet.getRow(4);
    headerRow.font = { bold: true };

    const totalRow = sheet.getRow(6 + computedRows.length);
    totalRow.font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([
      buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer),
    ], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `section-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadPdf() {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 10;
    const marginY = 12;
    const tableWidth = pageWidth - marginX * 2;
    const rowHeight = 7;
    let y = marginY;

    const colWidths = {
      slNo: tableWidth * 0.07,
      date: tableWidth * 0.11,
      description: tableWidth * 0.23,
      plateNo: tableWidth * 0.13,
      invoiceNumber: tableWidth * 0.16,
      amount: tableWidth * 0.1,
      vat: tableWidth * 0.09,
      totalAmount: tableWidth * 0.11,
    };

    const drawCell = (text: string, x: number, width: number) => {
      const lines = pdf.splitTextToSize(text || '-', width - 2) as string[];
      pdf.text(lines[0] || '-', x + 1, y);
    };

    const addPageIfNeeded = (needHeight: number) => {
      if (y + needHeight > pageHeight - marginY) {
        pdf.addPage();
        y = marginY;
        drawHeader();
      }
    };

    const drawHeader = () => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y - 5, tableWidth, rowHeight, 'F');
      pdf.rect(marginX, y - 5, tableWidth, rowHeight);

      const x1 = marginX;
      const x2 = x1 + colWidths.slNo;
      const x3 = x2 + colWidths.date;
      const x4 = x3 + colWidths.description;
      const x5 = x4 + colWidths.plateNo;
      const x6 = x5 + colWidths.invoiceNumber;
      const x7 = x6 + colWidths.amount;
      const x8 = x7 + colWidths.vat;

      pdf.line(x2, y - 5, x2, y + 2);
      pdf.line(x3, y - 5, x3, y + 2);
      pdf.line(x4, y - 5, x4, y + 2);
      pdf.line(x5, y - 5, x5, y + 2);
      pdf.line(x6, y - 5, x6, y + 2);
      pdf.line(x7, y - 5, x7, y + 2);
      pdf.line(x8, y - 5, x8, y + 2);

      pdf.text('SL/No.', x1 + 1, y);
      pdf.text('Date', x2 + 1, y);
      pdf.text('Description', x3 + 1, y);
      pdf.text('Plate No', x4 + 1, y);
      pdf.text('Invoice No', x5 + 1, y);
      pdf.text('Amount', x6 + 1, y);
      pdf.text('VAT', x7 + 1, y);
      pdf.text('Total Amount', x8 + 1, y);
      y += rowHeight;
    };

    const drawRow = (cells: string[], bold = false) => {
      addPageIfNeeded(rowHeight + 1);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setFontSize(9);

      const x1 = marginX;
      const x2 = x1 + colWidths.slNo;
      const x3 = x2 + colWidths.date;
      const x4 = x3 + colWidths.description;
      const x5 = x4 + colWidths.plateNo;
      const x6 = x5 + colWidths.invoiceNumber;
      const x7 = x6 + colWidths.amount;
      const x8 = x7 + colWidths.vat;

      pdf.rect(marginX, y - 5, tableWidth, rowHeight);
      pdf.line(x2, y - 5, x2, y + 2);
      pdf.line(x3, y - 5, x3, y + 2);
      pdf.line(x4, y - 5, x4, y + 2);
      pdf.line(x5, y - 5, x5, y + 2);
      pdf.line(x6, y - 5, x6, y + 2);
      pdf.line(x7, y - 5, x7, y + 2);
      pdf.line(x8, y - 5, x8, y + 2);

      drawCell(cells[0], x1, colWidths.slNo);
      drawCell(cells[1], x2, colWidths.date);
      drawCell(cells[2], x3, colWidths.description);
      drawCell(cells[3], x4, colWidths.plateNo);
      drawCell(cells[4], x5, colWidths.invoiceNumber);
      drawCell(cells[5], x6, colWidths.amount);
      drawCell(cells[6], x7, colWidths.vat);
      drawCell(cells[7], x8, colWidths.totalAmount);

      y += rowHeight;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Section Report', marginX, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, marginX, y);
    y += 8;

    drawHeader();

    computedRows.forEach((row) => {
      drawRow([
        String(row.slNo),
        row.date || '-',
        row.description || '-',
        row.plateNo || '-',
        row.invoiceNumber || '-',
        format2(row.amount),
        format2(row.vat),
        format2(row.totalAmount),
      ]);
    });

    drawRow(['', '', '', '', 'Grand Total', format2(totals.amount), format2(totals.vat), format2(totals.totalAmount)], true);

    pdf.save(`section-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="p-6 space-y-6">

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Report Entries
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="secondary" icon={<Plus size={14} />} onClick={addRow}>
              Add Row
            </Button>
            <Button variant="secondary" icon={<FileSpreadsheet size={14} />} onClick={downloadExcel}>
              Download Excel
            </Button>
            <Button variant="secondary" icon={<FileText size={14} />} onClick={downloadPdf}>
              Download PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>SL/No.</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Date</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Description</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Plate No</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Invoice No</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Amount</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>VAT</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Total Amount</th>
                <th className="text-left py-3 px-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const safeRow = normalizeRow(row);
                const amountNum = toNumber(safeRow.amount);
                const vatNum = toNumber(safeRow.vat);
                return (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>{index + 1}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={safeRow.date}
                        onChange={(e) => updateRow(index, 'date', e.target.value)}
                        placeholder="DD/MM/YYYY"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={safeRow.description}
                        onChange={(e) => updateRow(index, 'description', e.target.value)}
                        placeholder="Enter description"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={safeRow.plateNo}
                        onChange={(e) => updateRow(index, 'plateNo', e.target.value)}
                        placeholder="Plate no"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        value={safeRow.invoiceNumber}
                        onChange={(e) => updateRow(index, 'invoiceNumber', e.target.value)}
                        placeholder="Invoice no"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={safeRow.amount}
                        onChange={(e) => updateRow(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        step="0.01"
                        value={safeRow.vat}
                        onChange={(e) => updateRow(index, 'vat', e.target.value)}
                        placeholder="0.00"
                        className="w-full px-2 py-1 rounded-md text-sm outline-none"
                        style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {format2(amountNum + vatNum)}
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={13} />}
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="py-3 px-3 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Grand Total
                </td>
                <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format2(totals.amount)}
                </td>
                <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format2(totals.vat)}
                </td>
                <td className="py-3 px-3 font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {format2(totals.totalAmount)}
                </td>
                <td className="py-3 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

