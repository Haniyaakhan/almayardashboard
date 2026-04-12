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

export async function getLaborerByIdNumber(idNumber: string): Promise<Laborer | null> {
  const supabase = createClient();
  const normalizedId = (idNumber || '').trim();
  const { data } = await supabase.from('laborers').select('*').eq('id_number', normalizedId).limit(1);
  return data && data.length > 0 ? (data[0] as Laborer) : null;
}

function normalizeLaborerIdNumber(idNumber: string | null | undefined): string {
  return (idNumber || '').trim();
}

function validateNumericLaborerId(idNumber: string): Error | null {
  if (!idNumber) return new Error('Labour ID is required.');
  if (!/^\d+$/.test(idNumber)) return new Error('Labour ID must be numeric only.');
  return null;
}

export async function createLaborer(data: Omit<Laborer, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = createClient();
  const idNumber = normalizeLaborerIdNumber(data.id_number);
  const validationError = validateNumericLaborerId(idNumber);
  if (validationError) return validationError;

  const { data: existing, error: existingError } = await supabase
    .from('laborers')
    .select('id')
    .eq('id_number', idNumber)
    .limit(1);
  if (existingError) return existingError;
  if (existing && existing.length > 0) {
    return new Error(`Labour ID ${idNumber} already exists.`);
  }

  const { error } = await supabase.from('laborers').insert({ ...data, id_number: idNumber });
  return error;
}

export async function updateLaborer(id: string, data: Partial<Laborer>) {
  const supabase = createClient();
  let nextData: Partial<Laborer> = { ...data };

  if (Object.prototype.hasOwnProperty.call(nextData, 'id_number')) {
    const idNumber = normalizeLaborerIdNumber(nextData.id_number);
    const validationError = validateNumericLaborerId(idNumber);
    if (validationError) return validationError;

    const { data: existing, error: existingError } = await supabase
      .from('laborers')
      .select('id')
      .eq('id_number', idNumber)
      .neq('id', id)
      .limit(1);
    if (existingError) return existingError;
    if (existing && existing.length > 0) {
      return new Error(`Labour ID ${idNumber} already exists.`);
    }

    nextData = { ...nextData, id_number: idNumber };
  }

  const { error } = await supabase.from('laborers').update(nextData).eq('id', id);
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
