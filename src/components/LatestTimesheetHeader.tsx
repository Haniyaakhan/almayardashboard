import React from 'react';
import { MONTH_NAMES } from '@/lib/dateUtils';
import type { TimesheetShift } from '@/types/timesheet';

interface LatestTimesheetHeaderProps {
  title?: string;
  projectName: string;
  supplierName: string;
  siteEngineerName: string;
  siteEngineerId?: string;
  laborName: string;
  designation: string;
  lpoNumber?: string;
  shift: TimesheetShift;
  month: number;
  year: number;
  onProjectNameChange: (value: string) => void;
  onSupplierNameChange: (value: string) => void;
  onSiteEngineerNameChange: (value: string) => void;
  onSiteEngineerIdChange: (value: string) => void;
  onLaborNameChange: (value: string) => void;
  onDesignationChange: (value: string) => void;
  onLpoNumberChange: (value: string) => void;
  onShiftChange: (shift: TimesheetShift) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  readOnly?: boolean;
}

// ── Exact palette + labels extracted from TIMESHEET I069A SEP 2026(SAMPLE).xlsx ──
// Labels are verbatim from the xlsx ("Vehicle Type:", "Vechicle NO", "Driver Name:", "Site Engineer Name:")
// even though this sheet is repurposed for labour data — only the VALUES bound to each
// box map to the tunnel2 data model (laborName sits under "Vehicle Type:", etc.)
const NAVY = '#264653';
const TEAL = '#2A9D8F';
const FONT = "'Arial Narrow', Arial, Helvetica, sans-serif";
const thinBorder = '1px solid #000';

