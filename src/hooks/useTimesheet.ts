'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { DayEntry, UseTimesheetReturn } from '@/types/timesheet';
import { generateDaysInMonth } from '@/lib/dateUtils';

type LoadMeta = {
  month: number; year: number;
  laborName?: string; projectName?: string;
  supplierName?: string; siteEngineerName?: string; designation?: string;
};

export function useTimesheet(): UseTimesheetReturn & { loadEntries: (entries: DayEntry[], meta: LoadMeta) => void } {
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
          newEntry.actualWorked = (newEntry.totalDuration || 0) + (newEntry.overTime || 0);
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

  // Calculate totals
  const { totalWorked, totalOT, totalActual } = useMemo(() => {
    const worked = workData.reduce((sum, entry) => sum + (entry.totalDuration || 0), 0);
    const ot = workData.reduce((sum, entry) => sum + (entry.overTime || 0), 0);
    return { totalWorked: worked, totalOT: ot, totalActual: worked + ot };
  }, [workData]);

  return {
    month, year, laborName, projectName, supplierName, siteEngineerName, designation,
    workData, totalWorked, totalOT, totalActual,
    setMonth, setYear, setLaborName, setProjectName, setSupplierName,
    setSiteEngineerName, setDesignation, updateDayEntry, loadEntries,
  };
}
