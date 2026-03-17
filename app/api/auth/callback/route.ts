import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    return NextResponse.redirect(`${origin}/login`);
  }

  const email = sessionData.user.email.toLowerCase();
  const admin = createAdminClient();
  const { data: allowed } = await admin
    .from("allowed_emails")
    .select("email, role, preferred_language, is_active")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (!allowed) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?denied=1`);
  }

  const profilePayload = {
    id: sessionData.user.id,
    full_name: sessionData.user.user_metadata?.full_name ?? email,
    email,
    role: allowed.role,
    preferred_language: allowed.preferred_language,
    is_active: true,
  };

  await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });

  const response = NextResponse.redirect(`${origin}${next}`);
  response.cookies.set("app_locale", allowed.preferred_language === "en" ? "en" : "es", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