export default function LatestTimesheetHeader({
  title = 'Vehicle Time Sheet',
  projectName,
  supplierName,
  siteEngineerName,
  siteEngineerId = '',
  laborName,
  designation,
  lpoNumber = '',
  shift,
  month,
  year,
  onProjectNameChange,
  onSupplierNameChange,
  onSiteEngineerNameChange,
  onSiteEngineerIdChange,
  onLaborNameChange,
  onDesignationChange,
  onLpoNumberChange,
  onShiftChange,
  onMonthChange,
  onYearChange,
  readOnly = false,
}: LatestTimesheetHeaderProps) {
  // The xlsx header block (rows 1-5) has almost no cell borders — label/value boxes
  // are just solid color blocks sitting next to each other, with only a couple of
  // "thick" left-edge dividers (applied below via dividerLeftStyle). The work table
  // below this header is the part that has the full grid of borders.
  const labelCellStyle: React.CSSProperties = {
    background: NAVY,
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    padding: '4px 6px',
    whiteSpace: 'nowrap',
  };

  const valueCellStyle: React.CSSProperties = {
    background: TEAL,
    padding: 0,
  };

  // Vertical divider matching the xlsx's "thick" left border on the first label
  // cell of each group (column A/logo | Project.../Vehicle... | LPO/Driver/Site Eng.)
  const dividerLeftStyle: React.CSSProperties = { borderLeft: '2px solid #000' };

  const inputStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: '#fff',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    padding: '4px 6px',
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Logo — floats as an overlay spanning the FULL header height (rows 1-5), exactly like the
          floating picture anchored over column A in the xlsx. Kept outside the table so it never
          has to compete with row 1 for column-A space (which would shrink it or break centering). */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '13%',
        padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <img src="/latest-timesheet-logo.png" alt="NPC Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
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
      <tbody>
        {/* Row 1 — standalone full-width title bar, truly centered across the whole sheet (logo starts on row 2) */}
        <tr>
          <td colSpan={11} style={{ background: NAVY, color: '#fff', fontSize: 15, fontWeight: 700, textAlign: 'center', padding: '7px 0', borderTop: '3px solid #000' }}>
            {title}
          </td>
        </tr>

        {/* Row 2 — Project Name: | LPO No: */}
        <tr>
          {/* Column A, rows 2-5 — blank navy background; the logo image floats on top as an absolute overlay above */}
          <td rowSpan={4} style={{ background: NAVY }} />
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Project Name:</td>
          <td colSpan={4} style={valueCellStyle}>
            <input type="text" value={projectName} onChange={e => onProjectNameChange(e.target.value)} readOnly={readOnly} style={inputStyle} />
          </td>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>LPO No:</td>
          <td colSpan={2} style={valueCellStyle}>
            <input type="text" value={lpoNumber} onChange={e => onLpoNumberChange(e.target.value)} readOnly={readOnly} style={inputStyle} />
          </td>
        </tr>

        {/* Row 3 — Supplier Name: | Driver Name: (decorative — no tunnel2 field maps here, matches xlsx) */}
        <tr>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Supplier Name:</td>
          <td colSpan={4} style={valueCellStyle}>
            <input type="text" value={supplierName} onChange={e => onSupplierNameChange(e.target.value)} readOnly={readOnly} style={inputStyle} />
          </td>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Driver Name:</td>
          <td colSpan={2} style={valueCellStyle} />
        </tr>

        {/* Row 4 — Vehicle Type: (holds Labour Name) | Site Engineer Name: (holds name + ID) */}
        <tr>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Vehicle Type:</td>
          <td colSpan={4} style={{ ...valueCellStyle, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
              <input
                type="text" value={laborName} onChange={e => onLaborNameChange(e.target.value)} readOnly={readOnly}
                style={{ ...inputStyle, fontSize: 11, fontWeight: 700, flex: '1 1 0%', minWidth: 0, width: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
              />
              <select
                value={shift} onChange={e => onShiftChange(e.target.value as TimesheetShift)} disabled={readOnly}
                title="Day / Night shift"
                style={{
                  border: 'none', borderLeft: thinBorder, outline: 'none', background: shift === 'night' ? '#1b2f38' : 'transparent',
                  color: '#fff', fontSize: 10, fontWeight: 700, width: 64, flexShrink: 0, height: '100%',
                  textAlign: 'center', appearance: 'none', cursor: readOnly ? 'default' : 'pointer', padding: '4px 2px',
                }}
              >
                <option value="day" style={{ color: '#000' }}>☀ Day</option>
                <option value="night" style={{ color: '#000' }}>🌙 Night</option>
              </select>
            </div>
          </td>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Site Engineer Name:</td>
          <td colSpan={2} style={valueCellStyle}>
            <input
              type="text" value={siteEngineerName} onChange={e => onSiteEngineerNameChange(e.target.value)} readOnly={readOnly}
              style={{ ...inputStyle, overflow: 'hidden', textOverflow: 'ellipsis' }}
            />
          </td>
        </tr>

        {/* Row 5 — Vechicle NO (holds Designation) | Year: | Month: */}
        <tr>
          <td colSpan={2} style={{ ...labelCellStyle, ...dividerLeftStyle }}>Vechicle NO</td>
          <td colSpan={4} style={valueCellStyle}>
            <input type="text" value={designation} onChange={e => onDesignationChange(e.target.value)} readOnly={readOnly} style={inputStyle} />
          </td>
          <td style={{ ...labelCellStyle, ...dividerLeftStyle }}>Year:</td>
          <td style={labelCellStyle}>
            <input
              type="number" value={year} onChange={e => onYearChange(Number(e.target.value))}
              min={2020} max={2040} readOnly={readOnly}
              style={{ ...inputStyle, textAlign: 'center', padding: 0 }}
            />
          </td>
          <td style={{ background: TEAL, color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 6px', whiteSpace: 'nowrap' }}>Month:</td>
          <td style={valueCellStyle}>
            <select
              value={month} onChange={e => onMonthChange(Number(e.target.value))} disabled={readOnly}
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                color: '#fff', fontSize: 10, fontWeight: 700, width: '100%',
                textAlign: 'center', appearance: 'none', cursor: readOnly ? 'default' : 'pointer', padding: '4px 0',
              }}
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index} style={{ color: '#000' }}>{name}</option>
              ))}
            </select>
          </td>
        </tr>
      </tbody>
      </table>
    </div>
  );
}
