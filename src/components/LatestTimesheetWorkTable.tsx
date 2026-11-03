import React from 'react';
import { DayEntry } from '@/types/timesheet';
import { formatDate, isFriday } from '@/lib/dateUtils';

interface LatestTimesheetWorkTableProps {
  month: number;
  year: number;
  workData: DayEntry[];
  totalActual: number;
  onUpdateDayEntry: (day: number, field: keyof DayEntry, value: string | number) => void;
  readOnly?: boolean;
}

// ── Exact palette extracted from TIMESHEET I069A SEP 2026(SAMPLE).xlsx ──
const LIGHT_GREEN = '#8ED973';
const YELLOW = '#FFFF00';
const FONT = "'Arial Narrow', Arial, Helvetica, sans-serif";

const thinBorder = '1px solid #000';
const doubleBorder = '3px double #000';

const headers = [
  'Date', 'Time In', 'Time Out', 'Lunch Break\nTime', 'Time In', 'Time Out',
  'Total Worked\nDone', 'Break Down\n(Hrs)', 'Actual Worked\n(Hrs)', 'Approver\nSignature', 'Remarks',
];

export default function LatestTimesheetWorkTable({
  month, year, workData, totalActual, onUpdateDayEntry, readOnly = false,
}: LatestTimesheetWorkTableProps) {
  const COLS = 10;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    let newRow = rowIndex;
    let newCol = colIndex;
    if (e.key === 'ArrowUp') { e.preventDefault(); newRow = rowIndex - 1; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); newRow = rowIndex + 1; }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); newCol = colIndex - 1; if (newCol < 0) { newCol = COLS - 1; newRow = rowIndex - 1; } }
    else if (e.key === 'ArrowRight') { e.preventDefault(); newCol = colIndex + 1; if (newCol >= COLS) { newCol = 0; newRow = rowIndex + 1; } }
    else return;
    if (newRow < 0 || newRow >= workData.length || newCol < 0 || newCol >= COLS) return;
    const target = document.querySelector<HTMLInputElement>(`[data-ltw-row="${newRow}"][data-ltw-col="${newCol}"]`);
    if (target) target.focus();
  };

  const thStyle: React.CSSProperties = {
    border: thinBorder,
    background: LIGHT_GREEN,
    fontWeight: 700,
    fontSize: 9.5,
    padding: '3px 2px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.15,
  };

  const inputCellStyle = (bg = '#fff'): React.CSSProperties => ({
    border: thinBorder,
    background: bg,
    padding: '1px 2px',
    textAlign: 'center',
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    textAlign: 'center',
    fontSize: 10,
    fontFamily: FONT,
  };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, border: '1px solid #000', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '13%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '10%' }} />
      </colgroup>
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th
              key={i}
              style={{
                ...thStyle,
                ...(i === 0 ? { borderLeft: doubleBorder } : {}),
                ...(i === headers.length - 1 ? { borderRight: doubleBorder } : {}),
              }}
            >
              {h.split('\n').map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < h.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {/* WORK SHIFT divider row — matches excel row 7 */}
        <tr>
          <td colSpan={7} style={{ border: thinBorder, borderLeft: doubleBorder, textAlign: 'right', fontWeight: 700, fontSize: 10, padding: '2px 8px', background: '#fff' }}>
            WORK SHIFT :
          </td>
          <td colSpan={4} style={{ border: thinBorder, borderRight: doubleBorder, background: '#fff' }} />
        </tr>

        {workData.map((entry, rowIndex) => {
          const weekend = isFriday(year, month, entry.day);
          const dateBg = weekend ? YELLOW : '#fff';
          const dateColor = weekend ? '#FF0000' : '#000';

          return (
            <tr key={entry.day}>
              <td style={{ border: thinBorder, borderLeft: doubleBorder, background: dateBg, color: dateColor, fontWeight: 700, fontSize: 9.5, padding: '1px 4px', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {formatDate(year, month, entry.day)}
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.timeIn} onChange={e => onUpdateDayEntry(entry.day, 'timeIn', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 0)} data-ltw-row={rowIndex} data-ltw-col={0}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.timeOutLunch} onChange={e => onUpdateDayEntry(entry.day, 'timeOutLunch', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 1)} data-ltw-row={rowIndex} data-ltw-col={1}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.lunchBreak} onChange={e => onUpdateDayEntry(entry.day, 'lunchBreak', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 2)} data-ltw-row={rowIndex} data-ltw-col={2}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.timeIn2} onChange={e => onUpdateDayEntry(entry.day, 'timeIn2', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 3)} data-ltw-row={rowIndex} data-ltw-col={3}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.timeOut2} onChange={e => onUpdateDayEntry(entry.day, 'timeOut2', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 4)} data-ltw-row={rowIndex} data-ltw-col={4}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle(LIGHT_GREEN)}>
                <input type="number" value={entry.totalDuration || ''} onChange={e => onUpdateDayEntry(entry.day, 'totalDuration', Number(e.target.value))}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 5)} data-ltw-row={rowIndex} data-ltw-col={5}
                  readOnly={readOnly} style={{ ...inputStyle, fontWeight: 700 }} />
              </td>
              <td style={inputCellStyle(YELLOW)}>
                <input type="number" value={entry.overTime || ''} onChange={e => onUpdateDayEntry(entry.day, 'overTime', Number(e.target.value))}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 6)} data-ltw-row={rowIndex} data-ltw-col={6}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={inputCellStyle(LIGHT_GREEN)}>
                <input type="number" value={entry.actualWorked || ''} onChange={e => onUpdateDayEntry(entry.day, 'actualWorked', Number(e.target.value))}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 7)} data-ltw-row={rowIndex} data-ltw-col={7}
                  readOnly={readOnly} style={{ ...inputStyle, fontWeight: 700 }} />
              </td>
              <td style={inputCellStyle()}>
                <input type="text" value={entry.approverSig} onChange={e => onUpdateDayEntry(entry.day, 'approverSig', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 8)} data-ltw-row={rowIndex} data-ltw-col={8}
                  readOnly={readOnly} style={inputStyle} />
              </td>
              <td style={{ ...inputCellStyle(), borderRight: doubleBorder }}>
                <input type="text" value={entry.remarks} onChange={e => onUpdateDayEntry(entry.day, 'remarks', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, rowIndex, 9)} data-ltw-row={rowIndex} data-ltw-col={9}
                  readOnly={readOnly} style={inputStyle} />
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan={8} style={{ border: thinBorder, borderLeft: doubleBorder, borderBottom: doubleBorder, textAlign: 'right', fontWeight: 700, fontSize: 10.5, padding: '3px 8px', background: '#fff' }}>
            TOTAL WORKED HOURS
          </td>
          <td style={{ border: thinBorder, borderBottom: doubleBorder, background: LIGHT_GREEN, fontWeight: 700, textAlign: 'center' }}>
            {totalActual || 0}
          </td>
          <td colSpan={2} style={{ border: thinBorder, borderRight: doubleBorder, borderBottom: doubleBorder, background: '#fff' }} />
        </tr>
      </tfoot>
    </table>
  );
}
