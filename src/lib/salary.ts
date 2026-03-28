import type { Laborer, Timesheet } from '@/types/database';

export interface SalaryComputation {
  laborer_id: string;
  timesheet_id: string;
  month: number;
  year: number;
  regular_hours: number;
  overtime_hours: number;
  total_worked_hours: number;
  hourly_rate: number;
  basic_salary: number;
  advances_amount: number;
  foreman_commission: number;
  net_salary: number;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeSalaryFromApprovedTimesheet(
  timesheet: Timesheet,
  laborer: Laborer,
  advancesAmount: number
): SalaryComputation {
  const monthlySalary = Number(laborer.monthly_salary ?? 0);
  const hourlyRate = monthlySalary > 0 ? monthlySalary / 260 : 0;
  const totalWorkedHours = Number(timesheet.total_actual ?? 0);
  const basicSalary = round2(totalWorkedHours * hourlyRate);
  const foremanCommission = Number(laborer.foreman_commission ?? 0);
  const netSalary = round2(basicSalary - (foremanCommission + advancesAmount));

  return {
    laborer_id: laborer.id,
    timesheet_id: timesheet.id,
    month: timesheet.month,
    year: timesheet.year,
    regular_hours: Number(timesheet.total_worked ?? 0),
    overtime_hours: Number(timesheet.total_ot ?? 0),
    total_worked_hours: totalWorkedHours,
    hourly_rate: round2(hourlyRate),
    basic_salary: basicSalary,
    advances_amount: round2(advancesAmount),
    foreman_commission: round2(foremanCommission),
    net_salary: netSalary,
  };
}
