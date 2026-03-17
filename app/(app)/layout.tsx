import { AppShell } from "@/components/app-shell";
import { getCurrentProfile, requireUser } from "@/lib/auth";
import { getI18n } from "@/lib/i18n";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const profile = await getCurrentProfile();
  const { locale, t } = await getI18n();

  return (
    <AppShell
      profile={profile}
      locale={locale}
      labels={{
        appName: t.appName,
        profilePending: t.common.profilePending,
        signedInAs: t.common.signedInAs,
        logout: t.common.logout,
        nav: t.nav,
      }}
    >
      {children}
    </AppShell>
  );
}
