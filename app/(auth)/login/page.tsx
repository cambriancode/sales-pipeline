import { requestEmailOtp, verifyEmailOtp } from "./actions";
import { getI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    sent?: string;
    denied?: string;
    invalid?: string;
    error_code?: string;
    email?: string;
  }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const denied = params.denied === "1";
  const invalid = params.invalid === "1" || Boolean(params.error_code);
  const email = params.email?.trim().toLowerCase() || "";
  const { locale, t } = await getI18n();

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher locale={locale} next="/login" />
        </div>
        <h1 className="text-2xl font-semibold">{t.login.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{t.login.subtitle}</p>
        <p className="mt-2 text-xs text-slate-500">{t.login.workEmailOnly}</p>

        {sent ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{t.login.sentCode}</div>
        ) : null}
        {denied ? (
          <div className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{t.login.denied}</div>
        ) : null}
        {invalid ? (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">{t.login.invalidCode}</div>
        ) : null}

        <form action={requestEmailOtp} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">{t.login.email}</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={email}
              className="w-full rounded-lg border px-3 py-2 outline-none ring-0 placeholder:text-slate-400"
              placeholder={t.login.placeholder}
            />
          </div>
          <button className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            {sent ? t.login.resendCode : t.login.sendCode}
          </button>
        </form>

        {email ? (
          <form action={verifyEmailOtp} className="mt-6 space-y-4 border-t pt-6">
            <input type="hidden" name="email" value={email} />
            <div>
              <label htmlFor="token" className="mb-1 block text-sm font-medium">{t.login.code}</label>
              <input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                className="w-full rounded-lg border px-3 py-2 tracking-[0.35em] outline-none ring-0 placeholder:text-slate-400"
                placeholder={t.login.codePlaceholder}
              />
            </div>
            <button className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-50">
              {t.login.verifyCode}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
