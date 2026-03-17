import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";

export async function requireAdminProfile() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }
  return profile;
}
