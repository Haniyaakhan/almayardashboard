import jsPDF from 'jspdf';
import type { SalarySheetEntry } from '@/types/database';
import { MONTH_NAMES } from '@/lib/dateUtils';

function fmt(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : '0.000';
}

export function generateSalarySlip(entry: SalarySheetEntry, month: number, year: number): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('SALARY SLIP', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('ALMYAR UNITED TRADING LLC', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  pdf.setFontSize(9);
  const monthYear = `${MONTH_NAMES[month]} ${year}`;
  pdf.text(monthYear, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Separator line
  pdf.setDrawColor(200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Employee Details Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Employee Information', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const details = [
    { label: 'Name:', value: entry.labor_name || '-' },
    { label: 'ID:', value: entry.labor_code || '-' },
    { label: 'Designation:', value: entry.designation || '-' },
    { label: 'Period:', value: monthYear },
  ];

  details.forEach((detail) => {
    pdf.text(`${detail.label} ${detail.value}`, margin + 5, yPos);
    yPos += 5;
  });

  yPos += 4;

  // Salary Details Section
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Salary Details', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const salary_details = [
    { label: 'Monthly Salary (OMR):', value: fmt(Number(entry.monthly_salary) || 0) },
    { label: 'Hourly Rate (OMR):', value: fmt(Number(entry.hourly_rate) || 0) },
    { label: 'Actual Worked Hours:', value: fmt(Number(entry.actual_worked_hours) || 0) },
    { label: 'Total Worked Hours (up to 260):', value: fmt(Number(entry.total_worked_hours) || 0) },
    { label: 'Overtime Hours:', value: fmt(Number(entry.overtime_hours) || 0) },
  ];

  const labelWidth = 70;
  salary_details.forEach((detail) => {
    pdf.text(`${detail.label}`, margin + 5, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(detail.value, margin + labelWidth, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 5;
  });

  yPos += 4;

  // Separator line
  pdf.setDrawColor(200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  // Earnings & Deductions
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Earnings & Deductions', margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);

  const gross = Number(entry.total_salary) || 0;
  const deduction = Number(entry.deduction) || 0;
  const net = gross - deduction;

  const earnings = [
    { label: 'Gross Salary (OMR):', value: fmt(gross) },
    { label: 'Deductions (OMR):', value: fmt(deduction) },
  ];

  earnings.forEach((detail) => {
    pdf.text(`${detail.label}`, margin + 5, yPos);
    pdf.setFont('helvetica', 'bold');
    pdf.text(detail.value, margin + labelWidth, yPos);
    pdf.setFont('helvetica', 'normal');
    yPos += 5;
  });

  yPos += 2;

  // Net Salary (highlighted)
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`NET SALARY (OMR): ${fmt(net)}`, margin + 5, yPos);
  yPos += 8;

  // Bank Details Section (if available)
  if (entry.bank_name && entry.bank_name !== '-') {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Bank Details', margin, yPos);
    yPos += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    const bankDetails = [
      { label: 'Bank Name:', value: entry.bank_name || '-' },
      { label: 'Account Number:', value: entry.bank_account_number || '-' },
    ];

    bankDetails.forEach((detail) => {
      pdf.text(`${detail.label}`, margin + 5, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(detail.value, margin + labelWidth, yPos);
      pdf.setFont('helvetica', 'normal');
      yPos += 5;
    });
  }

  yPos += 8;

  // Footer line
  pdf.setDrawColor(200);
  pdf.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text('This is an electronically generated salary slip. No signature required.', pageWidth / 2, yPos, {
    align: 'center',
  });

  return pdf;
}

export function downloadSalarySlip(entry: SalarySheetEntry, month: number, year: number) {
  const pdf = generateSalarySlip(entry, month, year);
  const sanitizedName = (entry.labor_name || 'Unknown')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const sanitizedId = (entry.labor_code || 'Unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `Salary_Slip_${sanitizedName}_${sanitizedId}_${MONTH_NAMES[month]}_${year}.pdf`;
  pdf.save(filename);
}
