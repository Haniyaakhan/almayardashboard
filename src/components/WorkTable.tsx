import React from 'react';
import { DayEntry } from '@/types/timesheet';
import { formatDate, isFriday } from '@/lib/dateUtils';

interface WorkTableProps {
  month: number;
  year: number;
  workData: DayEntry[];
  totalWorked: number;
  totalOT: number;
  totalActual: number;
  onUpdateDayEntry: (day: number, field: keyof DayEntry, value: string | number) => void;
  vehicleMode?: boolean;
  readOnly?: boolean;
}

export default function WorkTable({
  month,
  year,
  workData,
  totalWorked,
  totalOT,
  totalActual,
  onUpdateDayEntry,
  vehicleMode,
  readOnly = false,
}: WorkTableProps) {
  const COLS = 10;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let newRow = rowIndex;
    let newCol = colIndex;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      newRow = rowIndex - 1;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      newRow = rowIndex + 1;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newCol = colIndex - 1;
      if (newCol < 0) { newCol = COLS - 1; newRow = rowIndex - 1; }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      newCol = colIndex + 1;
      if (newCol >= COLS) { newCol = 0; newRow = rowIndex + 1; }
    } else {
      return;
    }
    if (newRow < 0 || newRow >= workData.length || newCol < 0 || newCol >= COLS) return;
    const target = document.querySelector<HTMLInputElement>(
      `[data-worktable-row="${newRow}"][data-worktable-col="${newCol}"]`
    );
    if (target) { target.focus(); }
  };

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
        {workData.map((entry, rowIndex) => {
          const isFridayRow = isFriday(year, month, entry.day);

          return (
            <tr key={entry.day}>
              <td className={`border border-black p-0.5 text-left pl-1 text-[12px] whitespace-nowrap align-middle ${isFridayRow ? 'bg-header-bg' : ''}`}>
                <span className="inline-block h-[13px] leading-[13px]">{formatDate(year, month, entry.day)}</span>
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeIn}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeIn', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 0)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={0}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeOutLunch}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeOutLunch', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 1)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={1}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="p-0.5 text-center text-[12px] align-middle" style={{ border: 'none' }}>
                <input
                  type="text"
                  value={entry.lunchBreak}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'lunchBreak', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 2)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={2}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeIn2}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeIn2', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 3)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={3}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.timeOut2}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'timeOut2', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 4)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={4}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.totalDuration || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'totalDuration', Number(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 5)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={5}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.overTime || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'overTime', Number(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 6)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={6}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="number"
                  value={entry.actualWorked || ''}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'actualWorked', Number(e.target.value))}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 7)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={7}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.approverSig}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'approverSig', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 8)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={8}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
              <td className="border border-black p-0.5 text-center text-[12px] align-middle">
                <input
                  type="text"
                  value={entry.remarks}
                  onChange={(e) => onUpdateDayEntry(entry.day, 'remarks', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, 9)}
                  data-worktable-row={rowIndex}
                  data-worktable-col={9}
                  readOnly={readOnly}
                  className="w-full outline-none text-center text-[12px] bg-transparent h-[13px] leading-[13px]"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={6} className="border border-black p-0.5 text-right pr-2 text-[12px] font-bold">
            TOTAL WORKED HOURS
          </td>
          <td className="border border-black p-0.5"></td>
          <td className="border border-black p-0.5"></td>
          <td className="border border-black p-0.5 text-center text-[12px] font-bold">
            {totalActual || 0}
          </td>
          <td className="border border-black p-0.5"></td>
          <td className="border border-black p-0.5"></td>
        </tr>
      </tfoot>
    </table>
  );
}
