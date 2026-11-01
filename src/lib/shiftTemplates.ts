// Fixed Day/Night shift templates for the Vehicle LPO & Shift Management system.
// Times are Asia/Muscat (Oman), which is a fixed UTC+4 offset with no DST —
// safe to hardcode rather than pull in a timezone library.
export type ShiftType = 'day' | 'night';

const MUSCAT_OFFSET = '+04:00';

export const DAY_TEMPLATE = {
  firstIn: '06:00', firstOut: '12:00',
  breakStart: '12:00', breakEnd: '13:00',
  secondIn: '13:00', secondOut: '17:00',
  netHours: 10,
} as const;

export const NIGHT_TEMPLATE = {
  firstIn: '18:00', firstOut: '22:00',
  breakStart: '22:00', breakEnd: '23:00',
  secondIn: '23:00', secondOut: '05:00', // next calendar day
  netHours: 10,
} as const;

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toMuscatIso(dateStr: string, time: string): string {
  return `${dateStr}T${time}:00${MUSCAT_OFFSET}`;
}

export interface ComputedShiftTimes {
  startAt: string;   // ISO timestamp, shift start
  endAt: string;     // ISO timestamp, shift end (next-day date for night shift's second half)
  breakStart: string;
  breakEnd: string;
  netHours: number;
}

// shiftDate is the shift's START date (YYYY-MM-DD) — the night shift's 23:00-05:00
// segment is stored under this same start date even though it ends the next day.
export function computeShiftTimes(shiftDate: string, shiftType: ShiftType): ComputedShiftTimes {
  const template = shiftType === 'day' ? DAY_TEMPLATE : NIGHT_TEMPLATE;
  const endDate = shiftType === 'night' ? addDays(shiftDate, 1) : shiftDate;
  return {
    startAt: toMuscatIso(shiftDate, template.firstIn),
    endAt: toMuscatIso(endDate, template.secondOut),
    breakStart: toMuscatIso(shiftDate, template.breakStart),
    breakEnd: toMuscatIso(shiftDate, template.breakEnd), // night's 22:00–23:00 break is still before midnight, same date
    netHours: template.netHours,
  };
}
