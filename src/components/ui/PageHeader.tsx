import React from 'react';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  if (!title && !subtitle && !action) return null;

  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
        {subtitle ? (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div>{action}</div>
    </div>
  );
}
