import * as XLSX from 'xlsx';
import { DayEntry } from '@/types/timesheet';
import { formatDate, MONTH_NAMES } from '@/lib/dateUtils';
import type { SalaryRecord } from '@/types/database';

export function exportToExcel(
  month: number,
  year: number,
  laborName: string,
  projectName: string,
  workData: DayEntry[],
  totalWorked: number,
  totalOT: number,
  totalActual: number
): void {
  try {
    const monthName = MONTH_NAMES[month];
    const wsData: any[][] = [];

    // Title
    wsData.push(['Labor Time Sheet']);
    wsData.push([]);
    wsData.push(['ALMYAR UNITED TRADING LLC']);
    wsData.push([]);
    wsData.push(['PROJECT NAME:', projectName]);
    wsData.push(['Labor Name:', laborName, '', 'Month:', monthName, 'Year:', year]);
    wsData.push([]);

    // Headers
    wsData.push([
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

    // Data rows
    workData.forEach((entry) => {
      const dateStr = formatDate(year, month, entry.day);
      wsData.push([
        dateStr,
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

    // Totals
    wsData.push([]);
    wsData.push([
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

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 18 }, // Date
      { wch: 8 },  // Time In
      { wch: 10 }, // Time Out (Lunch)
      { wch: 10 }, // Lunch Break
      { wch: 8 },  // Time In
      { wch: 8 },  // Time Out
      { wch: 15 }, // Total Worked Done
      { wch: 8 },  // Over Time
      { wch: 12 }, // Actual Worked
      { wch: 12 }, // Approver Signature
      { wch: 10 }, // Remarks
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'TimeSheet');

    // Save file
    const filename = `TimeSheet_${laborName || 'Labor'}_${monthName}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Excel export error:', error);
    throw new Error('Failed to export Excel file');
  }
}

export function exportSalaryReportToExcel(month: number, year: number, records: SalaryRecord[]): void {
  try {
    const monthName = MONTH_NAMES[month] ?? String(month + 1);
    const wsData: Array<Array<string | number>> = [];

    wsData.push(['Salary Report']);
    wsData.push(['ALMYAR UNITED TRADING LLC']);
    wsData.push([`Month: ${monthName}`, `Year: ${year}`]);
    wsData.push([]);

    wsData.push([
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
      wsData.push([
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
    wsData.push([]);
    wsData.push(['', '', '', '', '', '', '', '', 'Total Net Salary', totalNet, '']);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 24 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Salary');
    XLSX.writeFile(wb, `Salary_${monthName}_${year}.xlsx`);
  } catch (error) {
    console.error('Salary Excel export error:', error);
    throw new Error('Failed to export salary report');
  }
}
