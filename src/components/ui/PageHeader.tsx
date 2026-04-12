import React from 'react';

interface PageHeaderProps {
  action?: React.ReactNode;
}

export function PageHeader({ action }: PageHeaderProps) {
  if (!action) return null;

  return (
    <div className="flex items-center justify-end mb-5">
      <div>{action}</div>
    </div>
  );
}
