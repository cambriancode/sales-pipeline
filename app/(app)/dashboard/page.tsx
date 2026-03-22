import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';

function pct(current: number, target: number) {
  if (!target || target <= 0) return null;
  return Math.round((current / target) * 100);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { t, locale } = await getI18n();
  const isAccountManager = profile?.role === 'account_manager';
  const today = new Date().toISOString().slice(0, 10);

  let opportunitiesQuery = supabase
    .from('opportunities')
    .select('id, status, title, owner_user_id, probability, annual_value_estimate, weighted_value, close_value, next_action_due_date, next_action, accounts(name), opportunity_stages(name)')
    .order('updated_at', { ascending: false })
    .limit(12);

  let tasksQuery = supabase
    .from('tasks')
    .select('id, description, owner_user_id, due_date, status, opportunities(title)')
    .order('due_date', { ascending: true })
    .limit(8);

  let targetsQuery = supabase
    .from('sales_targets')
    .select('id, period_type, period_start, period_end, won_value_target, weighted_pipeline_target, raw_pipeline_target, notes')
    .order('period_end', { ascending: true })
    .limit(1);

  if (profile?.id && isAccountManager) {
    opportunitiesQuery = opportunitiesQuery.eq('owner_user_id', profile.id);
    tasksQuery = tasksQuery.eq('owner_user_id', profile.id);
    targetsQuery = targetsQuery.eq('owner_user_id', profile.id).lte('period_start', today).gte('period_end', today);
  } else if (profile?.id) {
    targetsQuery = targetsQuery.eq('owner_user_id', profile.id).lte('period_start', today).gte('period_end', today);
  }

  const [{ data: opportunities }, { data: tasks }, { data: targets }] = await Promise.all([
    opportunitiesQuery,
    tasksQuery,
    targetsQuery,
  ]);

  const allOpps = opportunities ?? [];
  const liveOpps = allOpps.filter((item: any) => item.status === 'open');
  const wonOpps = allOpps.filter((item: any) => item.status === 'won');
  const rawPipeline = liveOpps.reduce((sum: number, item: any) => sum + Number(item.annual_value_estimate ?? 0), 0);
  const weightedPipeline = liveOpps.reduce((sum: number, item: any) => sum + Number(item.weighted_value ?? 0), 0);
  const wonValue = wonOpps.reduce((sum: number, item: any) => sum + Number(item.close_value ?? item.annual_value_estimate ?? 0), 0);
  const liveTasks = tasks ?? [];
  const overdueTasks = liveTasks.filter((item: any) => item.status === 'overdue').length;
  const openTasks = liveTasks.filter((item: any) => item.status === 'open').length;
  const activeTarget = targets?.[0] ?? null;

  const weightedPct = activeTarget ? pct(weightedPipeline, Number(activeTarget.weighted_pipeline_target ?? 0)) : null;
  const rawPct = activeTarget ? pct(rawPipeline, Number(activeTarget.raw_pipeline_target ?? 0)) : null;
  const wonPct = activeTarget ? pct(wonValue, Number(activeTarget.won_value_target ?? 0)) : null;
  const coverageRatio = activeTarget && Number(activeTarget.won_value_target ?? 0) > 0
    ? (weightedPipeline / Number(activeTarget.won_value_target)).toFixed(1)
    : null;

  const scopeDescription = isAccountManager
    ? (locale === 'es'
      ? 'Este dashboard se calcula sólo con tus oportunidades, tareas y metas activas.'
      : 'This dashboard is calculated only from your own opportunities, tasks, and active targets.')
    : t.dashboard.description;

  const periodLabel = activeTarget
    ? `${activeTarget.period_start} → ${activeTarget.period_end}`
    : null;

  return (
    <div className="space-y-8">
      <PageHeader title={t.dashboard.title} description={scopeDescription} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t.dashboard.profile} value={profile?.role ?? 'pending'} helper={profile?.email} />
        <StatCard label={t.dashboard.openOpportunities} value={String(liveOpps.length)} helper={t.dashboard.rawPipeline} />
        <StatCard label={t.dashboard.weightedPipeline} value={weightedPipeline.toLocaleString()} helper={`${t.dashboard.rawPipeline}: ${rawPipeline.toLocaleString()}`} />
        <StatCard label={locale === 'es' ? 'Tareas abiertas / vencidas' : 'Open / overdue tasks'} value={`${openTasks} / ${overdueTasks}`} />
        <StatCard label={locale === 'es' ? 'Ganadas' : 'Won'} value={`${wonOpps.length}`} helper={wonValue.toLocaleString()} />
      </div>

      {isAccountManager ? (
        <Card className="p-6">
          <SectionTitle
            title={locale === 'es' ? 'Meta activa del responsable' : 'Owner active target'}
            description={periodLabel ?? (locale === 'es' ? 'Configura una meta vigente en Admin · Usuarios para comparar tu pipeline.' : 'Set an active target in Admin · Users to compare your pipeline.')}
          />

          {activeTarget ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{locale === 'es' ? 'Pipeline ponderado vs meta' : 'Weighted pipeline vs target'}</p>
                <p className="mt-2 text-2xl font-semibold">{weightedPipeline.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{Number(activeTarget.weighted_pipeline_target ?? 0).toLocaleString()} · {weightedPct ?? 0}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{locale === 'es' ? 'Pipeline bruto vs meta' : 'Raw pipeline vs target'}</p>
                <p className="mt-2 text-2xl font-semibold">{rawPipeline.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{Number(activeTarget.raw_pipeline_target ?? 0).toLocaleString()} · {rawPct ?? 0}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{locale === 'es' ? 'Ganado vs meta' : 'Won vs target'}</p>
                <p className="mt-2 text-2xl font-semibold">{wonValue.toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-500">{Number(activeTarget.won_value_target ?? 0).toLocaleString()} · {wonPct ?? 0}%</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm text-slate-500">{locale === 'es' ? 'Cobertura ponderada' : 'Weighted coverage'}</p>
                <p className="mt-2 text-2xl font-semibold">{coverageRatio ? `${coverageRatio}x` : '—'}</p>
                <p className="mt-1 text-sm text-slate-500">{activeTarget.period_type}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{locale === 'es' ? 'No hay una meta activa para tu usuario en la fecha actual.' : 'There is no active target for your user on the current date.'}</p>
          )}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr,0.95fr]">
        <Card className="p-6">
          <SectionTitle title={t.dashboard.priorityOpportunities} action={<Link href="/opportunities" className="text-sm font-medium underline-offset-4 hover:underline">{t.common.view}</Link>} />
          <div className="mt-4 space-y-4">
            {liveOpps.length > 0 ? liveOpps.slice(0, 6).map((item: any) => (
              <Link key={item.id} href={`/opportunities/${item.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{item.accounts?.name ?? '—'}</p>
                    <h3 className="font-semibold">{item.title}</h3>
                  </div>
                  <Pill tone={Number(item.probability) >= 60 ? 'sky' : 'amber'}>{item.opportunity_stages?.name ?? '—'}</Pill>
                </div>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-slate-500">{t.common.annualValue}</p>
                    <p className="font-medium">{Number(item.annual_value_estimate).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.common.weighted}</p>
                    <p className="font-medium">{Number(item.weighted_value).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">{t.common.nextAction}</p>
                    <p className="font-medium">{item.next_action_due_date ?? '—'}</p>
                  </div>
                </div>
              </Link>
            )) : <p className="text-sm text-slate-500">{t.opportunities.empty}</p>}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle title={t.tasks.title} action={<Link href="/tasks" className="text-sm font-medium underline-offset-4 hover:underline">{t.common.view}</Link>} />
          <div className="mt-4 space-y-3">
            {liveTasks.length > 0 ? liveTasks.map((task: any) => (
              <div key={task.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{task.description}</p>
                  <Pill tone={task.status === 'overdue' ? 'rose' : task.status === 'completed' ? 'emerald' : 'amber'}>{task.status}</Pill>
                </div>
                <p className="mt-1 text-slate-500">{task.opportunities?.title ?? '—'}</p>
                <p className="mt-2 text-slate-500">{task.due_date}</p>
              </div>
            )) : <p className="text-sm text-slate-500">{t.tasks.empty}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
