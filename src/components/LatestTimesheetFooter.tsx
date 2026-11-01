import React from 'react';

interface LatestTimesheetFooterProps {
  totalActual: number;
}

// ── Exact palette extracted from TIMESHEET I069A SEP 2026(SAMPLE).xlsx ──
const LIGHT_BLUE = '#B8D4F0';
const PEACH = '#FFCC99';
const YELLOW = '#FFFF00';
const FONT = "'Arial Narrow', Arial, Helvetica, sans-serif";
const thinBorder = '1px solid #000';

export default function LatestTimesheetFooter({ totalActual }: LatestTimesheetFooterProps) {
  const minHours = 260;
  const diff = Number((totalActual - minHours).toFixed(2));
  const diffLabel = diff > 0 ? `+${diff.toFixed(2)}` : diff < 0 ? diff.toFixed(2) : 'NIL';

  const noBorder: React.CSSProperties = { border: 'none' };
  const signLabelStyle: React.CSSProperties = { border: 'none', borderTop: thinBorder, fontSize: 9.5, padding: '4px 6px 2px', textAlign: 'left' };
  const summaryLabelStyle: React.CSSProperties = { border: 'none', fontSize: 9.5, fontWeight: 700, padding: '3px 6px', textAlign: 'right' };
  const summaryValueStyle: React.CSSProperties = { border: 'none', textAlign: 'center', fontWeight: 700, fontSize: 9.5, padding: '3px 4px' };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, border: 'none', tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '13%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} />
        <col style={{ width: '13%' }} /><col style={{ width: '10%' }} />
      </colgroup>
      <tbody>
        {/* Note banner — left-aligned, columns B:H only, matching the xlsx merge */}
        <tr>
          <td style={noBorder} />
          <td colSpan={7} style={{ background: LIGHT_BLUE, color: '#000', fontWeight: 700, fontSize: 9, padding: '4px 8px', textAlign: 'left', border: 'none', whiteSpace: 'nowrap' }}>
            YELLOW COLORED COLUMN TO BE FILLED BY TIME KEEPER MANUALLY
          </td>
          <td colSpan={3} style={noBorder} />
        </tr>

        {/* Row 41 — Store keeper Sign | Date .... Minimum Working Hours | 260.00 */}
        <tr>
          <td colSpan={2} style={signLabelStyle}>Store keeper Sign</td>
          <td style={signLabelStyle}>Date</td>
          <td colSpan={4} style={noBorder} />
          <td colSpan={3} style={summaryLabelStyle}>Minimum Working Hours</td>
          <td style={{ ...summaryValueStyle, background: PEACH }}>{minHours.toFixed(2)}</td>
        </tr>

        {/* Row 42 — (blank) .... Over Time (+/-) | value */}
        <tr>
          <td colSpan={3} style={noBorder} />
          <td colSpan={4} style={noBorder} />
          <td colSpan={3} style={summaryLabelStyle}>Over Time (+ value) / Less Worked (- Value)</td>
          <td style={{ ...summaryValueStyle, background: PEACH }}>{diffLabel}</td>
        </tr>

        {/* Row 43 — (blank) .... TOTAL WORKED HOURS | value */}
        <tr>
          <td colSpan={2} style={noBorder} />
          <td colSpan={5} style={noBorder} />
          <td colSpan={2} style={{ ...summaryLabelStyle, borderTop: thinBorder, borderBottom: thinBorder }}>TOTAL WORKED HOURS</td>
          <td style={{ ...summaryValueStyle, borderTop: thinBorder, borderBottom: thinBorder }}>{totalActual.toFixed(2)}</td>
        </tr>

        {/* Row 44 — Driver Sign | Date */}
        <tr>
          <td colSpan={2} style={signLabelStyle}>Driver Sign</td>
          <td style={signLabelStyle}>Date</td>
          <td colSpan={8} style={noBorder} />
        </tr>

        {/* Row 45 — Foreman/Site Engineer | Date .... Project Manager Signature | Date */}
        <tr>
          <td colSpan={2} style={signLabelStyle}>Foreman/Site Engineer</td>
          <td style={signLabelStyle}>Date</td>
          <td colSpan={2} style={noBorder} />
          <td colSpan={2} style={signLabelStyle}>Project Manager Signature</td>
          <td style={signLabelStyle}>Date</td>
          <td colSpan={3} style={noBorder} />
        </tr>

        {/* Row 46 — Note */}
        <tr>
          <td colSpan={8} style={{ border: 'none', fontSize: 9.5, fontWeight: 700, padding: '4px 6px 2px', textAlign: 'left' }}>
            Note: Vehicles using more than 12 hrs / day should mention the reason in the remarks column
          </td>
          <td colSpan={3} style={noBorder} />
        </tr>

        {/* Row 47 — RATE/MONTH (yellow highlight across the whole box) */}
        <tr>
          <td colSpan={8} style={noBorder} />
          <td colSpan={2} style={{ border: 'none', background: YELLOW, fontSize: 9.5, fontWeight: 700, padding: '1px 6px', textAlign: 'left' }}>RATE/MONTH</td>
          <td style={{ border: 'none', background: YELLOW, padding: '1px 4px' }} />
        </tr>

        {/* Row 48 — INVOICE AMT */}
        <tr>
          <td colSpan={8} style={noBorder} />
          <td colSpan={2} style={{ border: 'none', fontSize: 9.5, fontWeight: 700, padding: '1px 6px', textAlign: 'left' }}>INVOICE AMT</td>
          <td style={{ border: 'none', textAlign: 'center', fontSize: 9.5, padding: '1px 4px' }}>-</td>
        </tr>
      </tbody>
    </table>
  );
}
