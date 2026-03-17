'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createAllowedEmail(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  const email = formData.get('email')?.toString().trim().toLowerCase() || '';
  const role = formData.get('role')?.toString().trim() || 'account_manager';
  const preferredLanguage =
    formData.get('preferred_language')?.toString().trim() || 'es';

  if (!email) {
    redirect('/admin/access?error=missing-email');
  }

  const { error } = await supabase.from('allowed_emails').insert({
    email,
    role,
    preferred_language: preferredLanguage,
    invited_by_user_id: user.id,
    is_active: true,
  });

  if (error) {
    redirect(`/admin/access?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/admin/access');
  redirect('/admin/access?success=1');
}