'use client';
import React from 'react';
import jsPDF from 'jspdf';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useEmployeesByDesignation } from '@/hooks/useEmployeesByDesignation';
import { ReportExportButtons } from '@/components/ReportExportButtons';
import { Users } from 'lucide-react';

export default function EmployeesByDesignationPage() {
  const { report, loading, error } = useEmployeesByDesignation();

  function downloadEmployeeDetailsPdf() {
    if (!report) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 10;
    const marginY = 12;
    const tableWidth = pageWidth - marginX * 2;
    const rowHeight = 7;
    let y = marginY;

    const colWidths = {
      laborName: tableWidth * 0.18,
      idNumber: tableWidth * 0.13,
      phoneNumber: tableWidth * 0.13,
      supplierName: tableWidth * 0.16,
      bankName: tableWidth * 0.16,
      accountNumber: tableWidth * 0.24,
    };

    const addPageIfNeeded = (requiredHeight: number) => {
      if (y + requiredHeight > pageHeight - marginY) {
        pdf.addPage();
        y = marginY;
      }
    };

    const drawCellText = (text: string, x: number, textY: number, width: number) => {
      const safeText = text || '-';
      const lines = pdf.splitTextToSize(safeText, width - 2) as string[];
      pdf.text(lines[0] || '-', x + 1, textY);
    };

    const drawHeader = () => {
      addPageIfNeeded(rowHeight + 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginX, y - 5, tableWidth, rowHeight, 'F');
      pdf.rect(marginX, y - 5, tableWidth, rowHeight);

      const x1 = marginX;
      const x2 = x1 + colWidths.laborName;
      const x3 = x2 + colWidths.idNumber;
      const x4 = x3 + colWidths.phoneNumber;
      const x5 = x4 + colWidths.supplierName;
      const x6 = x5 + colWidths.bankName;

      pdf.line(x2, y - 5, x2, y + 2);
      pdf.line(x3, y - 5, x3, y + 2);
      pdf.line(x4, y - 5, x4, y + 2);
      pdf.line(x5, y - 5, x5, y + 2);
      pdf.line(x6, y - 5, x6, y + 2);

      pdf.text('Labour Name', x1 + 1, y);
      pdf.text('ID / Iqama No.', x2 + 1, y);
      pdf.text('Phone Number', x3 + 1, y);
      pdf.text('Supplier Name', x4 + 1, y);
      pdf.text('Bank Name', x5 + 1, y);
      pdf.text('Account Number', x6 + 1, y);
      y += rowHeight;
    };

    const drawRow = (
      laborName: string,
      idNumber: string,
      phoneNumber: string,
      supplierName: string,
      bankName: string,
      accountNumber: string
    ) => {
      addPageIfNeeded(rowHeight + 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      const x1 = marginX;
      const x2 = x1 + colWidths.laborName;
      const x3 = x2 + colWidths.idNumber;
      const x4 = x3 + colWidths.phoneNumber;
      const x5 = x4 + colWidths.supplierName;
      const x6 = x5 + colWidths.bankName;

      pdf.rect(marginX, y - 5, tableWidth, rowHeight);
      pdf.line(x2, y - 5, x2, y + 2);
      pdf.line(x3, y - 5, x3, y + 2);
      pdf.line(x4, y - 5, x4, y + 2);
      pdf.line(x5, y - 5, x5, y + 2);
      pdf.line(x6, y - 5, x6, y + 2);

      drawCellText(laborName, x1, y, colWidths.laborName);
      drawCellText(idNumber, x2, y, colWidths.idNumber);
      drawCellText(phoneNumber, x3, y, colWidths.phoneNumber);
      drawCellText(supplierName, x4, y, colWidths.supplierName);
      drawCellText(bankName, x5, y, colWidths.bankName);
      drawCellText(accountNumber, x6, y, colWidths.accountNumber);
      y += rowHeight;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('Employees by Designation - Detailed Report', marginX, y);
    y += 7;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, marginX, y);
    y += 5;
    pdf.text(`Total Employees: ${report.totalEmployees}`, marginX, y);
    y += 8;

    report.designationGroups.forEach((group) => {
      addPageIfNeeded(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(`${group.designation} (${group.count})`, marginX, y);
      y += 6;

      drawHeader();

      if (group.employees.length === 0) {
        drawRow('-', '-', '-', '-', '-', '-');
      } else {
        group.employees.forEach((emp) => {
          const idNumber = emp.id_number && emp.id_number.trim() ? emp.id_number : '-';
          const phoneNumber = emp.phone && emp.phone.trim() ? emp.phone : '-';
          const supplierName = emp.supplier_name && emp.supplier_name.trim() ? emp.supplier_name : '-';
          const bankName = emp.bank_name && emp.bank_name.trim() ? emp.bank_name : '-';
          const accountNumber = emp.bank_account_number && emp.bank_account_number.trim() ? emp.bank_account_number : '-';
          drawRow(
            emp.full_name || '-',
            idNumber,
            phoneNumber,
            supplierName,
            bankName,
            accountNumber
          );
        });
      }

      y += 4;
    });

    pdf.save('employees-by-designation-details.pdf');
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <Card className="border-red-200">
          <p className="text-red-600">{error || 'Failed to load report'}</p>
        </Card>
      </div>
    );
  }

  const summaryData = {
    headers: ['Designation', 'Employee Count', 'Percentage'],
    rows: report.designationGroups.map((g, idx) => ({
      cells: [
        g.designation,
        g.count.toString(),
        ((g.count / report.totalEmployees) * 100).toFixed(1) + '%',
      ],
      key: idx,
    })),
  };

  return (
    <div className="p-6 space-y-6">

      {/* Overall Summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Total Employees
            </p>
            <p className="text-2xl font-bold mt-2">
              {report.totalEmployees}
            </p>
            <p className="text-xs mt-2">
              {report.designationGroups.length} designations
            </p>
          </div>
          <Users className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
        </div>
      </Card>

      {/* Export */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Export Options</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <ReportExportButtons 
              headers={summaryData.headers}
              rows={summaryData.rows.map(r => r.cells)}
              filename="employees-by-designation"
            />
            <button
              onClick={downloadEmployeeDetailsPdf}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              title="Export detailed employee list as PDF"
            >
              Details PDF
            </button>
          </div>
        </div>
      </Card>

      {/* Summary Table */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Designation Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {summaryData.headers.map(header => (
                  <th 
                    key={header}
                    className="text-left py-3 px-4 font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaryData.rows.map((row) => (
                <tr 
                  key={row.key} 
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {row.cells.map((cell, cidx) => (
                    <td 
                      key={cidx} 
                      className="py-3 px-4"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detailed Listings by Designation */}
      {report.designationGroups.map((designationGroup) => (
        <Card key={designationGroup.designation}>
          <h2 className="text-lg font-semibold mb-4">
            {designationGroup.designation} ({designationGroup.count})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>ID / Iqama No.</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Phone Number</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Supplier</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Bank Name</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Account Number</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Daily Rate</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Monthly Salary</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {designationGroup.employees.map((emp) => (
                  <tr 
                    key={emp.id} 
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.full_name}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.id_number || '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.phone || '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.supplier_name || '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.bank_name || '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.bank_account_number || '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.daily_rate ? emp.daily_rate.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.monthly_salary ? emp.monthly_salary.toFixed(2) : '-'}
                    </td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>
                      {emp.start_date ? new Date(emp.start_date).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

