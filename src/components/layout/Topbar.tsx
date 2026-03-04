'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="flex items-center px-6 print:hidden"
      style={{
        height: 56,
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(232,118,43,0.12)', color: '#e8762b' }}>
          UAE Oman Railway · Package 5B
        </div>
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </header>
  );
}
