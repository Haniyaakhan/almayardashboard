'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Machine } from '@/types/database';

export function useMachines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from('machines').select('*, vendor:vendors(name)').eq('is_active', true).order('name');
    if (error) setError(error.message);
    else setMachines((data ?? []) as Machine[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { machines, loading, error, refetch: fetch };
}

export async function getMachineById(id: string): Promise<Machine | null> {
  const supabase = createClient();
  const { data } = await supabase.from('machines').select('*, vendor:vendors(*)').eq('id', id).single();
  return data as Machine | null;
}

export async function createMachine(data: Omit<Machine, 'id' | 'created_at' | 'updated_at' | 'vendor'>) {
  const supabase = createClient();
  const { error } = await supabase.from('machines').insert(data);
  return error;
}

export async function updateMachine(id: string, data: Partial<Machine>) {
  const supabase = createClient();
  const { error } = await supabase.from('machines').update(data).eq('id', id);
  return error;
}
