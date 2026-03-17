import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/auth';
import { getI18n } from '@/lib/i18n';

export default async function DashboardPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { t, locale } = await getI18n();

  const [
    { data: opportunities },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from('opportunities')
      .select('id, status, title, probability, annual_value_estimate, weighted_value, close_value, next_action_due_date, next_action, accounts(name), opportunity_stages(name)')
      .order('updated_at', { ascending: false })
      .limit(12),
    supabase
      .from('tasks')
      .select('id, description, due_date, status, opportunities(title)')
      .order('due_date', { ascending: true })
      .limit(8),
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

  return (
    <div className="space-y-8">
      <PageHeader title={t.dashboard.title} description={t.dashboard.description} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label={t.dashboard.profile} value={profile?.role ?? 'pending'} helper={profile?.email} />
        <StatCard label={t.dashboard.openOpportunities} value={String(liveOpps.length)} helper={t.dashboard.rawPipeline} />
        <StatCard label={t.dashboard.weightedPipeline} value={weightedPipeline.toLocaleString()} helper={`${t.dashboard.rawPipeline}: ${rawPipeline.toLocaleString()}`} />
        <StatCard label={locale === 'es' ? 'Tareas abiertas / vencidas' : 'Open / overdue tasks'} value={`${openTasks} / ${overdueTasks}`} />
        <StatCard label={locale === 'es' ? 'Ganadas' : 'Won'} value={`${wonOpps.length}`} helper={wonValue.toLocaleString()} />
      </div>

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
                <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
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
