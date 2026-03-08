import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  barColor?: string;
  barPercent?: number;
  onClick?: () => void;
}

export function StatCard({ title, value, subtitle, icon, iconColor = 'var(--orange)', iconBg = 'var(--orange-lt)', barColor, barPercent, onClick }: StatCardProps) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        flex: 1,
        padding: '4px 16px',
        borderRight: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 8,
        transition: 'background 0.14s',
      }}
      onClick={onClick}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = 'var(--input-bg)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: iconBg, color: iconColor, fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: '10.5px', color: 'var(--text-muted)',
          fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.5px', marginBottom: 2,
        }}>{title}</div>
        <div className="flex items-baseline gap-1.5">
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
          }}>{value}</span>
          {subtitle && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</span>}
        </div>
        {barColor && barPercent !== undefined && (
          <div style={{ height: 3, background: 'var(--input-bg)', borderRadius: 4, marginTop: 5 }}>
            <div style={{ height: '100%', borderRadius: 4, background: barColor, width: `${barPercent}%`, transition: 'width 0.7s ease' }} />
          </div>
        )}
      </div>
    </div>
  );
}
