'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Copy, RotateCcw } from 'lucide-react';
import type { DayEntry } from '@/types/timesheet';

interface TemplateData {
  timeIn: string;
  timeOutLunch: string;
  lunchBreak: string;
  timeIn2: string;
  timeOut2: string;
  totalDuration: string;
  overTime: string;
  actualWorked: string;
  approverSig: string;
  remarks: string;
}

const emptyTemplate: TemplateData = {
  timeIn: '', timeOutLunch: '', lunchBreak: '', timeIn2: '', timeOut2: '',
  totalDuration: '', overTime: '', actualWorked: '', approverSig: '', remarks: '',
};

const templateFields: { key: keyof TemplateData; entryKey: keyof DayEntry; label: string; numeric: boolean }[] = [
  { key: 'timeIn', entryKey: 'timeIn', label: 'Time In', numeric: false },
  { key: 'timeOutLunch', entryKey: 'timeOutLunch', label: 'Time Out', numeric: false },
  { key: 'lunchBreak', entryKey: 'lunchBreak', label: 'Lunch Break', numeric: false },
  { key: 'timeIn2', entryKey: 'timeIn2', label: 'Time In 2', numeric: false },
  { key: 'timeOut2', entryKey: 'timeOut2', label: 'Time Out 2', numeric: false },
  { key: 'totalDuration', entryKey: 'totalDuration', label: 'Total Hrs', numeric: true },
  { key: 'overTime', entryKey: 'overTime', label: 'OT', numeric: true },
  { key: 'actualWorked', entryKey: 'actualWorked', label: 'Actual Hrs', numeric: true },
  { key: 'approverSig', entryKey: 'approverSig', label: 'Approver', numeric: false },
  { key: 'remarks', entryKey: 'remarks', label: 'Remarks', numeric: false },
];

interface TemplateRowProps {
  sheetType: string;
  month: number;
  year: number;
  workData: DayEntry[];
  onUpdateDayEntry: (day: number, field: keyof DayEntry, value: string | number) => void;
  onMonthChange: (month: number) => void;
  readOnly?: boolean;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function TemplateRow({ sheetType, month, year, workData, onUpdateDayEntry, onMonthChange, readOnly = false }: TemplateRowProps) {
  const storageKey = `timesheet-template-${sheetType}`;
  const [template, setTemplate] = useState<TemplateData>(emptyTemplate);
  const [fromDay, setFromDay] = useState(1);
  const [toDay, setToDay] = useState(() => {
    return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setTemplate(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [storageKey]);

  // Update toDay when month/year changes to match days in month
  useEffect(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    setToDay(daysInMonth);
  }, [month, year]);

  const updateField = useCallback((field: keyof TemplateData, value: string) => {
    setTemplate(prev => {
      const next = { ...prev, [field]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const resetTemplate = useCallback(() => {
    setTemplate(emptyTemplate);
    localStorage.setItem(storageKey, JSON.stringify(emptyTemplate));
  }, [storageKey]);

  const copyToRange = useCallback(() => {
    if (readOnly) return;

    for (const day of workData) {
      if (day.day < fromDay || day.day > toDay) continue;
      for (const f of templateFields) {
        const val = template[f.key];
        if (val !== '') {
          onUpdateDayEntry(day.day, f.entryKey, f.numeric ? Number(val) : val);
        }
      }
    }
  }, [template, workData, onUpdateDayEntry, fromDay, toDay, readOnly]);

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg, #fff)',
    color: 'var(--text-primary, #111)',
    border: '1px solid var(--border, #d1d5db)',
  };

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '8px 0',
    }}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Template:
        </span>
        {templateFields.map(f => (
          <div key={f.key} className="flex flex-col items-center gap-0.5">
            <label className="text-[10px]" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{f.label}</label>
            <input
              type="text"
              value={template[f.key]}
              onChange={e => updateField(f.key, e.target.value)}
              placeholder="--"
              disabled={readOnly}
              className="text-xs rounded px-1.5 py-1 outline-none text-center"
              style={{ ...inputStyle, width: f.key === 'remarks' || f.key === 'approverSig' ? 72 : 56 }}
            />
          </div>
        ))}

        {/* Month selector */}
        <div className="flex flex-col items-center gap-0.5" style={{ marginLeft: 8 }}>
          <label className="text-[10px]" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Month</label>
          <select
            value={month}
            onChange={e => onMonthChange(Number(e.target.value))}
            disabled={readOnly}
            className="text-xs rounded px-1.5 py-1 outline-none"
            style={{ ...inputStyle, width: 70 }}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
        </div>

        {/* Day range */}
        <div className="flex items-center gap-1.5 ml-2" style={{ marginTop: 12 }}>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Day</span>
          <input
            type="number" min={1} max={31} value={fromDay}
            onChange={e => setFromDay(Number(e.target.value))}
            disabled={readOnly}
            className="text-xs rounded px-1 py-1 outline-none text-center"
            style={{ ...inputStyle, width: 40 }}
          />
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>to</span>
          <input
            type="number" min={1} max={31} value={toDay}
            onChange={e => setToDay(Number(e.target.value))}
            disabled={readOnly}
            className="text-xs rounded px-1 py-1 outline-none text-center"
            style={{ ...inputStyle, width: 40 }}
          />
        </div>

        <button
          onClick={copyToRange}
          disabled={readOnly}
          className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5"
          style={{
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
            whiteSpace: 'nowrap',
            marginTop: 12,
          }}
        >
          <Copy size={12} /> Copy to All
        </button>

        <button
          onClick={resetTemplate}
          disabled={readOnly}
          className="flex items-center gap-1 text-xs font-semibold rounded-lg px-3 py-1.5"
          style={{
            background: 'var(--bg-card, #fff)',
            color: 'var(--text-light, #374151)',
            border: '1px solid var(--border, #d1d5db)',
            cursor: readOnly ? 'not-allowed' : 'pointer',
            opacity: readOnly ? 0.6 : 1,
            whiteSpace: 'nowrap',
            marginTop: 12,
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}
