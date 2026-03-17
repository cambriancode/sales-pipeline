import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const locale = String(formData.get("locale") ?? "es");
  const next = String(formData.get("next") ?? "/dashboard");
  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set("app_locale", locale === "en" ? "en" : "es", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
