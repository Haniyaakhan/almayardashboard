'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Lpo, LpoRenewal, LpoStatus } from '@/types/database';

export function useLpos(statusFilter?: LpoStatus) {
  const [lpos, setLpos] = useState<Lpo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('lpos').select('*, vehicle_type:vehicle_types(*)').order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setLpos((data ?? []) as Lpo[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  return { lpos, loading, error, refetch: fetch };
}

export async function getLpoById(id: string): Promise<Lpo | null> {
  const supabase = createClient();
  const { data } = await supabase.from('lpos').select('*, vehicle_type:vehicle_types(*)').eq('id', id).single();
  return (data as Lpo) ?? null;
}

export async function getLpoRenewals(lpoId: string): Promise<LpoRenewal[]> {
  const supabase = createClient();
  const { data } = await supabase.from('lpo_renewals').select('*').eq('lpo_id', lpoId).order('created_at', { ascending: false });
  return (data ?? []) as LpoRenewal[];
}

export async function createLpo(input: {
  lpo_number: string;
  vehicle_type_id: string;
  quantity_total: number;
  valid_from?: string | null;
  valid_to?: string | null;
  notes?: string | null;
}): Promise<{ error: Error | null; id: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: created, error } = await supabase
    .from('lpos')
    .insert({ ...input, created_by: userData.user?.id ?? null })
    .select('id')
    .single();
  return { error, id: created?.id ?? null };
}

// Renews an LPO: records the renewal (for history) and bumps quantity_total.
// The `update_lpo_status` DB trigger automatically flips status back to
// 'active' if this takes quantity_total back above quantity_used.
export async function renewLpo(lpoId: string, addedQuantity: number, note?: string): Promise<Error | null> {
  const supabase = createClient();
  const { data: lpo, error: fetchErr } = await supabase.from('lpos').select('quantity_total').eq('id', lpoId).single();
  if (fetchErr || !lpo) return fetchErr ?? new Error('LPO not found');

  const newTotal = lpo.quantity_total + addedQuantity;
  const { data: userData } = await supabase.auth.getUser();

  const { error: renewalErr } = await supabase.from('lpo_renewals').insert({
    lpo_id: lpoId,
    added_quantity: addedQuantity,
    previous_quantity_total: lpo.quantity_total,
    new_quantity_total: newTotal,
    note: note || null,
    created_by: userData.user?.id ?? null,
  });
  if (renewalErr) return renewalErr;

  const { error: updateErr } = await supabase.from('lpos').update({ quantity_total: newTotal }).eq('id', lpoId);
  return updateErr;
}

export async function closeLpo(id: string): Promise<Error | null> {
  const supabase = createClient();
  const { error } = await supabase.from('lpos').update({ status: 'closed' }).eq('id', id);
  return error;
}
