import type { Shift } from '@/types/database';
import type { DayEntry } from '@/types/timesheet';
import { DAY_TEMPLATE, NIGHT_TEMPLATE } from '@/lib/shiftTemplates';

// Builds the DayEntry[] grid the Latest Timesheet components expect, driven
// entirely by approved shift records for one vehicle + month + shift type.
// Days with no approved shift of that type render blank — vehicles can work
// any day of the week, so there's no default "off day" assumption here.
export function buildVehicleTimesheetDayEntries(
  month: number,
  year: number,
  approvedShifts: Shift[],
): DayEntry[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const byDate = new Map(approvedShifts.map(s => [s.shift_date, s]));

  const entries: DayEntry[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const shift = byDate.get(dateStr);
    if (!shift) {
      entries.push({
        day, timeIn: '', timeOutLunch: '', lunchBreak: '', timeIn2: '', timeOut2: '',
        totalDuration: 0, overTime: 0, actualWorked: 0, approverSig: '', remarks: '',
      });
      continue;
    }
    const t = shift.shift_type === 'night' ? NIGHT_TEMPLATE : DAY_TEMPLATE;
    entries.push({
      day,
      timeIn: t.firstIn,
      timeOutLunch: t.firstOut,
      lunchBreak: '',
      timeIn2: t.secondIn,
      timeOut2: t.secondOut,
      totalDuration: shift.net_hours,
      overTime: 0,
      actualWorked: shift.net_hours,
      approverSig: '',
      remarks: shift.overridden_driver ? `Driver: ${shift.driver_name_snapshot}${shift.override_reason ? ` (${shift.override_reason})` : ''}` : (shift.remarks || ''),
    });
  }
  return entries;
}
