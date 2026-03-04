'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface KPIs {
  activeLaborers: number;
  monthlyHours: number;
  machinesInUse: number;
  machineHoursMonth: number;
  laborHoursChart: { month: string; hours: number }[];
  machineUsageChart: { day: string; hours: number }[];
}

export function useDashboardKPIs() {
  const [kpis, setKpis] = useState<KPIs>({
    activeLaborers: 0, monthlyHours: 0, machinesInUse: 0,
    machineHoursMonth: 0, laborHoursChart: [], machineUsageChart: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthStart = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

      const [
        { count: activeLaborers },
        { data: monthTs },
        { count: machinesInUse },
        { data: machineLogsMonth },
        { data: last6Ts },
        { data: dailyUsage },
      ] = await Promise.all([
        supabase.from('laborers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('timesheets').select('total_actual').eq('month', currentMonth).eq('year', currentYear),
        supabase.from('machines').select('*', { count: 'exact', head: true }).eq('status', 'in_use'),
        supabase.from('machine_usage_logs').select('hours_used').gte('log_date', monthStart),
        supabase.from('timesheets').select('month,year,total_actual').order('year', { ascending: false }).order('month', { ascending: false }).limit(18),
        supabase.from('machine_usage_logs').select('log_date,hours_used').gte('log_date', monthStart).order('log_date'),
      ]);

      const monthlyHours = (monthTs ?? []).reduce((s, r) => s + (r.total_actual || 0), 0);
      const machineHoursMonth = (machineLogsMonth ?? []).reduce((s, r) => s + (r.hours_used || 0), 0);

      // Build last 6 months chart data
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const last6Map: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const key = `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
        last6Map[key] = 0;
      }
      (last6Ts ?? []).forEach(r => {
        const key = `${months[r.month]} ${String(r.year).slice(2)}`;
        if (key in last6Map) last6Map[key] = (last6Map[key] || 0) + r.total_actual;
      });
      const laborHoursChart = Object.entries(last6Map).map(([month, hours]) => ({ month, hours }));

      // Daily machine usage chart
      const machineUsageChart = (dailyUsage ?? []).map(r => ({
        day: r.log_date.slice(8),
        hours: r.hours_used,
      }));

      setKpis({ activeLaborers: activeLaborers ?? 0, monthlyHours, machinesInUse: machinesInUse ?? 0, machineHoursMonth, laborHoursChart, machineUsageChart });
      setLoading(false);
    }
    load();
  }, []);

  return { kpis, loading };
}
