import React from 'react';

type BadgeColor = 'green' | 'red' | 'amber' | 'blue' | 'orange' | 'gray';

const colors: Record<BadgeColor, React.CSSProperties> = {
  green:  { background: 'var(--green-bg)',  color: 'var(--green-text)',  border: '1px solid var(--green-border)' },
  red:    { background: 'var(--red-bg)',    color: 'var(--red-text)',    border: '1px solid var(--red-border)' },
  amber:  { background: 'var(--amber-bg)',  color: 'var(--amber-text)',  border: '1px solid var(--amber-border)' },
  blue:   { background: 'var(--blue-bg)',   color: 'var(--blue)',        border: '1px solid var(--blue-bg)' },
  orange: { background: 'var(--orange-lt)', color: 'var(--orange)',      border: '1px solid var(--orange-lt)' },
  gray:   { background: 'var(--input-bg)',  color: 'var(--text-muted)',  border: '1px solid var(--border)' },
};

const dotColors: Record<BadgeColor, string> = {
  green: 'var(--green-text)',
  red: 'var(--red-text)',
  amber: 'var(--amber-text)',
  blue: 'var(--blue)',
  orange: 'var(--orange)',
  gray: 'var(--text-muted)',
};

interface BadgeProps { children: React.ReactNode; color?: BadgeColor; }

export function Badge({ children, color = 'gray' }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{
      ...colors[color],
      letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: dotColors[color],
      }} />
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
