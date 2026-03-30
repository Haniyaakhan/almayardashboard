'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DayEntry, UseTimesheetReturn } from '@/types/timesheet';
import { generateDaysInMonth, isFriday } from '@/lib/dateUtils';

type LoadMeta = {
  month: number; year: number;
  laborName?: string; projectName?: string;
  supplierName?: string; siteEngineerName?: string; designation?: string;
};

export function useTimesheet(): UseTimesheetReturn & {
  loadEntries: (entries: DayEntry[], meta: LoadMeta) => void;
  clearDayRange: (startDay: number, endDay: number) => void;
  fillDayRange: (startDay: number, endDay: number, hours?: number) => void;
  setWorkData: React.Dispatch<React.SetStateAction<DayEntry[]>>;
} {
  const [month, setMonth] = useState(1);
  const [year, setYear] = useState(2026);
  const [laborName, setLaborName] = useState('');
  const [projectName, setProjectName] = useState('I069A -UAE OMAN RAILWAY -PACKAGE 5 B (TUNNEL & STRUCTURES PART)');
  const [supplierName, setSupplierName] = useState('');
  const [siteEngineerName, setSiteEngineerName] = useState('');
  const [designation, setDesignation] = useState('');
  const [workData, setWorkData] = useState<DayEntry[]>([]);
  const skipResetRef = useRef(false);

  // Generate work data when month/year changes — skip if loadEntries was just called
  useEffect(() => {
    if (skipResetRef.current) {
      skipResetRef.current = false;
      return;
    }
    const days = generateDaysInMonth(month, year);
    setWorkData(days);
  }, [month, year]);

  // Parse time string "HH:MM" to hours as a decimal number
  const parseTimeToHours = (time: string): number | null => {
    if (!time || !time.includes(':')) return null;
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h + m / 60;
  };

  // Update a specific day entry field
  const updateDayEntry = (day: number, field: keyof DayEntry, value: string | number) => {
    setWorkData((prev) => {
      const updated = prev.map((entry) => {
        if (entry.day === day) {
          const newEntry = { ...entry, [field]: value };
          if (field !== 'actualWorked') {
            newEntry.actualWorked = (newEntry.totalDuration || 0) + (newEntry.overTime || 0);
          }
          return newEntry;
        }
        return entry;
      });
      return updated;
    });
  };

  // Bulk-load entries from a saved timesheet without triggering the month/year reset effect
  const loadEntries = useCallback((entries: DayEntry[], meta: LoadMeta) => {
    skipResetRef.current = true;
    setMonth(meta.month);
    setYear(meta.year);
    if (meta.laborName !== undefined) setLaborName(meta.laborName);
    if (meta.projectName !== undefined) setProjectName(meta.projectName);
    if (meta.supplierName !== undefined) setSupplierName(meta.supplierName);
    if (meta.siteEngineerName !== undefined) setSiteEngineerName(meta.siteEngineerName);
    if (meta.designation !== undefined) setDesignation(meta.designation);
    setWorkData(entries);
  }, []);

  // Clear entries for a range of days
  const clearDayRange = useCallback((startDay: number, endDay: number) => {
    setWorkData(prev => prev.map(entry => {
      if (entry.day >= startDay && entry.day <= endDay) {
        return {
          ...entry,
          timeIn: '', timeOutLunch: '', lunchBreak: '',
          timeIn2: '', timeOut2: '',
          totalDuration: 0, overTime: 0, actualWorked: 0,
          approverSig: '', remarks: '',
        };
      }
      return entry;
    }));
  }, []);

  // Fill entries with default values for a range of days (skip Fridays)
  const fillDayRange = useCallback((startDay: number, endDay: number, hours: number = 10) => {
    setWorkData(prev => prev.map(entry => {
      if (entry.day >= startDay && entry.day <= endDay && !isFriday(year, month, entry.day)) {
        return {
          ...entry,
          timeIn: '5:30', timeOutLunch: '01:30', lunchBreak: '',
          timeIn2: '3:30', timeOut2: '6:30',
          totalDuration: hours, overTime: 0, actualWorked: hours,
          approverSig: '', remarks: '',
        };
      }
      return entry;
    }));
  }, [year, month]);

  // Calculate totals
  const { totalWorked, totalOT, totalActual } = useMemo(() => {
    const worked = workData.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0);
    const ot = workData.reduce((sum, entry) => sum + (entry.overTime || 0), 0);
    const actual = workData.reduce((sum, entry) => sum + (entry.actualWorked || 0), 0);
    return { totalWorked: worked, totalOT: ot, totalActual: actual };
  }, [workData]);

  return {
    month, year, laborName, projectName, supplierName, siteEngineerName, designation,
    workData, totalWorked, totalOT, totalActual,
    setMonth, setYear, setLaborName, setProjectName, setSupplierName,
    setSiteEngineerName, setDesignation, updateDayEntry, loadEntries, clearDayRange, fillDayRange, setWorkData,
  };
}
