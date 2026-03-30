'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, ClipboardList, Users, Truck,
  Wrench, FileBarChart, LogOut, Briefcase,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: <LayoutDashboard size={19} />, label: 'Dashboard' },
  { href: '/operations', icon: <Briefcase size={19} />, label: 'Operations' },
  { href: '/vehicle-operations', icon: <Truck size={19} />, label: 'Vehicle Ops' },
  { href: '/equipment', icon: <Wrench size={19} />, label: 'Equipment' },
  { href: '/timesheets', icon: <ClipboardList size={19} />, label: 'Timesheets' },
  { href: '/reports', icon: <FileBarChart size={19} />, label: 'Reports' },
];

export function Sidebar() {
  const user = useSupabaseUser();
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex flex-col items-center print:hidden" style={{
      width: 68, minWidth: 68,
      background: '#ffffff',
      borderRight: '1px solid #ece8e2',
      height: '100vh',
      padding: '18px 0',
      gap: 4,
      flexShrink: 0,
      zIndex: 20,
    }}>
      {/* Logo */}
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: 'linear-gradient(135deg, #ff6b2b, #ff9a5c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 18,
        boxShadow: '0 4px 14px rgba(255,107,43,0.3)',
        fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 17, color: '#fff',
      }}>
        A
      </div>

      {/* Nav */}
      {navItems.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className="group relative"
            style={{
              width: 44, height: 44, borderRadius: 11,
              border: 'none',
              background: isActive ? 'var(--orange-lt)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isActive ? 'var(--orange)' : '#9e9690',
              cursor: 'pointer',
              transition: 'all 0.18s',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = '#f4f2ee';
                e.currentTarget.style.color = '#5a5450';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#9e9690';
              }
            }}
          >
            {item.icon}
            <span style={{
              position: 'absolute', left: 56,
              background: '#1a1a2e', color: '#fff',
              fontSize: 11, fontWeight: 600,
              padding: '4px 9px', borderRadius: 6,
              whiteSpace: 'nowrap',
              opacity: 0, pointerEvents: 'none',
              transition: 'opacity 0.15s',
              zIndex: 100,
            }} className="group-hover:!opacity-100">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Bottom: Logout */}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={signOut}
          className="group relative"
          style={{
            width: 44, height: 44, borderRadius: 11,
            border: 'none',
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#9e9690',
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#f4f2ee';
            e.currentTarget.style.color = '#5a5450';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#9e9690';
          }}
        >
          <LogOut size={19} />
          <span style={{
            position: 'absolute', left: 56,
            background: '#1a1a2e', color: '#fff',
            fontSize: 11, fontWeight: 600,
            padding: '4px 9px', borderRadius: 6,
            whiteSpace: 'nowrap',
            opacity: 0, pointerEvents: 'none',
            transition: 'opacity 0.15s',
            zIndex: 100,
          }} className="group-hover:!opacity-100">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
