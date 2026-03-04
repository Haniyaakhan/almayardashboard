import React from 'react';

type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'gray';

const colors: Record<BadgeColor, React.CSSProperties> = {
  green:  { background: 'rgba(34,197,94,0.15)',  color: '#22c55e',  border: '1px solid rgba(34,197,94,0.3)' },
  red:    { background: 'rgba(239,68,68,0.15)',  color: '#ef4444',  border: '1px solid rgba(239,68,68,0.3)' },
  amber:  { background: 'rgba(245,158,11,0.15)', color: '#f59e0b',  border: '1px solid rgba(245,158,11,0.3)' },
  blue:   { background: 'rgba(59,130,246,0.15)', color: '#3b82f6',  border: '1px solid rgba(59,130,246,0.3)' },
  orange: { background: 'rgba(232,118,43,0.15)', color: '#e8762b',  border: '1px solid rgba(232,118,43,0.3)' },
  gray:   { background: 'rgba(100,116,139,0.15)',color: '#94a3b8',  border: '1px solid rgba(100,116,139,0.3)' },
};

interface BadgeProps { children: React.ReactNode; color?: BadgeColor; }

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium" style={colors[color]}>
      {children}
    </span>
  );
}

export function machineStatusBadge(status: string) {
  const map: Record<string, BadgeColor> = {
    available: 'green', in_use: 'orange', maintenance: 'amber', returned: 'gray',
  };
  return <Badge color={map[status] ?? 'gray'}>{status.replace('_', ' ')}</Badge>;
}

export function timesheetStatusBadge(status: string) {
  const map: Record<string, BadgeColor> = {
    draft: 'gray', submitted: 'blue', approved: 'green',
  };
  return <Badge color={map[status] ?? 'gray'}>{status}</Badge>;
}
