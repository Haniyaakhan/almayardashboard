'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { computeShiftTimes } from '@/lib/shiftTemplates';
import type { Shift, ShiftType, Lpo } from '@/types/database';

export interface ShiftFilters {
  vehicleId?: string;
  shiftType?: ShiftType;
  status?: Shift['status'];
  dateFrom?: string;
  dateTo?: string;
}

export function useShifts(filters: ShiftFilters = {}) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from('shifts')
      .select('*, vehicle:machines(id, name, type, plate_number), lpo:lpos(id, lpo_number, status)')
      .order('shift_date', { ascending: false })
      .order('shift_type', { ascending: true });
    if (filters.vehicleId) q = q.eq('vehicle_id', filters.vehicleId);
    if (filters.shiftType) q = q.eq('shift_type', filters.shiftType);
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.dateFrom) q = q.gte('shift_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('shift_date', filters.dateTo);
    const { data, error } = await q;
    if (error) setError(error.message);
    else setShifts((data ?? []) as Shift[]);
    setLoading(false);
  }, [filters.vehicleId, filters.shiftType, filters.status, filters.dateFrom, filters.dateTo]);

  useEffect(() => { fetch(); }, [fetch]);
  return { shifts, loading, error, refetch: fetch };
}

// Finds the active LPO (if any) covering a given vehicle's type — the oldest
// active one first, so older POs get used up before newer ones.
export async function findActiveLpoForVehicle(vehicleId: string): Promise<Lpo | null> {
  const supabase = createClient();
  const { data: machine } = await supabase.from('machines').select('vehicle_type_id').eq('id', vehicleId).single();
  if (!machine?.vehicle_type_id) return null;
  const { data } = await supabase
    .from('lpos')
    .select('*')
    .eq('vehicle_type_id', machine.vehicle_type_id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Lpo) ?? null;
}

// Pre-submit check only — the real guard is the DB's partial unique index.
export async function hasExistingShift(vehicleId: string, shiftDate: string, shiftType: ShiftType): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from('shifts')
    .select('id')
    .eq('vehicle_id', vehicleId)
    .eq('shift_date', shiftDate)
    .eq('shift_type', shiftType)
    .neq('status', 'cancelled')
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export interface CreateShiftInput {
  vehicleId: string;
  shiftDate: string;
  shiftType: ShiftType;
  driverNameOverride?: string;
  overrideReason?: string;
  overrideDuplicate?: boolean;
  projectName?: string;
  supplierName?: string;
  siteEngineerName?: string;
  remarks?: string;
}

export async function createShift(input: CreateShiftInput): Promise<{ error: Error | null; id: string | null }> {
  const supabase = createClient();
  const lpo = await findActiveLpoForVehicle(input.vehicleId);
  if (!lpo) {
    return { error: new Error('No active LPO is linked to this vehicle\'s type. Link an LPO before submitting a shift.'), id: null };
  }

  const { startAt, endAt, netHours } = computeShiftTimes(input.shiftDate, input.shiftType);
  const { data: userData } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from('shifts')
    .insert({
      vehicle_id: input.vehicleId,
      shift_date: input.shiftDate,
      shift_type: input.shiftType,
      start_at: startAt,
      end_at: endAt,
      net_hours: netHours,
      lpo_id: lpo.id,
      driver_name_snapshot: input.driverNameOverride || undefined,
      overridden_driver: Boolean(input.driverNameOverride),
      override_reason: input.overrideReason || null,
      override_duplicate: input.overrideDuplicate ?? false,
      project_name: input.projectName || null,
      supplier_name: input.supplierName || null,
      site_engineer_name: input.siteEngineerName || null,
      remarks: input.remarks || null,
      created_by: userData.user?.id ?? null,
    })
    .select('id')
    .single();

  return { error, id: created?.id ?? null };
}

export async function submitShift(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('shifts').update({ status: 'submitted' }).eq('id', id);
  return error;
}

export async function approveShift(id: string) {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('shifts')
    .update({ status: 'approved', approved_by: userData.user?.id ?? null, approved_at: new Date().toISOString() })
    .eq('id', id);
  return error;
}

export async function cancelShift(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('shifts').update({ status: 'cancelled' }).eq('id', id);
  return error;
}
