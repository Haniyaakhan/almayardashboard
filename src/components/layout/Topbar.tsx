'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/timesheet': 'Timesheet',
  '/timesheet/history': 'Timesheets',
  '/labor': 'Labour Registry',
  '/labor/new': 'Add Laborer',
  '/vendors': 'Contractors',
  '/vendors/new': 'Add Contractor',
  '/machines': 'Vehicle Management',
  '/machines/new': 'Add Vehicle',
  '/equipment': 'Equipment Management',
  '/reports': 'Reports',
};

function getTitle(pathname: string): string {
  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/labor/') && pathname.endsWith('/edit')) return 'Edit Laborer';
  if (pathname.startsWith('/labor/')) return 'Laborer Profile';
  if (pathname.startsWith('/vendors/') && pathname.endsWith('/edit')) return 'Edit Contractor';
  if (pathname.startsWith('/vendors/')) return 'Contractor Profile';
  if (pathname.startsWith('/machines/') && pathname.endsWith('/edit')) return 'Edit Vehicle';
  if (pathname.startsWith('/machines/') && pathname.includes('/usage')) return 'Log Vehicle Usage';
  if (pathname.startsWith('/machines/')) return 'Vehicle Detail';
  if (pathname.startsWith('/timesheet/history/')) return 'View Timesheet';
  return 'Platform';
}

export function Topbar() {
  const pathname = usePathname();
  const title = getTitle(pathname);
  const { theme, toggleTheme } = useTheme();
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
        {/* Search */}
        <div className="flex items-center gap-2" style={{
          background: 'var(--input-bg)',
          borderRadius: 10,
          padding: '7px 13px',
          border: '1px solid var(--border)',
          color: 'var(--text-light)',
        }}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Search..."
            style={{
              border: 'none', background: 'transparent',
              fontSize: 13, color: 'var(--text-light)', width: 150,
              outline: 'none',
            }}
          />
        </div>
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
