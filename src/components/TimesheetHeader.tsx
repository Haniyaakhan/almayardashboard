import React from 'react';

export default function TimesheetHeader({ 
  title = 'Labor Time Sheet',
  timesheetType = 'labor'
}: { 
  title?: string;
  timesheetType?: 'labor' | 'vehicle' | 'equipment';
}) {
  return (
    <div className="mb-0" style={{ fontStyle: 'normal' }}>
      {/* 2-column layout: Logo | Content */}
      <div style={{ display: 'flex', gap: '35px', alignItems: 'stretch' }}>
        {/* Logo */}
        <div style={{ width: '144px', flexShrink: 0, alignItems: 'center',marginTop:'6px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/npclogo.png"
            alt="NPC Logo"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          />
        </div>

        {/* Right side: Title + center text + SITE USE boxes */}
        <div style={{ flex: 1 }}>
          {/* Title bar */}
          <div
            className="border border-black bg-timesheet-bg"
            style={{
              padding: '3px 20px',
              fontSize: '19px',
              // fontWeight: 'bold',
              textAlign: 'center',
              fontStyle: 'normal',
            }}
          >
            {title}
          </div>

          {/* Below title: center text on left, SITE USE on right */}
          <div style={{ display: 'flex', marginTop: '1px' }}>
            {/* Center text area */}
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontStyle: 'normal', fontWeight: 'normal', marginRight: '100px',marginTop:'4px', }}>
                {timesheetType === 'labor' ? 'Labor Working At Site' : 'Working At Site'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'normal', fontStyle: 'normal', marginTop: '2px', marginRight: '70px' }}>
                LPO
              </div>
            </div>

            {/* SITE USE boxes - normal flow, no absolute/spanning */}
            <table
              style={{
                borderCollapse: 'collapse',
                fontSize: '12px',
                fontWeight: 'normal',
                fontStyle: 'normal',
                flexShrink: 0,
                width: '180px',
                marginTop:'6px',
                tableLayout: 'fixed',
              }}
            >
              <tbody>
                <tr>
                  <td
                    className="border border-black"
                    style={{ padding: '3px 10px', textAlign: 'center' }}
                  >
                    SITE USE
                  </td>
                  <td
                    className="border border-black"
                    style={{ padding: '3px 18px', textAlign: 'center' }}
                  >
                    BOTH
                  </td>
                </tr>
                <tr>
                  <td
                    className="border border-black"
                    colSpan={2}
                    style={{ padding: '3px 8px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    I069B/Contracts/MSA-001
                  </td>
                </tr>
                <tr>
                  <td
                    className="border border-black"
                    colSpan={2}
                    style={{ height: '14px' }}
                  >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
