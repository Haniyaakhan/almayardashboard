import React from 'react';

interface TunnelEmployeeTimesheetFooterProps {
  totalActual: number;
}

export default function TunnelEmployeeTimesheetFooter({ totalActual }: TunnelEmployeeTimesheetFooterProps) {
  const minHours = 260;
  const diff = Number((totalActual - minHours).toFixed(2));
  const diffLabel = diff > 0 ? `+${diff.toFixed(2)}` : 'NIL';

  return (
    <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', width: '100%' }}>
      <div style={{ display: 'flex', marginBottom: 14, alignItems: 'stretch' }}>
        <div style={{ background: '#1F4E79', flexShrink: 0, width: 70 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1 }}>
            <span style={{ background: '#BDD7EE', color: '#000', fontWeight: 700, fontSize: 8.5, padding: '2px 5px', whiteSpace: 'nowrap' }}>
              YELLOW COLORED COLUMN TO BE FILLED BY STORE KEEPER MANUALLY
            </span>
            <div style={{ flex: 1, background: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, marginTop: 2 }}>
            <span style={{ background: '#BDD7EE', color: '#000', fontWeight: 700, fontSize: 8.5, padding: '2px 5px', whiteSpace: 'nowrap' }}>
              {"PLEASE DELETE \"24 \" AND \"1\" IF THERE IS NO WORK THEN THE TOTAL WK. HRS WILL BE ZERO"}
            </span>
            <div style={{ flex: 1, background: '#fff' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: 20, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '48%' }}>
              <div style={{ marginBottom: 30 }}>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: 2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                  <span>Store keeper Sign</span>
                  <span>Date</span>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: 2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                  <span>Driver Sign</span>
                  <span>Date</span>
                </div>
              </div>
              <div>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: 2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                  <span>Foreman/Site Engineer</span>
                  <span>Date</span>
                </div>
              </div>
            </div>
            <div style={{ width: '48%', marginLeft: '4%' }}>
              <div>
                <div style={{ borderTop: '1.5px solid #000', marginBottom: 2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5 }}>
                  <span>Project Manager Signature</span>
                  <span>Date</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, marginTop: 6, whiteSpace: 'nowrap' }}>
            Note: Vehicles using more than 12 hrs / day should mention the reason in the remarks column
          </div>
        </div>

        <div style={{ minWidth: 290 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <tbody>
              <tr>
                <td style={{ textAlign: 'right', padding: '2px 4px', whiteSpace: 'nowrap', fontWeight: 700 }}>Minimum Working&nbsp;Hours</td>
                <td style={{ background: '#F4B183', textAlign: 'right', width: 70, fontWeight: 700, padding: '2px 5px' }}>{minHours.toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '2px 4px', whiteSpace: 'nowrap', fontWeight: 700 }}>Over Time (+ value) / Less Worked (- Value)</td>
                <td style={{ background: '#F4B183', textAlign: 'right', width: 70, fontWeight: 700, padding: '2px 5px' }}>{diffLabel}</td>
              </tr>
              <tr>
                <td style={{ textAlign: 'right', padding: '2px 4px', whiteSpace: 'nowrap', fontWeight: 700, borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>TOTAL WORKED HOURS</td>
                <td style={{ textAlign: 'right', width: 70, fontWeight: 700, padding: '2px 5px', borderTop: '1.5px solid #000', borderBottom: '1.5px solid #000' }}>{totalActual.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
