'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { LaborAdvance } from '@/types/database';

export function useLaborAdvances(month?: number, year?: number) {
  const [advances, setAdvances] = useState<LaborAdvance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('labor_advances')
      .select('*, laborer:laborers(*)')
      .order('advance_date', { ascending: false });

    if (typeof month === 'number' && typeof year === 'number') {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);
      q = q.gte('advance_date', startStr).lte('advance_date', endStr);
    }

    const { data, error } = await q;
    if (error) setError(error.message);
    else setAdvances((data ?? []) as LaborAdvance[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);
  return { advances, loading, error, refetch: fetch };
}

export async function createLaborAdvance(data: {
  laborer_id: string;
  advance_date: string;
  amount: number;
  notes?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from('labor_advances').insert({
    laborer_id: data.laborer_id,
    advance_date: data.advance_date,
    amount: data.amount,
    notes: data.notes ?? null,
  });
  return error;
}

export async function getTotalAdvancesForLaborer(laborerId: string, month: number, year: number) {
  const supabase = createClient();
  const start = new Date(year, month, 1).toISOString().slice(0, 10);
  const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('labor_advances')
    .select('amount')
    .eq('laborer_id', laborerId)
    .gte('advance_date', start)
    .lte('advance_date', end);

  if (error) return { total: 0, error };
  const total = (data ?? []).reduce((sum, item) => sum + Number(item.amount ?? 0), 0);
  return { total, error: null as Error | null };
}
