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
  vehicleUse?: 'site' | 'both';
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
  vehicleUse = 'site',
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
    height: 24,
  };

  return (
    <div style={{ width: '100%', fontFamily: 'Arial, Helvetica, sans-serif' }}>

      {/* ── HEADER TOP TRACK ── */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', height: 56 }}>

        {/* Three logos */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          zIndex: 2,
          background: '#fcfcfc',
          paddingRight: 6,
          flexShrink: 0,
        }}>
          {['/logo1.jpg', '/logo2.jpeg', '/logo3.png'].map((src, index) => (
            <div key={index} style={{
              height: 56,
              width: index < 2 ? 96 : 84,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={src}
                alt={`Logo ${index + 1}`}
                style={{ height: '100%', width: '100%', objectFit: 'contain' }}
              />
            </div>
          ))}
        </div>

        {/* Title strip — left: 3×84 + 2×3 gaps + 6 padding = 261px */}
        <div style={{
          background: '#f7cb99',
          fontSize: 12,
          fontWeight: 700,
          color: '#000',
          position: 'absolute',
          left: 288,
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
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: -4,
        marginBottom: 0,
      }}>

        {/* Vehicle row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '58%' }}>
          <div style={{ ...labelStyle, textAlign: 'right', flexGrow: 1, marginRight: 6 }}>
            VEHICLE USED FOR SITE WORK
          </div>
          <div style={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            height: 28,
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

        {/* LPO row */}
          <div style={{ display: 'flex', alignItems: 'center', width: '58%', marginTop: 0 }}>
          <div style={{ ...labelStyle, textAlign: 'right', flexGrow: 1, marginRight: 6 }}>
            LPO:
          </div>
          <div style={{
            width: 220,
            flexShrink: 0,
            height: 28,
            border: '1.5px solid #000',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0',
            justifyContent: 'center',
          }}>
            <input
              type="text"
              value={lpoNumber}
              onChange={(e) => onLpoNumberChange(e.target.value)}
              readOnly={readOnly}
              placeholder=""
              style={{ ...inputStyle, padding: '0 10px', textAlign: 'center', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* ── MAIN BODY GRID ── */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>

        {/* ROW 1: TROJAN TUNNELLING LLC  |  Labour Working at Site */}
        <div style={rowStyle}>
          <div style={{ width: '48%' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#000' }}>
              TROJAN TUNNELLING LLC
            </div>
          </div>
          <div style={{ width: '52%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, flexGrow: 1, marginRight: 4, textAlign: 'right' }}>
              Labour Working at Site:
            </div>
            <div style={{
              ...cellStyle,
              width: 220,
              flexShrink: 0,
              height: 28,
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
            }}>
              {workSite}
            </div>
          </div>
        </div>

        {/* ROW 2: Project Name */}
        <div style={rowStyle}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Project Name :</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 22 }}>
              <input
                type="text"
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                readOnly={readOnly}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ width: '52%' }} />
        </div>

        {/* ROW 3: Supplier Name  |  Site Engineer / Foreman Name */}
        <div style={rowStyle}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Supplier Name:</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 22 }}>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => onSupplierNameChange(e.target.value)}
                readOnly={readOnly}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ width: '52%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, flexGrow: 1, marginRight: 4, textAlign: 'right' }}>
              Site Engineer / Foreman Name:
            </div>
            <div style={{ ...cellStyle, width: 220, flexShrink: 0, height: 28 }}>
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
        <div style={rowStyle}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Labour Name :</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 22 }}>
              <input
                type="text"
                value={laborName}
                onChange={(e) => onLaborNameChange(e.target.value)}
                readOnly={readOnly}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ width: '52%' }} />
        </div>

        {/* ROW 5: Designation  |  Month */}
        <div style={rowStyle}>
          <div style={{ width: '48%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, width: 88 }}>Designation:</div>
            <div style={{ ...cellStyle, flexGrow: 1, height: 22 }}>
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

          <div style={{ width: '52%', display: 'flex', alignItems: 'center', height: '100%' }}>
            <div style={{ ...labelStyle, textTransform: 'none', marginRight: 4 }}>Month</div>
            <div style={{ ...cellStyle, width: 220, flexShrink: 0, height: 28 }}>
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