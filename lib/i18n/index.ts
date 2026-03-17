import { cookies } from "next/headers";
import { defaultLocale, getDictionary, type AppLocale } from "./dictionaries";

export async function getLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const value = cookieStore.get("app_locale")?.value;
  return value === "en" || value === "es" ? value : defaultLocale;
}

export async function getI18n() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  return { locale, t };
}
