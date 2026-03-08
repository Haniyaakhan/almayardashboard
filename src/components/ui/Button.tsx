'use client';
import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary:   { background: 'var(--orange)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--bg-card)', color: 'var(--text-light)', border: '1px solid var(--border2)' },
  danger:    { background: 'var(--red-bg)', color: 'var(--red-text)', border: '1px solid var(--red-border)' },
  ghost:     { background: 'transparent', color: 'var(--text-light)', border: '1px solid var(--border2)' },
};

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({ variant = 'primary', size = 'md', loading, icon, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${sizes[size]} ${className}`}
      style={styles[variant]}
      onMouseEnter={e => { if (variant === 'primary') e.currentTarget.style.background = 'var(--orange-hv)'; }}
      onMouseLeave={e => { if (variant === 'primary') e.currentTarget.style.background = 'var(--orange)'; }}
      {...props}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  );
}

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}
