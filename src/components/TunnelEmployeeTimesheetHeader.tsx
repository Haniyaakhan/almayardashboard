import React from 'react';
import { MONTH_NAMES } from '@/lib/dateUtils';

interface TunnelEmployeeTimesheetHeaderProps {
  title?: string;
  projectName: string;
  supplierName: string;
  siteEngineerName: string;
  siteEngineerId?: string;
  laborName: string;
  designation: string;
  projectCode?: string;
  lpoNumber?: string;
  timesheetType?: 'tunnel_employee';
  month: number;
  year: number;
  onProjectNameChange: (value: string) => void;
  onSupplierNameChange: (value: string) => void;
  onSiteEngineerNameChange: (value: string) => void;
  onSiteEngineerIdChange: (value: string) => void;
  onLaborNameChange: (value: string) => void;
  onDesignationChange: (value: string) => void;
  onLpoNumberChange: (value: string) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  workSite?: string;
  readOnly?: boolean;
}

// Width of the right-column value boxes — all four boxes share this exact width
const RIGHT_BOX_WIDTH = 220;

// Logo image height — used for header container and title strip offset
const LOGO_HEIGHT = 52;
// Logo image width — title strip left offset matches this
const LOGO_WIDTH = 260;

export default function TunnelEmployeeTimesheetHeader({
  title = 'Labour Time Sheet',
  projectName,
  supplierName,
  siteEngineerName,
  siteEngineerId = '',
  laborName,
  designation,
  projectCode = 'TT001',
  lpoNumber = '',
  month,
  year,
  onProjectNameChange,
  onSupplierNameChange,
  onSiteEngineerNameChange,
  onSiteEngineerIdChange,
  onLaborNameChange,
  onDesignationChange,
  onLpoNumberChange,
  onMonthChange,
  onYearChange,
  workSite = 'TUNNEL 1',
  readOnly = false,
}: TunnelEmployeeTimesheetHeaderProps) {

  const cellStyle: React.CSSProperties = {
    border: '1.5px solid #000',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    color: '#000',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  const inputStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    padding: '0 4px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minHeight: 24,
  };

  // Shared right-column layout: label pushes left, box is fixed RIGHT_BOX_WIDTH
  const rightColStyle: React.CSSProperties = {
    width: '52%',
    display: 'flex',
    alignItems: 'center',
    height: '100%',
  };

  const rightLabelStyle: React.CSSProperties = {
    ...labelStyle,
    flexGrow: 1,
    marginRight: 6,
    textAlign: 'right',
  };

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* ── HEADER TOP TRACK ── */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: LOGO_HEIGHT }}>

        {/* Single combined logo image */}
        <div style={{
          zIndex: 2,
          background: '#fcfcfc',
          flexShrink: 0,
        }}>
          <img
            src="/TUNNEL-LOGO.jpg"
            alt="Trojan Tunnelling Logo"
            style={{
              height: 60,
              width: 270,
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Title strip — left edge = LOGO_WIDTH */}
        <div style={{
          background: '#f7cb99',
          fontSize: 12,
          fontWeight: 700,
          color: '#000',
          position: 'absolute',
          left: LOGO_WIDTH,
          right: -12,
          top: 0,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {title}
        </div>
      </div>

      {/* ── VEHICLE + LPO BLOCK ── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: -20 }}>

        {/* Vehicle row */}
        <div style={{ ...rowStyle, height: 26 }}>
          <div style={{ width: '48%' }} />
          <div style={rightColStyle}>
            <div style={rightLabelStyle}>VEHICLE USED FOR SITE WORK</div>
            <div style={{
              width: RIGHT_BOX_WIDTH,
              flexShrink: 0,
              display: 'flex',
              height: 24,
              border: '1.5px solid #000',
              background: '#fff',
            }}>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                borderRight: '1.5px solid #000',
                background: '#fff',
                cursor: readOnly ? 'default' : 'pointer',
              }}>
                SITE USE
              </div>
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                background: '#fff',
                cursor: readOnly ? 'default' : 'pointer',
              }}>
                BOTH
              </div>
            </div>
          </div>
        </div>

        {/* LPO row */}
        <div style={{ ...rowStyle, height: 26 }}>
          <div style={{ width: '48%' }} />
          <div style={rightColStyle}>
            <div style={rightLabelStyle}>LPO:</div>
            <div style={{
              width: RIGHT_BOX_WIDTH,
              flexShrink: 0,
              height: 24,
              border: '1.5px solid #000',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
            }}>
              <input
                type="text"
                value={lpoNumber}
                onChange={(e) => onLpoNumberChange(e.target.value)}
                readOnly={readOnly}
                placeholder=""
                style={{ ...inputStyle, padding: '0 10px', textAlign: 'center' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* ── MAIN BODY GRID ── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', marginTop: -6 }}>

        {/* ROW 1: TROJAN TUNNELLING LLC  |  Labour Working at Site */}
        <div style={{ ...rowStyle, height: 26 }}>
          <div style={{ width: '48%' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>
              TROJAN TUNNELLING LLC
            </div>
          </div>
          <div style={rightColStyle}>
            <div style={rightLabelStyle}>Labour Working at Site:</div>
            <div style={{
              ...cellStyle,
              width: RIGHT_BOX_WIDTH,
              flexShrink: 0,
              height: 24,
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
            }}>
              {workSite}
            </div>
          </div>
        </div>

        {/* ROW 2: Project Name */}
        <div style={{ ...rowStyle, minHeight: 40 }}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'stretch', minHeight: 40 }}>
            <div style={{ ...labelStyle, width: 88, display: 'flex', alignItems: 'center' }}>
              Project Name :
            </div>
            <div style={{ ...cellStyle, flexGrow: 1, minHeight: 40, alignItems: 'flex-start', padding: '2px 0' }}>
              <textarea
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                readOnly={readOnly}
                rows={2}
                style={{ ...inputStyle, alignSelf: 'flex-start', paddingTop: 2, resize: 'none', overflow: 'hidden', fontSize: 11 }}
              />
            </div>
          </div>
          <div style={{ width: '52%' }} />
        </div>

        {/* ROW 3: Supplier Name  |  Site Engineer / Foreman Name */}
        <div style={{ ...rowStyle, height: 26 }}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Supplier Name:</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 24 }}>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => onSupplierNameChange(e.target.value)}
                readOnly={readOnly}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={rightColStyle}>
            <div style={rightLabelStyle}>Site Engineer / Foreman Name:</div>
            <div style={{ ...cellStyle, width: RIGHT_BOX_WIDTH, flexShrink: 0, height: 24 }}>
              <div style={{ flexGrow: 1 }}>
                <input
                  type="text"
                  value={siteEngineerName}
                  onChange={(e) => onSiteEngineerNameChange(e.target.value)}
                  readOnly={readOnly}
                  style={inputStyle}
                />
              </div>
              <div style={{
                width: 24,
                borderLeft: '1.5px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                flexShrink: 0,
                alignSelf: 'stretch',
              }}>
                ID :
              </div>
              <div style={{
                width: 40,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <input
                  type="text"
                  value={siteEngineerId}
                  onChange={(e) => onSiteEngineerIdChange(e.target.value)}
                  readOnly={readOnly}
                  style={{ ...inputStyle, textAlign: 'center' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ROW 4: Labour Name */}
        <div style={{ ...rowStyle, height: 36 }}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Labour Name :</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 34 }}>
              <input
                type="text"
                value={laborName}
                onChange={(e) => onLaborNameChange(e.target.value)}
                readOnly={readOnly}
                style={{ ...inputStyle, fontSize: 11 }}
              />
            </div>
          </div>
          <div style={{ width: '52%' }} />
        </div>

        {/* ROW 5: Designation  |  Month */}
        <div style={{ ...rowStyle, height: 36 }}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Designation:</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 34 }}>
              <div style={{
                width: 72,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => onDesignationChange(e.target.value)}
                  readOnly={readOnly}
                  style={{ ...inputStyle, textAlign: 'center' }}
                />
              </div>
              <div style={{
                padding: '0 5px',
                fontSize: 9,
                fontWeight: 700,
                borderLeft: '1.5px solid #000',
                borderRight: '1.5px solid #000',
                background: '#fcfcfc',
                whiteSpace: 'nowrap',
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
              }}>
                PROJECT CODE :
              </div>
              <div style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
              }}>
                {projectCode}
              </div>
            </div>
          </div>

          <div style={rightColStyle}>
            <div style={rightLabelStyle}>
              Month
            </div>
            <div style={{ ...cellStyle, width: RIGHT_BOX_WIDTH, flexShrink: 0, height: 34 }}>
              <div style={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRight: '1.5px solid #000',
                alignSelf: 'stretch',
              }}>
                <select
                  value={month}
                  onChange={(e) => onMonthChange(Number(e.target.value))}
                  disabled={readOnly}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 9,
                    fontWeight: 700,
                    width: '100%',
                    textAlign: 'center',
                    appearance: 'none',
                    cursor: readOnly ? 'default' : 'pointer',
                  }}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={index}>{name}</option>
                  ))}
                </select>
              </div>
              <div style={{
                width: 70,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700 }}>YEAR -</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => onYearChange(Number(e.target.value))}
                  min={2020}
                  max={2040}
                  readOnly={readOnly}
                  style={{
                    width: 36,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 9,
                    fontWeight: 700,
                    textAlign: 'center',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}