import { DayEntry } from '@/types/timesheet';

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export function getPreviousMonthYear() {
  const now = new Date();
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    month: previousMonthDate.getMonth(),
    year: previousMonthDate.getFullYear(),
  };
}

export function generateDaysInMonth(month: number, year: number): DayEntry[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: DayEntry[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const friday = isFriday(year, month, day);
    days.push({
      day,
      timeIn: friday ? '' : '5:30',
      timeOutLunch: friday ? '' : '01:30',
      lunchBreak: '',
      timeIn2: friday ? '' : '3:30',
      timeOut2: friday ? '' : '6:30',
      totalDuration: friday ? 0 : 10,
      overTime: 0,
      actualWorked: friday ? 0 : 10,
      approverSig: '',
      remarks: '',
    });
  }

  return days;
}

export function getDayName(year: number, month: number, day: number): string {
  const date = new Date(year, month, day);
  return DAY_NAMES[date.getDay()];
}

export function isFriday(year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day);
  return date.getDay() === 5;
}

export function formatDate(year: number, month: number, day: number): string {
  const dayName = getDayName(year, month, day);
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month + 1).padStart(2, '0');
  return `${dayName} ${dayStr}/${monthStr}/${year}`;
}
