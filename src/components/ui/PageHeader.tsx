import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 19, fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.3px',
        }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
