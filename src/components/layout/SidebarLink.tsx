'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export function SidebarLink({ href, icon, label }: SidebarLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
      style={{
        color: isActive ? '#e8762b' : 'var(--text-secondary)',
        background: isActive ? 'rgba(232,118,43,0.12)' : 'transparent',
        borderLeft: isActive ? '2px solid #e8762b' : '2px solid transparent',
        fontWeight: isActive ? 600 : 400,
      }}
    >
      <span style={{ opacity: isActive ? 1 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}
