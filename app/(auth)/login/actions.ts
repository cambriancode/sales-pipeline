'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function signInWithOtp(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const admin = createAdminClient();

  const email = formData.get('email')?.toString().trim().toLowerCase() || '';

  if (!email) {
    redirect('/login?denied=1');
  }

  const { data: allowed, error: allowedError } = await admin
    .from('allowed_emails')
    .select('email, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (allowedError || !allowed) {
    redirect('/login?denied=1');
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/api/auth/callback`,
    },
  });

  if (error) {
    redirect('/login?denied=1');
  }

  redirect('/login?sent=1');
}