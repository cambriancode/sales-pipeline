import { PageHeader } from '@/components/page-header';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { createClient } from '@/lib/supabase/server';
import { getI18n } from '@/lib/i18n';
import type { TaskListItem } from '@/types/database';
import { completeTask, reopenTask } from './actions';

function groupTasks(rows: TaskListItem[]) {
  return {
    overdue: rows.filter((task) => task.status === 'overdue'),
    open: rows.filter((task) => task.status === 'open'),
    completed: rows.filter((task) => task.status === 'completed'),
  };
}

function TaskCard({ task, locale }: { task: TaskListItem; locale: 'es' | 'en' }) {
  const tone = task.status === 'overdue' ? 'rose' : task.status === 'completed' ? 'emerald' : 'amber';
  const label = locale === 'es'
    ? task.status === 'overdue' ? 'Vencida' : task.status === 'completed' ? 'Completada' : 'Abierta'
    : task.status === 'overdue' ? 'Overdue' : task.status === 'completed' ? 'Completed' : 'Open';

  return (
    <Card key={task.id} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <Pill tone={tone}>{label}</Pill>
        <p className="text-xs text-slate-500">{task.due_date}</p>
      </div>
      <p className="mt-3 font-medium">{task.description}</p>
      <p className="mt-1 text-sm text-slate-500">{task.opportunities?.title ?? '—'}</p>
      <div className="mt-4 flex gap-2">
        {task.status !== 'completed' ? (
          <form action={completeTask}>
            <input type="hidden" name="id" value={task.id} />
            <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800">
              {locale === 'es' ? 'Marcar hecha' : 'Mark done'}
            </button>
          </form>
        ) : (
          <form action={reopenTask}>
            <input type="hidden" name="id" value={task.id} />
            <input type="hidden" name="due_date" value={task.due_date} />
            <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
              {locale === 'es' ? 'Reabrir' : 'Reopen'}
            </button>
          </form>
        )}
      </div>
    </Card>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { t, locale } = await getI18n();
  const params = (await searchParams) ?? {};
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : '';
  const statusFilter = typeof params.status === 'string' ? params.status : '';

  const { data } = await supabase
    .from('tasks')
    .select(`
      id,
      description,
      due_date,
      status,
      opportunities(title)
    `)
    .order('due_date', { ascending: true })
    .limit(100);

  const rows = ((data ?? []) as unknown as TaskListItem[]).filter((task) => {
    const matchesQuery = !q || [task.description, task.opportunities?.title]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
    const matchesStatus = !statusFilter || task.status === statusFilter;
    return matchesQuery && matchesStatus;
  });
  const grouped = groupTasks(rows);

  const sections = [
    { key: 'overdue', title: locale === 'es' ? 'Vencidas' : 'Overdue', items: grouped.overdue },
    { key: 'open', title: locale === 'es' ? 'Próximas' : 'Upcoming', items: grouped.open },
    { key: 'completed', title: locale === 'es' ? 'Completadas' : 'Completed', items: grouped.completed },
  ];

  const exportParams = new URLSearchParams();
  if (q) exportParams.set('q', q);
  if (statusFilter) exportParams.set('status', statusFilter);

  return (
    <div className="space-y-8">
      <PageHeader title={t.tasks.title} description={t.tasks.description} />

      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-[1.2fr,0.8fr,auto,auto] md:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Buscar' : 'Search'}</label>
            <input name="q" defaultValue={q} placeholder={locale === 'es' ? 'Descripción u oportunidad' : 'Description or opportunity'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Estatus' : 'Status'}</label>
            <select name="status" defaultValue={statusFilter} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
              <option value="">{locale === 'es' ? 'Todos' : 'All'}</option>
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{locale === 'es' ? 'Filtrar' : 'Filter'}</button>
          <a href={`/api/export/tasks${exportParams.size ? `?${exportParams.toString()}` : ''}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{locale === 'es' ? 'Exportar CSV' : 'Export CSV'}</a>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-slate-500">{locale === 'es' ? 'Vencidas' : 'Overdue'}</p><p className="mt-2 text-3xl font-semibold">{grouped.overdue.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">{locale === 'es' ? 'Abiertas' : 'Open'}</p><p className="mt-2 text-3xl font-semibold">{grouped.open.length}</p></Card>
        <Card className="p-5"><p className="text-sm text-slate-500">{locale === 'es' ? 'Completadas' : 'Completed'}</p><p className="mt-2 text-3xl font-semibold">{grouped.completed.length}</p></Card>
      </div>

      {sections.map((section) => (
        <Card key={section.key} className="p-6">
          <SectionTitle title={section.title} />
          {section.items.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((task) => <TaskCard key={task.id} task={task} locale={locale} />)}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">{t.tasks.empty}</p>
          )}
        </Card>
      ))}
    </div>
  );
}
