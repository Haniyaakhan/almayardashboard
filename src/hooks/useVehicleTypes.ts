'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VehicleType } from '@/types/database';

export function useVehicleTypes(activeOnly = true) {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase.from('vehicle_types').select('*').order('name');
    if (activeOnly) q = q.eq('is_active', true);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setVehicleTypes((data ?? []) as VehicleType[]);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);
  return { vehicleTypes, loading, error, refetch: fetch };
}

export async function createVehicleType(name: string) {
  const supabase = createClient();
  const { data: created, error } = await supabase
    .from('vehicle_types')
    .insert({ name })
    .select('id')
    .single();
  return { error, id: created?.id ?? null };
}

export async function deactivateVehicleType(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('vehicle_types').update({ is_active: false }).eq('id', id);
  return error;
}
