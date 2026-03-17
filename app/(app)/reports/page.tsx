import { Card, Pill, SectionTitle } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, locale } = await getI18n();
  const supabase = await createClient();
  const params = (await searchParams) ?? {};
  const ownerFilter = typeof params.owner === 'string' ? params.owner : '';
  const scope = typeof params.scope === 'string' ? params.scope : 'all';

  const [{ data: opportunities }, { data: stages }, { data: owners }] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, title, status, probability, annual_value_estimate, weighted_value, close_value, owner_user_id, stage_id, profiles!opportunities_owner_user_id_fkey(full_name)') ,
    supabase.from('opportunity_stages').select('id, name').order('sort_order'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  const allRows = (opportunities ?? []).filter((item: any) => {
    const matchesOwner = !ownerFilter || item.owner_user_id === ownerFilter;
    const matchesScope = scope === 'all' || (scope === 'open' ? item.status === 'open' : item.status !== 'open');
    return matchesOwner && matchesScope;
  });
  const openRows = allRows.filter((item: any) => item.status === 'open');
  const wonRows = allRows.filter((item: any) => item.status === 'won');
  const lostRows = allRows.filter((item: any) => item.status === 'lost');
  const onHoldRows = allRows.filter((item: any) => item.status === 'on_hold');

  const rawPipeline = openRows.reduce((sum: number, item: any) => sum + Number(item.annual_value_estimate ?? 0), 0);
  const weightedPipeline = openRows.reduce((sum: number, item: any) => sum + Number(item.weighted_value ?? 0), 0);
  const wonValue = wonRows.reduce((sum: number, item: any) => sum + Number(item.close_value ?? item.annual_value_estimate ?? 0), 0);
  const lostValue = lostRows.reduce((sum: number, item: any) => sum + Number(item.annual_value_estimate ?? 0), 0);
  const avgProbability = openRows.length > 0 ? Math.round(openRows.reduce((sum: number, item: any) => sum + Number(item.probability ?? 0), 0) / openRows.length) : 0;

  const stageRows = (stages ?? []).map((stage: any) => {
    const group = openRows.filter((row: any) => row.stage_id === stage.id);
    return {
      id: stage.id,
      name: stage.name,
      count: group.length,
      weighted: group.reduce((sum: number, item: any) => sum + Number(item.weighted_value ?? 0), 0),
    };
  });

  const ownerRows = (owners ?? [])
    .map((owner: any) => {
      const group = allRows.filter((row: any) => row.owner_user_id === owner.id);
      return {
        id: owner.id,
        name: owner.full_name,
        openCount: group.filter((row: any) => row.status === 'open').length,
        wonCount: group.filter((row: any) => row.status === 'won').length,
        weighted: group.filter((row: any) => row.status === 'open').reduce((sum: number, item: any) => sum + Number(item.weighted_value ?? 0), 0),
        wonValue: group.filter((row: any) => row.status === 'won').reduce((sum: number, item: any) => sum + Number(item.close_value ?? item.annual_value_estimate ?? 0), 0),
      };
    })
    .filter((item) => item.openCount > 0 || item.wonCount > 0);

  const exportParams = new URLSearchParams();
  if (ownerFilter) exportParams.set('owner', ownerFilter);
  if (scope && scope !== 'all') exportParams.set('scope', scope);

  return (
    <div className="space-y-8">
      <PageHeader title={t.reports.title} description={t.reports.description} />

      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-[1fr,1fr,auto,auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Responsable' : 'Owner'}</label>
            <select name="owner" defaultValue={ownerFilter} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">{locale === 'es' ? 'Todos' : 'All'}</option>
              {(owners ?? []).map((item: any) => <option key={item.id} value={item.id}>{item.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Alcance' : 'Scope'}</label>
            <select name="scope" defaultValue={scope} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="all">{locale === 'es' ? 'Todo' : 'All'}</option>
              <option value="open">{locale === 'es' ? 'Sólo abiertas' : 'Open only'}</option>
              <option value="closed">{locale === 'es' ? 'Sólo cerradas' : 'Closed only'}</option>
            </select>
          </div>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{locale === 'es' ? 'Filtrar' : 'Filter'}</button>
          <a href={`/api/export/reports${exportParams.size ? `?${exportParams.toString()}` : ''}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{locale === 'es' ? 'Exportar CSV' : 'Export CSV'}</a>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={locale === 'es' ? 'Pipeline bruto' : 'Raw pipeline'} value={rawPipeline.toLocaleString()} />
        <StatCard label={locale === 'es' ? 'Pipeline ponderado' : 'Weighted pipeline'} value={weightedPipeline.toLocaleString()} />
        <StatCard label={locale === 'es' ? 'Ganadas' : 'Won'} value={`${wonRows.length}`} helper={wonValue.toLocaleString()} />
        <StatCard label={locale === 'es' ? 'Perdidas' : 'Lost'} value={`${lostRows.length}`} helper={lostValue.toLocaleString()} />
        <StatCard label={locale === 'es' ? 'En pausa / prob. prom.' : 'On hold / avg prob.'} value={`${onHoldRows.length} / ${avgProbability}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title={locale === 'es' ? 'Pipeline por etapa' : 'Pipeline by stage'} />
          <div className="mt-4 space-y-3">
            {stageRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{row.name}</p>
                  <Pill tone={row.count > 0 ? 'sky' : 'amber'}>{row.count}</Pill>
                </div>
                <p className="mt-2 text-sm text-slate-500">{locale === 'es' ? 'Ponderado' : 'Weighted'}: {row.weighted.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title={locale === 'es' ? 'Resultados por responsable' : 'Results by owner'} />
          <div className="mt-4 space-y-3">
            {ownerRows.length > 0 ? ownerRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{row.name}</p>
                  <Pill tone="emerald">{row.openCount} / {row.wonCount}</Pill>
                </div>
                <p className="mt-2 text-sm text-slate-500">{locale === 'es' ? 'Ponderado' : 'Weighted'}: {row.weighted.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{locale === 'es' ? 'Ganado' : 'Won value'}: {row.wonValue.toLocaleString()}</p>
              </div>
            )) : <p className="text-sm text-slate-500">{t.reports.placeholder}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
