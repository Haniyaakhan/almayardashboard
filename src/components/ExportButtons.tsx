'use client';

import React, { useState } from 'react';
import { exportToPDF } from '@/lib/pdfExport';
import { exportToExcel } from '@/lib/excelExport';
import { MONTH_NAMES } from '@/lib/dateUtils';
import { DayEntry } from '@/types/timesheet';

interface ExportButtonsProps {
  timesheetRef: React.RefObject<HTMLDivElement>;
  laborName: string;
  month: number;
  year: number;
  projectName: string;
  workData: DayEntry[];
  totalWorked: number;
  totalOT: number;
  totalActual: number;
}

export default function ExportButtons({
  timesheetRef,
  laborName,
  month,
  year,
  projectName,
  workData,
  totalWorked,
  totalOT,
  totalActual,
}: ExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handlePDFExport = () => {
    if (isExporting) return;
    // Use browser's native print-to-PDF for perfect rendering
    // (vertical alignment, colors, full width all work correctly)
    window.print();
  };

  const handleExcelExport = () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      exportToExcel(month, year, laborName, projectName, workData, totalWorked, totalOT, totalActual);
    } catch (error) {
      alert('Failed to export Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (isExporting) return;
    window.print();
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handleExcelExport}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '7px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.5 : 1,
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          color: '#fff',
          boxShadow: '0 1px 4px rgba(22,163,74,0.35)',
          transition: 'filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Save as Excel
      </button>
      <button
        onClick={handlePrint}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '7px',
          cursor: isExporting ? 'not-allowed' : 'pointer',
          opacity: isExporting ? 0.5 : 1,
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#fff',
          boxShadow: '0 1px 4px rgba(37,99,235,0.35)',
          transition: 'filter 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print
      </button>
    </div>
  );
}
