import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppLanguage, Profile, UserRole } from "@/types/database";

export interface AllowedAccessRecord {
  email: string;
  role: UserRole;
  preferred_language: AppLanguage;
  is_active: boolean;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_active, preferred_language, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  return data ?? null;
}

export async function getAllowedAccessByEmail(email: string): Promise<AllowedAccessRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("allowed_emails")
    .select("email, role, preferred_language, is_active")
    .eq("email", normalizedEmail)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as AllowedAccessRecord;
}

export async function finalizeAllowedSession(user: Pick<User, "id" | "email" | "user_metadata">) {
  const email = user.email?.trim().toLowerCase();

  if (!email) {
    return { allowed: null };
  }

  const allowed = await getAllowedAccessByEmail(email);
  if (!allowed) {
    return { allowed: null };
  }

  const admin = createAdminClient();
  const profilePayload = {
    id: user.id,
    full_name: user.user_metadata?.full_name ?? email,
    email,
    role: allowed.role,
    preferred_language: allowed.preferred_language,
    is_active: true,
  };

  await admin.from("profiles").upsert(profilePayload, { onConflict: "id" });

  const cookieStore = await cookies();
  cookieStore.set("app_locale", allowed.preferred_language === "en" ? "en" : "es", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { allowed };
}
