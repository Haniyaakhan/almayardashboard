'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Laborer } from '@/types/database';

export function useLaborers(activeOnly = true) {
  const [laborers, setLaborers] = useState<Laborer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('laborers').select('*').order('full_name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setLaborers(data ?? []);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);

  return { laborers, loading, error, refetch: fetch };
}

export async function getLaborerById(id: string): Promise<Laborer | null> {
  const supabase = createClient();
  const { data } = await supabase.from('laborers').select('*').eq('id', id).single();
  return data;
}

export async function createLaborer(data: Omit<Laborer, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  const { error } = await supabase.from('laborers').insert(data);
  return error;
}

export async function updateLaborer(id: string, data: Partial<Laborer>) {
  const supabase = createClient();
  const { error } = await supabase.from('laborers').update(data).eq('id', id);
  return error;
}

export async function deactivateLaborer(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('laborers').update({ is_active: false }).eq('id', id);
  return error;
}

export async function reactivateLaborer(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('laborers').update({ is_active: true }).eq('id', id);
  return error;
}
