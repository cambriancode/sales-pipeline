'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { finalizeAllowedSession, getAllowedAccessByEmail } from '@/lib/auth';

function encodeEmailParam(email: string) {
  return encodeURIComponent(email.trim().toLowerCase());
}

export async function requestEmailOtp(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const email = formData.get('email')?.toString().trim().toLowerCase() || '';

  if (!email) {
    redirect('/login?denied=1');
  }

  const allowed = await getAllowedAccessByEmail(email);
  if (!allowed) {
    redirect('/login?denied=1');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(`/login?denied=1&email=${encodeEmailParam(email)}`);
  }

  redirect(`/login?sent=1&email=${encodeEmailParam(email)}`);
}

export async function verifyEmailOtp(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const email = formData.get('email')?.toString().trim().toLowerCase() || '';
  const token = formData.get('token')?.toString().replace(/\s+/g, '') || '';

  if (!email || !token) {
    redirect(`/login?invalid=1${email ? `&email=${encodeEmailParam(email)}` : ''}`);
  }

  const { data: sessionData, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error || !sessionData.user?.email) {
    redirect(`/login?invalid=1&email=${encodeEmailParam(email)}`);
  }

  const { allowed } = await finalizeAllowedSession(sessionData.user);

  if (!allowed) {
    await supabase.auth.signOut();
    redirect(`/login?denied=1&email=${encodeEmailParam(email)}`);
  }

  redirect('/dashboard');
}
