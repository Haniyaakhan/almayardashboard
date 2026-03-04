'use client';
import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { SidebarLink } from './SidebarLink';
import { useSupabaseUser } from '@/hooks/useSupabaseUser';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard, ClipboardList, Users, Truck,
  Settings2, FileBarChart, LogOut,
} from 'lucide-react';

const nav = [
  { group: null, items: [{ href: '/dashboard', icon: <LayoutDashboard size={16}/>, label: 'Dashboard' }] },
  { group: 'WORKFORCE', items: [
    { href: '/timesheet', icon: <ClipboardList size={16}/>, label: 'Timesheet' },
    { href: '/labor',     icon: <Users size={16}/>,         label: 'Labor Registry' },
  ]},
  { group: 'EQUIPMENT', items: [
    { href: '/vendors',  icon: <Truck size={16}/>,    label: 'Vendors' },
    { href: '/machines', icon: <Settings2 size={16}/>, label: 'Machines' },
  ]},
  { group: 'ADMINISTRATION', items: [
    { href: '/reports', icon: <FileBarChart size={16}/>, label: 'Reports' },
  ]},
];

export function Sidebar() {
  const user = useSupabaseUser();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="flex flex-col print:hidden" style={{
      width: 220, minWidth: 220, background: '#1a1f2e',
      borderRight: '1px solid #2d3454', height: '100vh',
    }}>
      {/* Branding */}
      <div className="flex items-center gap-3 px-4 py-5" style={{ borderBottom: '1px solid #2d3454' }}>
        <Image src="/npclogo.jpeg" alt="NPC" width={32} height={32} className="rounded-md" />
        <div>
          <div className="text-sm font-bold" style={{ color: '#e8762b' }}>ALMYAR</div>
          <div className="text-xs" style={{ color: '#64748b' }}>Project Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {nav.map(({ group, items }) => (
          <div key={group ?? 'main'}>
            {group && (
              <div className="px-3 mb-1 text-xs font-semibold tracking-wider" style={{ color: '#64748b' }}>
                {group}
              </div>
            )}
            <div className="space-y-0.5">
              {items.map(item => <SidebarLink key={item.href} {...item} />)}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #2d3454' }}>
        <div className="flex items-center gap-2 px-2 mb-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#e8762b' }}>
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-xs truncate" style={{ color: '#94a3b8', maxWidth: 140 }}>
            {user?.email ?? ''}
          </span>
        </div>
        <button onClick={signOut}
          className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-sm transition-colors"
          style={{ color: '#94a3b8' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
