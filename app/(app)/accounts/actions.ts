"use server";

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export async function createAccount(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const payload = {
    name: String(formData.get('name') ?? '').trim(),
    legal_name: String(formData.get('legal_name') ?? '').trim() || null,
    account_type_id: String(formData.get('account_type_id') ?? '').trim() || null,
    billing_city: String(formData.get('billing_city') ?? '').trim() || null,
    billing_country: String(formData.get('billing_country') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
    created_by_user_id: profile.id,
  };

  if (!payload.name) throw new Error('Name is required');

  const { data, error } = await supabase.from('accounts').insert(payload).select('id').single();
  if (error) throw new Error(error.message);

  const stakeholderName = String(formData.get('stakeholder_full_name') ?? '').trim();
  const stakeholderEmail = String(formData.get('stakeholder_email') ?? '').trim() || null;
  const stakeholderPhone = String(formData.get('stakeholder_phone') ?? '').trim() || null;

  if (stakeholderName) {
    const { error: contactError } = await supabase.from('contacts').insert({
      account_id: data.id,
      full_name: stakeholderName,
      email: stakeholderEmail,
      phone: stakeholderPhone,
      created_by_user_id: profile.id,
    });

    if (contactError) throw new Error(contactError.message);
  }

  revalidatePath('/accounts');
  redirect(`/accounts/${data.id}`);
}

export async function createContact(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const accountId = String(formData.get('account_id') ?? '').trim();

  const payload = {
    account_id: accountId,
    full_name: String(formData.get('full_name') ?? '').trim(),
    job_title: String(formData.get('job_title') ?? '').trim() || null,
    email: String(formData.get('email') ?? '').trim() || null,
    phone: String(formData.get('phone') ?? '').trim() || null,
    is_decision_maker: String(formData.get('is_decision_maker') ?? '') === 'on',
    created_by_user_id: profile.id,
  };

  if (!payload.account_id || !payload.full_name) throw new Error('Missing required fields');

  const { error } = await supabase.from('contacts').insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/accounts/${accountId}`);
  revalidatePath('/accounts');
}
