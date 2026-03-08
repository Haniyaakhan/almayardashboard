'use client';
import React from 'react';
import Link from 'next/link';

interface DashItem {
  id: string;
  name: string;
  initials: string;
  sub: string;
  href: string;
  badge: React.ReactNode;
  avatarClass: 'or' | 'bl' | 'tl';
}

interface Props {
  title: string;
  icon: string;
  viewAllHref: string;
  btnBg: string;
  btnColor: string;
  items: DashItem[];
  emptyText: string;
}

const avatarColors: Record<string, { bg: string; color: string }> = {
  or: { bg: 'rgba(255,107,43,0.08)', color: 'var(--orange)' },
  bl: { bg: 'var(--blue-bg)', color: 'var(--blue)' },
  tl: { bg: 'var(--teal-bg)', color: 'var(--teal)' },
};

export function DashDataCard({ title, icon, viewAllHref, btnBg, btnColor, items, emptyText }: Props) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 13,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
          {icon} {title}
        </span>
        <Link href={viewAllHref} style={{
          fontSize: 11, fontWeight: 600,
          background: btnBg, color: btnColor,
          padding: '4px 9px', borderRadius: 6,
          textDecoration: 'none',
          transition: 'opacity 0.14s',
        }}>
          View All →
        </Link>
      </div>

      {/* Rows */}
      {!items.length ? (
        <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          {emptyText}
        </div>
      ) : (
        <div>
          {items.map(item => {
            const ac = avatarColors[item.avatarClass];
            return (
              <div
                key={item.id}
                style={{
                  padding: '9px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f8f6f2',
                  transition: 'background 0.1s',
                  gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--row-hover)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: ac.bg, color: ac.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    border: '1px solid var(--border)',
                  }}>
                    {item.initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Link href={item.href} style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                      textDecoration: 'none', transition: 'color 0.12s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--orange)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      {item.name}
                    </Link>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                </div>
                {item.badge && <div style={{ flexShrink: 0 }}>{item.badge}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
