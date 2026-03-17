import Link from 'next/link';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { getI18n } from '@/lib/i18n';
import { demoAccounts } from '@/lib/demo-data';
import type { AccountListItem } from '@/types/database';

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { t, locale } = await getI18n();
  const params = (await searchParams) ?? {};
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const type = typeof params.type === 'string' ? params.type : '';

  const [{ data }, { data: typeOptions }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, billing_city, billing_country, account_types(name)')
      .order('name')
      .limit(100),
    supabase.from('account_types').select('name').order('sort_order'),
  ]);

  const accounts = ((data ?? []) as unknown as AccountListItem[]).filter((account) => {
    const matchesQuery = !q || [account.name, account.billing_city, account.billing_country, account.account_types?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
    const matchesType = !type || account.account_types?.name === type;
    return matchesQuery && matchesType;
  });
  const showExamples = accounts.length === 0;

  const exportParams = new URLSearchParams();
  if (q) exportParams.set('q', q);
  if (type) exportParams.set('type', type);

  return (
    <div className="space-y-8">
      <PageHeader title={t.accounts.title} description={t.accounts.description} />

      <SectionTitle
        title={t.accounts.title}
        description={t.accounts.description}
        action={<Link href="/accounts/new" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{t.accounts.newAccount}</Link>}
      />

      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-[1.2fr,0.8fr,auto,auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Buscar' : 'Search'}</label>
            <input name="q" defaultValue={q} placeholder={locale === 'es' ? 'Cuenta, ciudad o país' : 'Account, city, or country'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Tipo' : 'Type'}</label>
            <select name="type" defaultValue={type} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">{locale === 'es' ? 'Todos' : 'All'}</option>
              {(typeOptions ?? []).map((item: any) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{locale === 'es' ? 'Filtrar' : 'Filter'}</button>
          <a href={`/api/export/accounts${exportParams.size ? `?${exportParams.toString()}` : ''}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{locale === 'es' ? 'Exportar CSV' : 'Export CSV'}</a>
        </form>
      </Card>

      {accounts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="h-full p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{account.name}</h3>
                    <p className="text-sm text-slate-500">{account.billing_city ?? '—'}, {account.billing_country ?? '—'}</p>
                  </div>
                  {account.account_types?.name ? <Pill tone="sky">{account.account_types.name}</Pill> : null}
                </div>
                <p className="mt-4 text-sm text-slate-500">{t.common.view} →</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {showExamples ? (
        <div>
          <SectionTitle title={`${t.common.examples} · ${t.accounts.title}`} description={t.common.noData} />
          <div className="grid gap-4 md:grid-cols-3">
            {demoAccounts.map((account) => (
              <Card key={account.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{account.name}</h3>
                    <p className="text-sm text-slate-500">{account.city}, {account.country}</p>
                  </div>
                  <Pill tone="amber">{locale === 'es' ? account.typeEs : account.typeEn}</Pill>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
