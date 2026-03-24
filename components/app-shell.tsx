import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile } from "@/types/database";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppLocale } from "@/lib/i18n/dictionaries";

export function AppShell({
  profile,
  locale,
  labels,
  children,
}: {
  profile: Profile | null;
  locale: AppLocale;
  labels: {
    appName: string;
    profilePending: string;
    signedInAs: string;
    logout: string;
    nav: {
      dashboard: string;
      opportunities: string;
      accounts: string;
      tasks: string;
      reports: string;
      guide: string;
      adminAccess: string;
      adminCatalog: string;
      adminUsers: string;
      adminSnapshot: string;
    };
  };
  children: ReactNode;
}) {
  const baseNavigation = [
    { href: "/dashboard", label: labels.nav.dashboard },
    { href: "/opportunities", label: labels.nav.opportunities },
    { href: "/accounts", label: labels.nav.accounts },
    { href: "/tasks", label: labels.nav.tasks },
    { href: "/reports", label: labels.nav.reports },
    { href: "/guide", label: labels.nav.guide },
  ];

  const adminNavigation = profile?.role === "admin"
    ? [
        { href: "/admin/access", label: labels.nav.adminAccess },
        { href: "/admin/catalog", label: labels.nav.adminCatalog },
        { href: "/admin/users", label: labels.nav.adminUsers },
        { href: "/admin/snapshot", label: labels.nav.adminSnapshot },
      ]
    : [];

  const navigation = [...baseNavigation, ...adminNavigation];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-semibold">{labels.appName}</h1>
            <p className="text-sm text-slate-500">
              {profile ? `${labels.signedInAs}: ${profile.full_name} (${profile.email}) · ${profile.role}` : labels.profilePending}
            </p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex items-center gap-3">
              <LanguageSwitcher locale={locale} next="/dashboard" />
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
                >
                  {labels.logout}
                </button>
              </form>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} className="rounded-md px-3 py-2 hover:bg-slate-100">
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
