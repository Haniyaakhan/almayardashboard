'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/timesheet': 'Timesheet',
  '/timesheet/history': 'Timesheet History',
  '/labor': 'Labor Registry',
  '/labor/new': 'Add Laborer',
  '/vendors': 'Vendors',
  '/vendors/new': 'Add Vendor',
  '/machines': 'Machines',
  '/machines/new': 'Add Machine',
  '/reports': 'Reports',
};

function getTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/labor/') && pathname.endsWith('/edit')) return 'Edit Laborer';
  if (pathname.startsWith('/labor/')) return 'Laborer Profile';
  if (pathname.startsWith('/vendors/') && pathname.endsWith('/edit')) return 'Edit Vendor';
  if (pathname.startsWith('/vendors/')) return 'Vendor Profile';
  if (pathname.startsWith('/machines/') && pathname.endsWith('/edit')) return 'Edit Machine';
  if (pathname.startsWith('/machines/') && pathname.includes('/usage')) return 'Log Machine Usage';
  if (pathname.startsWith('/machines/')) return 'Machine Detail';
  if (pathname.startsWith('/timesheet/history/')) return 'View Timesheet';
  return 'Platform';
}

export function Topbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="flex items-center px-6 print:hidden"
      style={{ height: 56, background: '#1a1f2e', borderBottom: '1px solid #2d3454', flexShrink: 0 }}>
      <h2 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(232,118,43,0.12)', color: '#e8762b' }}>
          UAE Oman Railway · Package 5B
        </div>
      </div>
    </header>
  );
}
