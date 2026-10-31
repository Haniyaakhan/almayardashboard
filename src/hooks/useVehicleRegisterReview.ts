'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { VehicleRegisterReview, VehicleReviewClassification } from '@/types/database';

export function useVehicleRegisterReviews(month: number, year: number) {
  const [reviews, setReviews] = useState<VehicleRegisterReview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('vehicle_register_reviews')
      .select('*, vehicle:machines(id, name, type, plate_number, operator_name)')
      .eq('review_month', month)
      .eq('review_year', year);
    setReviews((data ?? []) as VehicleRegisterReview[]);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);
  return { reviews, loading, refetch: fetch };
}

export interface SubmitReviewInput {
  vehicleId: string;
  month: number;
  year: number;
  classification: VehicleReviewClassification;
  previousDriverName?: string | null;
  newDriverName?: string | null;
  effectiveDate: string;
  notes?: string | null;
}

// Records the review decision and, for a driver change, updates the vehicle's
// current operator_name going forward only — it never touches past shifts'
// driver_name_snapshot, so historical records stay exactly as they were.
export async function submitVehicleReview(input: SubmitReviewInput): Promise<Error | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error: reviewErr } = await supabase.from('vehicle_register_reviews').upsert({
    vehicle_id: input.vehicleId,
    review_month: input.month,
    review_year: input.year,
    classification: input.classification,
    previous_driver_name: input.previousDriverName ?? null,
    new_driver_name: input.newDriverName ?? null,
    effective_date: input.effectiveDate,
    notes: input.notes ?? null,
    reviewed_by: userData.user?.id ?? null,
  }, { onConflict: 'vehicle_id,review_month,review_year' });
  if (reviewErr) return reviewErr;

  if (input.classification === 'driver_changed' && input.newDriverName) {
    const { error: updateErr } = await supabase.from('machines').update({ operator_name: input.newDriverName }).eq('id', input.vehicleId);
    if (updateErr) return updateErr;
  }
  if (input.classification === 'left_fleet') {
    const { error: updateErr } = await supabase.from('machines').update({ is_active: false, status: 'returned' }).eq('id', input.vehicleId);
    if (updateErr) return updateErr;
  }

  return null;
}
