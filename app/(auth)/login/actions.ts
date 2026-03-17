'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function signInWithOtp(formData: FormData): Promise<void> {
  const supabase = await createClient();

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('ADMIN CLIENT INIT FAILED:', err);
    redirect('/login?denied=1');
  }

  const email = formData.get('email')?.toString().trim().toLowerCase() || '';
  console.log('LOGIN ATTEMPT EMAIL:', email);

  if (!email) {
    console.log('LOGIN DENIED: missing email');
    redirect('/login?denied=1');
  }

  const { data: allowed, error: allowedError } = await admin
    .from('allowed_emails')
    .select('email, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  console.log('ALLOWLIST RESULT:', { allowed, allowedError });

  if (allowedError || !allowed) {
    console.log('LOGIN DENIED: not allowlisted');
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

  console.log('OTP RESULT:', { error });

  if (error) {
    redirect('/login?denied=1');
  }

  redirect('/login?sent=1');
}