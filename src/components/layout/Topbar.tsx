'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/timesheet': 'Labor Timesheet',
  '/timesheet/history': 'Labor Timesheets',
  '/vehicle-timesheet': 'Vehicle Timesheet',
  '/vehicle-timesheet/history': 'Vehicle Timesheets',
  '/vendors': 'Contractors',
  '/vendors/new': 'Add Contractor',
  '/machines': 'Vehicle Management',
  '/machines/new': 'Add Vehicle',
  '/equipment': 'Equipment Management',
  '/operations': 'Operations',
  '/operations/foreman': 'Operations Foreman',
  '/operations/labor': 'Labour Registry',
  '/operations/vehicle': 'Operations Vehicle',
  '/vehicle-operations': 'Vehicle Operations',
  '/operations/timesheet': 'Operations Timesheet',
  '/operations/salary': 'Operations Salary',
  '/operations/npc-invoice': 'NPC Invoice',
  '/reports': 'Reports',
  '/reports/bank-accounts': 'Bank Account Report',
  '/reports/by-designation': 'Employees By Designation',
  '/reports/salary-bank-report': 'Salary Bank Report',
  '/reports/salary-sheet-coverage': 'Salary Sheet Coverage',
  '/payment-modules': 'Payment Modules',
  '/payment-modules/cash-receipt-payment': 'Cash Receipt Payment',
  '/payment-modules/invoice-generation': 'Invoice Generation',
  '/payment-modules/salary-generation': 'Salary Generation',
};

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function titleFromPath(pathname: string): string {
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const segments = cleanPath.split('/').filter(Boolean);
  if (!segments.length) return 'Dashboard';

  const last = decodeURIComponent(segments[segments.length - 1]);
  const isIdLike = /^[0-9]+$/.test(last) || /^[0-9a-fA-F-]{16,}$/.test(last);

  if (isIdLike && segments.length > 1) {
    return `${toTitleCase(segments[segments.length - 2].replace(/-/g, ' '))} Detail`;
  }

  return toTitleCase(last.replace(/-/g, ' '));
}

function getTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/labor/')) return 'Laborer Profile';
  if (pathname.startsWith('/vendors/')) return 'Contractor Profile';
  if (pathname.startsWith('/machines/') && pathname.includes('/usage')) return 'Log Vehicle Usage';
  if (pathname.startsWith('/machines/')) return 'Vehicle Detail';
  if (pathname.startsWith('/timesheet/history/')) return 'View Labor Timesheet';
  if (pathname.startsWith('/vehicle-timesheet/history/')) return 'View Vehicle Timesheet';
  if (pathname.startsWith('/operations/foreman/')) return 'Foreman Profile';
  return titleFromPath(pathname);
}

export function Topbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const user = useSupabaseUser();
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';

  return (
    <header className="flex items-center justify-between print:hidden"
      style={{
        padding: '8px 24px',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
      <div>
        <div style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 19, fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.3px',
        }}>{title}</div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
          Almayar United Trading LLC
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {/* Theme toggle — hidden for now (light theme only) */}
        {/* <button
          onClick={toggleTheme}
          className="flex items-center justify-center"
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'var(--input-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button> */}
        {/* User Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, var(--orange), #ff9a5c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12,
          fontFamily: "'Sora', sans-serif",
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
