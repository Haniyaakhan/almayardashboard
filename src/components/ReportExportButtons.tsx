import React from 'react';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { exportToCSV, exportToXLSX } from '@/lib/exportUtils';

interface ReportExportProps {
  headers: string[];
  rows: string[][];
  filename: string;
}

export function ReportExportButtons({ headers, rows, filename }: ReportExportProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportToCSV(headers, rows, filename)}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        title="Export as CSV"
      >
        <Download className="w-4 h-4 inline-block mr-2" />
        CSV
      </button>
      <button
        onClick={() => exportToXLSX(headers, rows, filename)}
        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
        }}
        title="Export as Excel"
      >
        <Download className="w-4 h-4 inline-block mr-2" />
        Excel
      </button>
    </div>
  );
}
