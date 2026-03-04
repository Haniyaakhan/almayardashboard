'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MachineUsageLog } from '@/types/database';

export function useMachineUsage(machineId: string) {
  const [logs, setLogs] = useState<MachineUsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!machineId) return;
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('machine_usage_logs').select('*').eq('machine_id', machineId)
      .order('log_date', { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, [machineId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { logs, loading, refetch: fetch };
}

export async function createUsageLog(data: Omit<MachineUsageLog, 'id' | 'created_at' | 'machine'>) {
  const supabase = createClient();
  const { error } = await supabase.from('machine_usage_logs').insert(data);
  if (!error) {
    await supabase.from('machines').update({ status: 'in_use' }).eq('id', data.machine_id);
  }
  return error;
}
