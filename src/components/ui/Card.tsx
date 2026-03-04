import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}

export function Card({ children, className = '', padding = 'p-6' }: CardProps) {
  return (
    <div
      className={`rounded-xl ${padding} ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {children}
    </div>
  );
}
