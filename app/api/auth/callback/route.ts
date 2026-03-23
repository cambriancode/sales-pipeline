import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeAllowedSession } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !sessionData.user?.email) {
    return NextResponse.redirect(`${origin}/login?invalid=1`);
  }

  const { allowed } = await finalizeAllowedSession(sessionData.user);

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?denied=1`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
