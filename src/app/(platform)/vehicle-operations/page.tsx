'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useVendors, createVendor } from '@/hooks/useVendors';
import { useMachines, createMachine } from '@/hooks/useMachines';
import { useTimesheetHistory } from '@/hooks/useTimesheetHistory';
import { PageSpinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { machineStatusBadge } from '@/components/ui/Badge';
import { VendorForm } from '@/components/vendors/VendorForm';
import { MachineForm } from '@/components/machines/MachineForm';
import { useToast } from '@/components/ui/Toast';
import { Truck, Plus, Search, Pencil, Settings2, ClipboardList, X } from 'lucide-react';

const vehicleTypes = ['All', 'Tipper', 'Pickup', 'Crane', 'Forklift', 'Trailer', 'Tanker'];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

type VehicleTab = 'Vehicles' | 'Contractors' | 'Timesheets';

export default function VehicleOperationsPage() {
  const { machines, loading: machinesLoading, refetch: refetchMachines } = useMachines();
  const { vendors, loading: vendorsLoading, refetch: refetchVendors } = useVendors();
  const { timesheets, loading: timesheetsLoading } = useTimesheetHistory();
  const toast = useToast();
  const [tab, setTab] = useState<VehicleTab>('Vehicles');
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [timesheetVehicleTypeFilter, setTimesheetVehicleTypeFilter] = useState('All');
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);

  const vehicleMachineIds = new Set(machines.filter((m) => m.category === 'vehicle').map((m) => m.id));

  const vehicles = machines.filter((m) => {
    if (m.category !== 'vehicle') return false;
    const q = search.toLowerCase();
    const matchSearch =
      m.name.toLowerCase().includes(q) ||
      m.type.toLowerCase().includes(q) ||
      (m.plate_number || '').toLowerCase().includes(q);
    const matchFilter = vehicleFilter === 'All' || m.type.toLowerCase().includes(vehicleFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  const contractors = vendors.filter((v) => {
    const q = search.toLowerCase();
    return v.name.toLowerCase().includes(q) || (v.contact_person || '').toLowerCase().includes(q);
  });

  const approvedVehicleTimesheets = timesheets.filter((ts) => {
    const isVehicle = (ts.laborer_id && vehicleMachineIds.has(ts.laborer_id)) || ts.sheet_type === 'vehicle';
    if (!isVehicle || ts.status !== 'approved') return false;
    const machine = machines.find((m) => m.id === ts.laborer_id);
    const machineType = machine?.type ?? '';
    const matchType = timesheetVehicleTypeFilter === 'All' || machineType.toLowerCase().includes(timesheetVehicleTypeFilter.toLowerCase());
    if (!matchType) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      (machine?.name ?? ts.labor_name ?? '').toLowerCase().includes(q) ||
      (machine?.plate_number ?? ts.designation ?? '').toLowerCase().includes(q) ||
      `${MONTHS[ts.month]} ${ts.year}`.toLowerCase().includes(q)
    );
  });

  if (machinesLoading || vendorsLoading || timesheetsLoading) return <PageSpinner />;

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
        flexWrap: 'wrap',
        gap: 10,
      }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['Vehicles', 'Contractors', 'Timesheets'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 13px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.14s',
                border: tab === t ? '1px solid var(--navy)' : '1px solid var(--border2)',
                background: tab === t ? 'var(--navy)' : 'var(--bg-card)',
                color: tab === t ? '#fff' : 'var(--text-light)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2" style={{
            background: 'var(--bg-card)', borderRadius: 9,
            padding: '7px 13px', border: '1px solid var(--border2)',
          }}>
            <Search size={14} style={{ color: 'var(--text-muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'Vehicles' ? 'Search vehicles...' : tab === 'Contractors' ? 'Search contractors...' : 'Search approved timesheets...'}
              style={{
                border: 'none', background: 'transparent',
                fontSize: '12.5px', color: 'var(--text-light)',
                width: 190, outline: 'none',
              }}
            />
          </div>
          {tab === 'Vehicles' ? (
            <button type="button" onClick={() => setShowVehicleModal(true)} style={actionBtnStyle}><Plus size={14} /> ADD VEHICLE</button>
          ) : tab === 'Contractors' ? (
            <button type="button" onClick={() => setShowContractorModal(true)} style={actionBtnStyle}><Plus size={14} /> ADD CONTRACTOR</button>
          ) : (
            <></>
          )}
        </div>
      </div>

      {tab === 'Vehicles' && (
        <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 12 }}>
          {vehicleTypes.map((t) => (
            <button
              key={t}
              onClick={() => setVehicleFilter(t)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 13px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.14s',
                border: vehicleFilter === t ? '1px solid var(--orange)' : '1px solid var(--border2)',
                background: vehicleFilter === t ? 'var(--orange-lt)' : 'var(--bg-card)',
                color: vehicleFilter === t ? 'var(--orange)' : 'var(--text-light)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'Timesheets' && (
        <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 12 }}>
          {vehicleTypes.map((t) => (
            <button
              key={t}
              onClick={() => setTimesheetVehicleTypeFilter(t)}
              style={{
                fontSize: 12,
                fontWeight: 500,
                padding: '5px 13px',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.14s',
                border: timesheetVehicleTypeFilter === t ? '1px solid var(--orange)' : '1px solid var(--border2)',
                background: timesheetVehicleTypeFilter === t ? 'var(--orange-lt)' : 'var(--bg-card)',
                color: timesheetVehicleTypeFilter === t ? 'var(--orange)' : 'var(--text-light)',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'Vehicles' ? (
        !vehicles.length ? (
          <EmptyState
            icon={<Settings2 size={24} />}
            title="No vehicles found"
            description="Register vehicles to track usage and costs."
            action={<button type="button" onClick={() => setShowVehicleModal(true)} style={actionBtnStyle}><Plus size={14} /> Add Vehicle</button>}
          />
        ) : (
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  {['Company', 'Vehicle Type', 'Code', 'Phone', 'Site', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vehicles.map((m) => (
                  <tr key={m.id} style={rowStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}>{(m.vendor as any)?.name ?? '—'}</td>
                    <td style={tdStyle}>
                      <Link href={`/machines/${m.id}`} style={linkTextStyle}>
                        {m.name} {m.type ? `(${m.type})` : ''}
                      </Link>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{m.plate_number || '—'}</td>
                    <td style={tdStyle}>—</td>
                    <td style={tdStyle}>—</td>
                    <td style={tdStyle}>{machineStatusBadge(m.status)}</td>
                    <td style={tdStyle}>
                      <Link href={`/machines/${m.id}`} title="View / Edit" style={iconBtnStyle}>
                        <Pencil size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : tab === 'Timesheets' ? (
        !approvedVehicleTimesheets.length ? (
          <EmptyState
            icon={<ClipboardList size={24} />}
            title="No approved vehicle timesheets"
            description="Approved vehicle sheets from Vehicle Timesheet module will appear here."
          />
        ) : (
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  {['Vehicle', 'Reg No', 'Operator', 'Month', 'Total Hours', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedVehicleTimesheets.map((ts) => {
                  const machine = machines.find((m) => m.id === ts.laborer_id);
                  return (
                    <tr key={ts.id} style={rowStyle}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={tdStyle}>{machine?.name ?? ts.labor_name ?? '—'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 700 }}>{machine?.plate_number ?? ts.designation ?? '—'}</td>
                      <td style={tdStyle}>{machine?.operator_name ?? ts.labor_name ?? ts.designation ?? '—'}</td>
                      <td style={tdStyle}>{MONTHS[ts.month]} {ts.year}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text-primary)' }}>{ts.total_actual} hrs</td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 9px',
                          borderRadius: 999,
                          color: '#16a34a',
                          background: 'rgba(34,197,94,0.12)',
                          border: '1px solid rgba(34,197,94,0.25)',
                          textTransform: 'uppercase',
                        }}>
                          approved
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link href={`/vehicle-timesheet/history/${ts.id}`} style={iconBtnStyle} title="View">
                          <Pencil size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        !contractors.length ? (
          <EmptyState
            icon={<Truck size={24} />}
            title="No contractors registered"
            description="Add vehicle contractors to track rentals."
            action={<button type="button" onClick={() => setShowContractorModal(true)} style={actionBtnStyle}><Plus size={14} /> Add Contractor</button>}
          />
        ) : (
          <div style={tableWrapStyle}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--thead-bg)' }}>
                  {['Company', 'Contact', 'Contact Phone', 'Company Phone', 'Email', 'Actions'].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractors.map((v) => (
                  <tr key={v.id} style={rowStyle}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={tdStyle}>
                      <Link href={`/vendors/${v.id}`} style={linkTextStyle}>{v.name}</Link>
                    </td>
                    <td style={tdStyle}>{v.contact_person || '—'}</td>
                    <td style={tdStyle}>{v.contact_person_phone || '—'}</td>
                    <td style={tdStyle}>{v.company_phone || '—'}</td>
                    <td style={tdStyle}>{v.email || '—'}</td>
                    <td style={tdStyle}>
                      <Link href={`/vendors/${v.id}`} title="View / Edit" style={iconBtnStyle}>
                        <Pencil size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showVehicleModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowVehicleModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 16px', overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 820,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)', position: 'relative', padding: '28px 32px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add Vehicle</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Register a new vehicle</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVehicleModal(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <MachineForm
              submitLabel="Register Machine"
              onSubmit={async (data) => {
                const err = await createMachine(data);
                if (err) throw err;
                await refetchMachines();
                toast.success('Vehicle registered successfully');
                setShowVehicleModal(false);
              }}
            />
          </div>
        </div>
      )}

      {showContractorModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowContractorModal(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 16px', overflowY: 'auto',
          }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 760,
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)', position: 'relative', padding: '28px 32px 32px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Add Contractor</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Register a new contractor</p>
              </div>
              <button
                type="button"
                onClick={() => setShowContractorModal(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <VendorForm
              submitLabel="Create Contractor"
              onSubmit={async (data) => {
                const err = await createVendor(data);
                if (err) throw err;
                await refetchVendors();
                toast.success('Contractor created successfully');
                setShowContractorModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--orange)',
  color: '#fff',
  border: 'none',
  padding: '8px 15px',
  borderRadius: 9,
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const tableWrapStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: 13,
  border: '1px solid var(--border)',
  overflow: 'hidden',
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
};

const thStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: '10.5px',
  fontWeight: 600,
  color: 'var(--text-muted)',
  textAlign: 'left',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 13px',
  fontSize: 12,
  color: 'var(--text-light)',
};

const rowStyle: React.CSSProperties = {
  borderBottom: '1px solid #f4f1ed',
  transition: 'background 0.1s',
};

const linkTextStyle: React.CSSProperties = {
  fontSize: '12.5px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  textDecoration: 'none',
};

const iconBtnStyle: React.CSSProperties = {
  padding: 5,
  borderRadius: 7,
  border: '1px solid var(--border2)',
  background: 'var(--bg-card)',
  color: 'var(--text-light)',
  display: 'inline-flex',
  alignItems: 'center',
};
