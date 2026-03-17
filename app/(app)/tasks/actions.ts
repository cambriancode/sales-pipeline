"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function completeTask(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Task id is required');

  const { error } = await supabase
    .from('tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}

export async function reopenTask(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const dueDate = String(formData.get('due_date') ?? '').trim();
  if (!id) throw new Error('Task id is required');

  const nextStatus = dueDate && dueDate < new Date().toISOString().slice(0, 10) ? 'overdue' : 'open';

  const { error } = await supabase
    .from('tasks')
    .update({ status: nextStatus, completed_at: null })
    .eq('id', id);

  if (error) throw new Error(error.message);

  revalidatePath('/tasks');
  revalidatePath('/dashboard');
}
