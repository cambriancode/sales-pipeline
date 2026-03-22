'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';

export async function upsertSalesTarget(formData: FormData): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    redirect('/login');
  }

  const supabase = await createClient();

  const ownerUserId = formData.get('owner_user_id')?.toString().trim() || '';
  const periodType = formData.get('period_type')?.toString().trim() || 'quarterly';
  const periodStart = formData.get('period_start')?.toString().trim() || '';
  const periodEnd = formData.get('period_end')?.toString().trim() || '';
  const wonValueTarget = Number(formData.get('won_value_target') ?? 0) || 0;
  const weightedPipelineTarget = Number(formData.get('weighted_pipeline_target') ?? 0) || 0;
  const rawPipelineTarget = Number(formData.get('raw_pipeline_target') ?? 0) || 0;
  const notes = formData.get('notes')?.toString().trim() || null;

  if (!ownerUserId || !periodStart || !periodEnd) {
    redirect('/admin/users?error=missing-target-fields');
  }

  const { error } = await supabase
    .from('sales_targets')
    .upsert({
      owner_user_id: ownerUserId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      won_value_target: wonValueTarget,
      weighted_pipeline_target: weightedPipelineTarget,
      raw_pipeline_target: rawPipelineTarget,
      notes,
      created_by_user_id: profile.id,
    }, {
      onConflict: 'owner_user_id,period_type,period_start',
    });

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admin/users');
  revalidatePath('/dashboard');
  revalidatePath('/reports');
  redirect('/admin/users?success=1');
}
