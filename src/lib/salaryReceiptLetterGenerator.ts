import jsPDF from 'jspdf';
import type { SalarySheetEntry } from '@/types/database';
import { MONTH_NAMES } from '@/lib/dateUtils';

type ReceiptLetterData = {
  labor_name?: string;
  labor_code?: string;
  designation?: string;
  monthly_salary?: number;
  actual_worked_hours?: number;
  overtime_hours?: number;
  total_worked_hours?: number;
  hourly_rate?: number;
  total_salary?: number;
  deduction?: number;
};

function fmt(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
    : '0.000';
}

async function loadImageAsDataUrl(imageUrl: string) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to load image: ${response.status}`);
  }
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unable to convert image to data URL'));
      }
    };
    reader.onerror = () => reject(new Error('Image file read error'));
    reader.readAsDataURL(blob);
  });
}

export async function generateSalaryReceiptLetter(
  entry: SalarySheetEntry | ReceiptLetterData,
  month: number,
  year: number,
  customMonthLabel?: string,
  customBodyText?: string
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const topTextStart = 65; // 6.5cm top writing margin

  const monthYear = customMonthLabel === undefined
    ? `${MONTH_NAMES[month]} ${year}`
    : customMonthLabel.trim();

  try {
    const backgroundUrl = new URL(encodeURI('/LATTER BACKGROUND_1.jpg'), window.location.origin).href;
    const backgroundDataUrl = await loadImageAsDataUrl(backgroundUrl);
    pdf.addImage(backgroundDataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
  } catch (error) {
    console.warn('Salary receipt background image not loaded:', error);
  }

  let yPos = topTextStart;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor('#111827');
  pdf.text('Salary Receipt Acknowledgment', pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  const name = entry.labor_name || '';
  const id = entry.labor_code || '';
  const designation = entry.designation || '';
  const monthlySalary = typeof entry.monthly_salary === 'number' && Number.isFinite(entry.monthly_salary)
    ? entry.monthly_salary
    : undefined;
  const gross = typeof entry.total_salary === 'number' && Number.isFinite(entry.total_salary)
    ? entry.total_salary
    : undefined;
  const deduction = typeof entry.deduction === 'number' && Number.isFinite(entry.deduction)
    ? entry.deduction
    : undefined;
  const net = gross !== undefined && deduction !== undefined ? gross - deduction : undefined;

  const maybeAmount = (value: number | undefined) =>
    value !== undefined && value !== 0 ? `OMR ${fmt(value)}` : '';

  const infoRows = [
    ['Employee Name', name],
    ['Employee ID', id],
    ['Designation', designation],
    ['Salary Month', monthYear],
    ['Monthly Salary', maybeAmount(monthlySalary)],
    ['Gross Salary', maybeAmount(gross)],
    ['Deduction', maybeAmount(deduction)],
    ['Net Salary Received', maybeAmount(net)],
  ];

  const labelWidth = 45;
  const rowHeight = 8;
  const tableX = margin;
  const tableYStart = yPos - 5;
  const tableWidth = contentWidth;
  const tableHeight = rowHeight * infoRows.length;
  const separatorX = tableX + labelWidth + 20;
  let tableY = yPos;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);

  infoRows.forEach(([label, value], index) => {
    const isNetRow = label === 'Net Salary Received';
    if (isNetRow) {
      pdf.setFillColor('#eff6ff');
      pdf.rect(tableX, tableY - 5, tableWidth, rowHeight, 'F');
    }

    if (index > 0) {
      pdf.setDrawColor('#e5e7eb');
      pdf.setLineWidth(0.45);
      pdf.line(tableX, tableY - 5, tableX + tableWidth, tableY - 5);
    }

    pdf.setTextColor('#374151');
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, margin + 3, tableY);
    pdf.setFont('helvetica', isNetRow ? 'bold' : 'normal');
    pdf.text(value, separatorX + 3, tableY);

    tableY += rowHeight;
  });

  pdf.setDrawColor('#374151');
  pdf.setLineWidth(0.8);
  pdf.rect(tableX, tableYStart, tableWidth, tableHeight, 'S');
  pdf.line(separatorX, tableYStart, separatorX, tableYStart + tableHeight);

  yPos = tableY + 6;

  const defaultBodyText = net !== undefined
    ? `I, the undersigned, hereby acknowledge and confirm that I have received my full salary for the month of ${monthYear} in cash, amounting to ${fmt(net)} OMR. There are no dues remaining.`
    : `I, the undersigned, hereby acknowledge and confirm that I have received my full salary for the month of ${monthYear} in cash. There are no dues remaining.`;
  const bodyText = customBodyText === undefined
    ? defaultBodyText
    : customBodyText.trim();

  if (bodyText) {
    const wrappedLines: string[] = pdf.splitTextToSize(bodyText, contentWidth - 8);

    pdf.setFillColor('#f9fafb');
    pdf.setDrawColor('#e5e7eb');
    const bodyHeight = wrappedLines.length * 6 + 12;
    pdf.rect(margin, yPos - 4, contentWidth, bodyHeight, 'FD');

    pdf.setTextColor('#374151');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    wrappedLines.forEach((line) => {
      pdf.text(line, margin + 4, yPos + 4);
      yPos += 6;
    });

    yPos += 24;
  } else {
    yPos += 12;
  }

  const sigLineWidth = 75;
  const leftX = margin + 4;
  const rightX = pageWidth - margin - sigLineWidth;

  pdf.setDrawColor('#374151');
  pdf.setLineWidth(0.7);
  pdf.line(leftX, yPos, leftX + sigLineWidth, yPos);
  pdf.line(rightX, yPos, rightX + sigLineWidth, yPos);
  yPos += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor('#111827');
  pdf.text('Employee Signature', leftX, yPos);
  pdf.text('Authorized Signatory', rightX, yPos);
  yPos += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#6b7280');
  pdf.text(name, leftX, yPos);

  return pdf;
}

export async function downloadSalaryReceiptLetter(
  entry: SalarySheetEntry | ReceiptLetterData,
  month: number,
  year: number,
  customMonthLabel?: string,
  customBodyText?: string
) {
  const pdf = await generateSalaryReceiptLetter(entry, month, year, customMonthLabel, customBodyText);
  const sanitizedName = (entry.labor_name || 'Unknown')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  const sanitizedId = (entry.labor_code || 'Unknown').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const monthPart = customMonthLabel?.trim() ? customMonthLabel.trim().replace(/[^a-z0-9]/gi, '_') : MONTH_NAMES[month];
  const filename = `Salary_Receipt_Letter_${sanitizedName}_${sanitizedId}_${monthPart}_${year}.pdf`;
  pdf.save(filename);
}
