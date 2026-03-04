import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  trend?: { value: number; label: string };
}

export function StatCard({ title, value, subtitle, icon, iconColor = '#e8762b', trend }: StatCardProps) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${iconColor}20`, color: iconColor }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="text-xs font-medium"
            style={{ color: trend.value >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{title}</div>
      {subtitle && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
}
