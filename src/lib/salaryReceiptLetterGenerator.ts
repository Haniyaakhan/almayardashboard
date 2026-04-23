import jsPDF from 'jspdf';
import type { SalarySheetEntry } from '@/types/database';
import { MONTH_NAMES } from '@/lib/dateUtils';

function fmt(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : '0.000';
}

export function generateSalaryReceiptLetter(entry: SalarySheetEntry, month: number, year: number): jsPDF {
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
  pdf.setFontSize(12);
  pdf.text('SALARY RECEIPT LETTER', pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('ALMYAR UNITED TRADING LLC', pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;

  pdf.setFontSize(9);
  pdf.text('Date: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, yPos, {
    align: 'center',
  });
  yPos += 12;

  // Receipt Letter Content
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  const monthYear = `${MONTH_NAMES[month]} ${year}`;
  const gross = Number(entry.total_salary) || 0;
  const deduction = Number(entry.deduction) || 0;
  const net = gross - deduction;

  const letterContent = [
    'This is to certify that the undersigned employee has received salary payment for the month of ' + monthYear + '.',
    '',
    'Employee Details:',
    `Name: ${entry.labor_name || '-'}`,
    `ID Number: ${entry.labor_code || '-'}`,
    `Designation: ${entry.designation || '-'}`,
    '',
    'Salary Details:',
    `Monthly Salary: OMR ${fmt(Number(entry.monthly_salary) || 0)}`,
    `Actual Worked Hours: ${fmt(Number(entry.actual_worked_hours) || 0)} hours`,
    `Hourly Rate: OMR ${fmt(Number(entry.hourly_rate) || 0)} per hour`,
    `Total Worked Hours: ${fmt(Number(entry.total_worked_hours) || 0)} hours`,
    `Overtime Hours: ${fmt(Number(entry.overtime_hours) || 0)} hours`,
    '',
    'Payment Summary:',
    `Gross Salary: OMR ${fmt(gross)}`,
    `Deductions: OMR ${fmt(deduction)}`,
    `Net Salary Received: OMR ${fmt(net)}`,
    '',
    'The above-mentioned salary payment has been received in CASH by the employee.',
    'This letter is issued as a proof of salary payment receipt.',
  ];

  let currentYPos = yPos;
  const lineHeight = 5.5;
  const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

  letterContent.forEach((line, index) => {
    if (line === '') {
      currentYPos += 2;
    } else {
      const isBold = line.includes('Employee Details:') || line.includes('Salary Details:') || line.includes('Payment Summary:');
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

      const wrappedText = pdf.splitTextToSize(line, contentWidth);
      wrappedText.forEach((text: string) => {
        if (currentYPos > pageHeight - margin - 20) {
          pdf.addPage();
          currentYPos = margin;
        }
        pdf.text(text, margin + 5, currentYPos);
        currentYPos += lineHeight;
      });
    }
  });

  currentYPos += 10;

  // Signature section
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text('Employee Signature: ___________________', margin + 5, currentYPos);
  currentYPos += 10;
  pdf.text('Date: ___________________', margin + 5, currentYPos);
  currentYPos += 10;

  pdf.text('Authorized By: ___________________', margin + 5, currentYPos);

  return pdf;
}

export function downloadSalaryReceiptLetter(entry: SalarySheetEntry, month: number, year: number) {
  const pdf = generateSalaryReceiptLetter(entry, month, year);
  const sanitizedName = (entry.labor_name || 'Unknown')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const sanitizedId = (entry.labor_code || 'Unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `Salary_Receipt_Letter_${sanitizedName}_${sanitizedId}_${MONTH_NAMES[month]}_${year}.pdf`;
  pdf.save(filename);
}
