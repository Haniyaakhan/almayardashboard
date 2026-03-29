import ExcelJS from 'exceljs';
import { DayEntry } from '@/types/timesheet';
import { formatDate, MONTH_NAMES } from '@/lib/dateUtils';
import type { SalaryRecord } from '@/types/database';

async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([
    buffer instanceof ArrayBuffer ? buffer : new Uint8Array(buffer),
  ], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function exportToExcel(
  month: number,
  year: number,
  laborName: string,
  projectName: string,
  workData: DayEntry[],
  totalWorked: number,
  totalOT: number,
  totalActual: number
): Promise<void> {
  try {
    const monthName = MONTH_NAMES[month];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('TimeSheet');

    worksheet.addRow(['Labor Time Sheet']);
    worksheet.addRow([]);
    worksheet.addRow(['ALMYAR UNITED TRADING LLC']);
    worksheet.addRow([]);
    worksheet.addRow(['PROJECT NAME:', projectName]);
    worksheet.addRow(['Labor Name:', laborName, '', 'Month:', monthName, 'Year:', year]);
    worksheet.addRow([]);

    worksheet.addRow([
      'Date',
      'Time In',
      'Time Out (Lunch)',
      'Lunch Break',
      'Time In',
      'Time Out',
      'Total Worked Done(Hrs)',
      'Over Time',
      'Actual Worked (Hrs)',
      'Approver Signature',
      'Remarks',
    ]);

    workData.forEach((entry) => {
      worksheet.addRow([
        formatDate(year, month, entry.day),
        entry.timeIn,
        entry.timeOutLunch,
        entry.lunchBreak,
        entry.timeIn2,
        entry.timeOut2,
        entry.totalDuration || '',
        entry.overTime || '',
        entry.actualWorked || '',
        entry.approverSig,
        entry.remarks,
      ]);
    });

    worksheet.addRow([]);
    worksheet.addRow([
      '',
      '',
      '',
      '',
      '',
      'TOTAL WORKED HOURS',
      totalWorked || 0,
      totalOT || 0,
      totalActual || 0,
    ]);

    worksheet.columns = [
      { width: 18 },
      { width: 8 },
      { width: 16 },
      { width: 12 },
      { width: 8 },
      { width: 8 },
      { width: 18 },
      { width: 12 },
      { width: 16 },
      { width: 18 },
      { width: 18 },
    ];

    const headerRow = worksheet.getRow(8);
    headerRow.font = { bold: true };

    const filename = `TimeSheet_${laborName || 'Labor'}_${monthName}_${year}.xlsx`;
    await downloadWorkbook(workbook, filename);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export Excel file');
  }
}

export async function exportSalaryReportToExcel(month: number, year: number, records: SalaryRecord[]): Promise<void> {
  try {
    const monthName = MONTH_NAMES[month] ?? String(month + 1);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Salary');

    worksheet.addRow(['Salary Report']);
    worksheet.addRow(['ALMYAR UNITED TRADING LLC']);
    worksheet.addRow([`Month: ${monthName}`, `Year: ${year}`]);
    worksheet.addRow([]);

    worksheet.addRow([
      'Labor Name',
      'Labor ID',
      'Bank Name',
      'Account Number',
      'Worked Hours',
      'Hourly Rate',
      'Basic Salary',
      'Advances',
      'Foreman Commission',
      'Net Salary',
      'Status',
    ]);

    records.forEach((row) => {
      worksheet.addRow([
        row.laborer?.full_name ?? '',
        row.laborer?.id_number ?? '',
        row.laborer?.bank_name ?? '',
        row.laborer?.bank_account_number ?? '',
        Number(row.total_worked_hours ?? 0),
        Number(row.hourly_rate ?? 0),
        Number(row.basic_salary ?? 0),
        Number(row.advances_amount ?? 0),
        Number(row.foreman_commission ?? 0),
        Number(row.net_salary ?? 0),
        row.status,
      ]);
    });

    const totalNet = records.reduce((sum, row) => sum + Number(row.net_salary ?? 0), 0);
    worksheet.addRow([]);
    worksheet.addRow(['', '', '', '', '', '', '', '', 'Total Net Salary', totalNet, '']);

    worksheet.columns = [
      { width: 24 },
      { width: 16 },
      { width: 18 },
      { width: 22 },
      { width: 14 },
      { width: 12 },
      { width: 14 },
      { width: 12 },
      { width: 18 },
      { width: 14 },
      { width: 12 },
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };

    await downloadWorkbook(workbook, `Salary_${monthName}_${year}.xlsx`);
  } catch (error) {
    console.error('Salary Excel export error:', error);
    throw new Error('Failed to export salary report');
  }
}
