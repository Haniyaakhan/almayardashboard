'use client';

import React from 'react';
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
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button
        onClick={handlePrint}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '7px',
          cursor: 'pointer',
          opacity: 1,
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
