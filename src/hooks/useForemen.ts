'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Foreman } from '@/types/database';

export function useForemen(activeOnly = true) {
  const [foremen, setForemen] = useState<Foreman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('foremen').select('*').order('full_name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setForemen((data ?? []) as Foreman[]);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);
  return { foremen, loading, error, refetch: fetch };
}

export async function createForeman(data: Omit<Foreman, 'id' | 'is_active' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  const { data: created, error } = await supabase
    .from('foremen')
    .insert({ ...data, is_active: true })
    .select('id')
    .single();
  return { error, id: created?.id ?? null };
}

export async function getForemanById(id: string): Promise<Foreman | null> {
  const supabase = createClient();
  const { data } = await supabase.from('foremen').select('*').eq('id', id).single();
  return (data as Foreman) ?? null;
}

export async function updateForeman(id: string, data: Partial<Foreman>) {
  const supabase = createClient();
  const { error } = await supabase.from('foremen').update(data).eq('id', id);
  return error;
}

export async function deactivateForeman(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('foremen').update({ is_active: false }).eq('id', id);
  return error;
}

export async function reactivateForeman(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('foremen').update({ is_active: true }).eq('id', id);
  return error;
}
