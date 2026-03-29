'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/operations/labor', label: 'Labor' },
  { href: '/operations/foreman', label: 'Foreman' },
  { href: '/operations/advances', label: 'Advances' },
  { href: '/operations/timesheet', label: 'Timesheet' },
  { href: '/operations/salary', label: 'Salary' },
  { href: '/operations/npc-invoice', label: 'NPC Invoice' },
];

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ padding: '20px 24px' }}>
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 14,
        paddingBottom: 10,
        borderBottom: '1px solid var(--border)',
      }}>
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                border: active ? '1px solid var(--orange)' : '1px solid var(--border2)',
                background: active ? 'rgba(255,107,43,0.08)' : 'var(--bg-card)',
                color: active ? 'var(--orange)' : 'var(--text-light)',
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
