import Link from 'next/link';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { Card, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { getI18n } from '@/lib/i18n';
import { demoOpportunities } from '@/lib/demo-data';
import type { OpportunityListItem } from '@/types/database';

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { t, locale } = await getI18n();
  const params = (await searchParams) ?? {};
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const stage = typeof params.stage === 'string' ? params.stage : '';
  const status = typeof params.status === 'string' ? params.status : '';

  const [{ data }, { data: stageOptions }] = await Promise.all([
    supabase
      .from('opportunities')
      .select(`
        id,
        title,
        status,
        probability,
        annual_value_estimate,
        weighted_value,
        expected_close_date,
        next_action_due_date,
        next_action,
        accounts(name),
        opportunity_stages(name)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('opportunity_stages').select('name').order('sort_order'),
  ]);

  const rows = ((data ?? []) as unknown as OpportunityListItem[]).filter((item) => {
    const matchesQuery =
      !q ||
      [item.title, item.accounts?.name, item.next_action, item.opportunity_stages?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    const matchesStage = !stage || item.opportunity_stages?.name === stage;
    const matchesStatus = !status || item.status === status;
    return matchesQuery && matchesStage && matchesStatus;
  });

  const exportParams = new URLSearchParams();
  if (q) exportParams.set('q', q);
  if (stage) exportParams.set('stage', stage);
  if (status) exportParams.set('status', status);

  return (
    <div className="space-y-8">
      <PageHeader title={t.opportunities.title} description={t.opportunities.description} />
      <SectionTitle
        title={t.opportunities.title}
        description={t.opportunities.description}
        action={<Link href="/opportunities/new" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{t.opportunities.newOpportunity}</Link>}
      />

      <Card className="p-5">
        <form className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr,0.7fr,auto,auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Buscar' : 'Search'}</label>
            <input name="q" defaultValue={q} placeholder={locale === 'es' ? 'Título, cuenta o siguiente paso' : 'Title, account, or next step'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t.common.stage}</label>
            <select name="stage" defaultValue={stage} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">{locale === 'es' ? 'Todas' : 'All'}</option>
              {(stageOptions ?? []).map((item: any) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Estatus' : 'Status'}</label>
            <select name="status" defaultValue={status} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">{locale === 'es' ? 'Todos' : 'All'}</option>
              <option value="open">Open</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
              <option value="on_hold">On hold</option>
            </select>
          </div>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{locale === 'es' ? 'Filtrar' : 'Filter'}</button>
          <a
            href={`/api/export/opportunities${exportParams.size ? `?${exportParams.toString()}` : ''}`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50"
          >
            {locale === 'es' ? 'Exportar CSV' : 'Export CSV'}
          </a>
        </form>
      </Card>

      {rows.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((item) => (
            <OpportunityCard
              key={item.id}
              item={{
                id: item.id,
                title: item.title,
                account: item.accounts?.name ?? '—',
                stage: item.opportunity_stages?.name ?? '—',
                probability: item.probability,
                annualValue: Number(item.annual_value_estimate),
                weightedValue: Number(item.weighted_value),
                nextActionDate: item.next_action_due_date,
                nextAction: item.next_action,
              }}
              labels={{
                annualValue: t.common.annualValue,
                weighted: t.common.weighted,
                nextAction: t.common.nextAction,
                view: t.common.view,
              }}
            />
          ))}
        </div>
      ) : (
        <Card className="p-5 text-sm text-slate-500">{t.opportunities.empty}</Card>
      )}

      <div>
        <SectionTitle title={t.opportunities.examplePipeline} description={t.dashboard.sampleFunnelDescription} />
        <div className="grid gap-4 lg:grid-cols-3">
          {demoOpportunities.map((item) => (
            <OpportunityCard
              key={item.id}
              item={{
                id: item.id,
                title: item.title,
                account: item.accountName,
                stage: locale === 'es' ? item.stageNameEs : item.stageNameEn,
                probability: item.probability,
                annualValue: item.annualValue,
                weightedValue: item.weightedValue,
                nextActionDate: item.nextActionDate,
                nextAction: locale === 'es' ? item.nextActionEs : item.nextActionEn,
              }}
              labels={{
                annualValue: t.common.annualValue,
                weighted: t.common.weighted,
                nextAction: t.common.nextAction,
                view: t.common.view,
              }}
            />
          ))}
        </div>
      </div>

      <Card className="p-5 text-sm text-slate-600">{t.opportunities.stageChangeRule}</Card>
    </div>
  );
}
