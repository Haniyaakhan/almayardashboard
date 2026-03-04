'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Vendor } from '@/types/database';

export function useVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from('vendors').select('*').eq('is_active', true).order('name');
    if (error) setError(error.message);
    else setVendors(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { vendors, loading, error, refetch: fetch };
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const supabase = createClient();
  const { data } = await supabase.from('vendors').select('*').eq('id', id).single();
  return data;
}

export async function createVendor(data: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  const { error } = await supabase.from('vendors').insert(data);
  return error;
}

export async function updateVendor(id: string, data: Partial<Vendor>) {
  const supabase = createClient();
  const { error } = await supabase.from('vendors').update(data).eq('id', id);
  return error;
}
