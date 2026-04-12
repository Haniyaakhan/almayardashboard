import ExcelJS from 'exceljs';
import { DayEntry } from '@/types/timesheet';
import { formatDate, MONTH_NAMES } from '@/lib/dateUtils';
import type { Laborer } from '@/types/database';
import { toDisplayDesignation } from '@/lib/designation';

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

export interface ManualSalarySheetRow {
  laborName: string;
  laborId: string;
  salary: number;
  bankName: string;
  bankAccountNumber: string;
  totalHours: number;
  overTime: number;
  actualHours: number;
  ratePerHour: number;
  actualSalary: number;
  deduction: number;
  netSalary: number;
}

export async function exportManualSalarySheetToExcel(
  month: number,
  year: number,
  rows: ManualSalarySheetRow[]
): Promise<void> {
  try {
    const monthName = MONTH_NAMES[month] ?? String(month + 1);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Manual Salary Sheet');

    worksheet.addRow(['Manual Salary Generation']);
    worksheet.addRow(['ALMYAR UNITED TRADING LLC']);
    worksheet.addRow([`Month: ${monthName}`, `Year: ${year}`]);
    worksheet.addRow([]);

    worksheet.addRow([
      'Name',
      'ID',
      'M/Salary',
      'H/Rate',
      'AW-Hours',
      'TW-Hours',
      'OT',
      'Total Salary',
      'Deduction',
      'Net Salary',
      'Bank Name',
      'Account Number',
    ]);

    rows.forEach((row) => {
      worksheet.addRow([
        row.laborName,
        row.laborId,
        Number(row.salary ?? 0),
        Number(row.ratePerHour ?? 0),
        Number(row.actualHours ?? 0),
        Number(row.totalHours ?? 0),
        Number(row.overTime ?? 0),
        Number(row.actualSalary ?? 0),
        Number(row.deduction ?? 0),
        Number(row.netSalary ?? 0),
        row.bankName,
        row.bankAccountNumber,
      ]);
    });

    const totalActualSalary = rows.reduce((sum, row) => sum + Number(row.actualSalary ?? 0), 0);
    const totalNetSalary = rows.reduce((sum, row) => sum + Number(row.netSalary ?? 0), 0);
    worksheet.addRow([]);
    worksheet.addRow(['', '', '', '', '', '', '', 'Total Salary', totalActualSalary, '', '', '']);
    worksheet.addRow(['', '', '', '', '', '', '', '', '', 'Total Net Salary', totalNetSalary, '']);

    worksheet.columns = [
      { width: 22 },
      { width: 16 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 16 },
      { width: 14 },
      { width: 14 },
      { width: 18 },
      { width: 22 },
    ];

    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };

    await downloadWorkbook(workbook, `Manual_Salary_Sheet_${monthName}_${year}.xlsx`);
  } catch (error) {
    console.error('Manual salary sheet Excel export error:', error);
    throw new Error('Failed to export manual salary sheet');
  }
}

export async function exportLaborersToExcel(
  laborers: Laborer[],
  label: string,
  foremanNameById?: Map<string, string>,
): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(label);

    worksheet.addRow(['ALMYAR UNITED TRADING LLC']);
    worksheet.addRow([`${label} — Labour Registry`]);
    worksheet.addRow([`Exported: ${new Date().toLocaleDateString()}`]);
    worksheet.addRow([]);

    const headers = [
      'Full Name', 'Labour ID', 'Designation', 'Nationality',
      'Contractor / Supplier', 'Foreman',
      'Phone', 'Daily Rate (OMR)', 'Monthly Salary (OMR)',
      'Bank Name', 'Bank Account', 'Status', 'Start Date', 'Notes',
    ];
    worksheet.addRow(headers);
    const headerRow = worksheet.getRow(5);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FFE9F0FA' },
    };

    laborers.forEach((l) => {
      worksheet.addRow([
        l.full_name,
        l.id_number,
        toDisplayDesignation(l.designation),
        l.nationality || '',
        l.supplier_name || '',
        l.foreman_id ? (foremanNameById?.get(l.foreman_id) ?? l.foreman_id) : '',
        l.phone || '',
        l.daily_rate ?? '',
        l.monthly_salary ?? '',
        l.bank_name || '',
        l.bank_account_number || '',
        l.is_active ? 'Active' : 'Inactive',
        l.start_date ? l.start_date.slice(0, 10) : '',
        l.notes || '',
      ]);
    });

    worksheet.columns = [
      { width: 26 }, { width: 16 }, { width: 16 }, { width: 16 },
      { width: 24 }, { width: 22 },
      { width: 16 }, { width: 16 }, { width: 18 },
      { width: 20 }, { width: 22 }, { width: 10 }, { width: 14 }, { width: 28 },
    ];

    await downloadWorkbook(workbook, `${label.replace(/\s+/g, '_')}_Labour_Registry.xlsx`);
  } catch (error) {
    console.error('Laborer Excel export error:', error);
    throw new Error('Failed to export laborer data');
  }
}
