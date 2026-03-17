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
console.log('SUPABASE URL RUNTIME:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SERVICE KEY PRESENT:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));
console.log('SERVICE KEY LENGTH:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0);
console.log('SERVICE KEY PREFIX:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? 'none');



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

  console.log('SITE URL RUNTIME:', process.env.NEXT_PUBLIC_SITE_URL);
  console.log('EMAIL REDIRECT TO:', `${siteUrl}/api/auth/callback`);  

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