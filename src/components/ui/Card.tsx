import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', padding = 'p-6', style }: CardProps) {
  return (
    <div
      className={`${padding} ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 13,
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
