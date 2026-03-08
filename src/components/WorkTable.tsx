import React from 'react';
import { DayEntry } from '@/types/timesheet';
import { formatDate, isFriday } from '@/lib/dateUtils';

interface WorkTableProps {
  month: number;
  year: number;
  workData: DayEntry[];
  totalWorked: number;
  totalOT: number;
  onUpdateDayEntry: (day: number, field: keyof DayEntry, value: string | number) => void;
  vehicleMode?: boolean;
}

export default function WorkTable({
  month,
  year,
  workData,
  totalWorked,
  totalOT,
  onUpdateDayEntry,
  vehicleMode,
}: WorkTableProps) {
  return (
    <table className="w-full border-collapse mb-0">
      <thead>
        <tr>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[75px] bg-header-bg font-bold leading-tight align-middle">
            Date
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[32px] bg-header-bg font-bold leading-tight align-middle">
            Time<br />In
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[42px] bg-header-bg font-bold leading-tight align-middle">
            Time Out
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[53px] bg-header-bg font-bold leading-tight align-middle">
            Lunch Break<br />Time 01:00 to<br />03:00
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[32px] bg-header-bg font-bold leading-tight align-middle">
            Time<br />In
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[32px] bg-header-bg font-bold leading-tight align-middle">
            Time<br />Out
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[50px] bg-header-bg font-bold leading-tight align-middle">
            Total Worked<br />Done(Hrs)
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[32px] bg-header-bg font-bold leading-tight align-middle">
            Over<br />Time
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[45px] bg-header-bg font-bold leading-tight align-middle">
            Actual<br />Worked<br />(Hrs)
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[48px] bg-header-bg font-bold leading-tight align-middle">
            Approver<br />Signature
          </th>
          <th className="border border-black p-0.5 text-center text-sm-minus w-[42px] bg-header-bg font-bold leading-tight align-middle">
            Remarks
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={11} className="border border-black p-0.5 text-center text-[12px] font-bold">
            WORK SHEET
          </td>
        </tr>
        {workData.map((entry) => {
          const isFridayRow = isFriday(year, month, entry.day);

          return (
            <tr key={entry.day}>
              <td className={`border border-black p-0.5 text-left pl-1 text-[12px] whitespace-nowrap align-middle ${isFridayRow ? 'bg-header-bg' : ''}`}>
                <span className="inline-block h-[14px] leading-[14px]">{formatDate(year, month, entry.day)}</span>
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeIn}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeIn', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeOutLunch}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeOutLunch', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="p-0.5 text-center text-[12px] align-middle" style={{ border: 'none' }}>
                <input
                  type="text"
                  value={entry.lunchBreak}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'lunchBreak', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeIn2}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeIn2', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeOut2}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeOut2', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.totalDuration || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'totalDuration', Number(e.target.value))}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.overTime || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'overTime', Number(e.target.value))}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.actualWorked || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'actualWorked', Number(e.target.value))}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.approverSig}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'approverSig', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.remarks}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'remarks', e.target.value)}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[14px] leading-[14px]"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={6} className="border border-black p-0.5 text-right pr-2 text-[12px] font-bold">
            TOTAL WORKED HOURS =
          </td>
          <td className="border border-black p-0.5 text-center text-[12px] font-bold">
            {totalWorked || 0}
          </td>
          <td className="border border-black p-0.5 text-center text-[12px] font-bold">
            {vehicleMode ? '' : (totalOT || 0)}
          </td>
          <td className="border border-black p-0.5 text-center text-[12px] font-bold">
            {vehicleMode ? '' : ((totalWorked + totalOT) || 0)}
          </td>
          <td className="border border-black p-0.5"></td>
          <td className="border border-black p-0.5"></td>
        </tr>
      </tfoot>
    </table>
  );
}
