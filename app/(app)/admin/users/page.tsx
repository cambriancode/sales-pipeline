import { PageHeader } from "@/components/page-header";
import { SimpleTable } from "@/components/simple-table";
import { Card, SectionTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n";
import { requireAdminProfile } from "@/components/admin/admin-guard";
import { upsertSalesTarget } from "./actions";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminProfile();
  const supabase = await createClient();
  const { t, locale } = await getI18n();
  const params = (await searchParams) ?? {};
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, preferred_language, is_active")
    .order("email");
  const { data: targets } = await supabase
    .from('sales_targets')
    .select('id, owner_user_id, period_type, period_start, period_end, won_value_target, weighted_pipeline_target, raw_pipeline_target, notes, profiles!sales_targets_owner_user_id_fkey(full_name)')
    .order('period_start', { ascending: false });

  const rows = (users ?? []).map((item) => [
    item.full_name,
    item.email,
    item.role,
    item.preferred_language ?? "es",
    item.is_active ? t.admin.access.active : t.admin.access.inactive,
  ]);

  const targetRows = (targets ?? []).map((item: any) => [
    Array.isArray(item.profiles) ? item.profiles[0]?.full_name ?? '—' : item.profiles?.full_name ?? '—',
    item.period_type,
    `${item.period_start} → ${item.period_end}`,
    Number(item.weighted_pipeline_target ?? 0).toLocaleString(),
    Number(item.won_value_target ?? 0).toLocaleString(),
    Number(item.raw_pipeline_target ?? 0).toLocaleString(),
    item.notes ?? '—',
  ]);

  const accountManagers = (users ?? []).filter((user) => user.role === 'account_manager');

  return (
    <div className="space-y-8">
      <PageHeader title={t.admin.users.title} description={t.admin.users.description} />

      {params.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {locale === 'es' ? 'Meta guardada correctamente.' : 'Target saved successfully.'}
        </div>
      ) : null}

      {params.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(params.error)}
        </div>
      ) : null}

      <SimpleTable columns={["Nombre", "Email", "Rol", "Idioma", "Estado"]} rows={rows} emptyMessage={t.common.noData} />

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.2fr]">
        <Card className="p-6">
          <SectionTitle
            title={locale === 'es' ? 'Metas por account manager' : 'Account manager targets'}
            description={locale === 'es' ? 'Configura la meta vigente de pipeline y resultado para cada responsable.' : 'Set the active pipeline and outcome target for each owner.'}
          />
          <form action={upsertSalesTarget} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Responsable' : 'Owner'}</label>
              <select name="owner_user_id" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required>
                <option value="">—</option>
                {accountManagers.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Periodo' : 'Period type'}</label>
                <select name="period_type" defaultValue="quarterly" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
                  <option value="monthly">monthly</option>
                  <option value="quarterly">quarterly</option>
                  <option value="yearly">yearly</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Notas' : 'Notes'}</label>
                <input name="notes" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Inicio' : 'Start'}</label>
                <input name="period_start" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Fin' : 'End'}</label>
                <input name="period_end" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Meta ganada' : 'Won target'}</label>
                <input name="won_value_target" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Meta ponderada' : 'Weighted target'}</label>
                <input name="weighted_pipeline_target" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Meta bruta' : 'Raw target'}</label>
                <input name="raw_pipeline_target" type="number" min="0" step="0.01" defaultValue="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
            </div>
            <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{locale === 'es' ? 'Guardar meta' : 'Save target'}</button>
          </form>
        </Card>

        <SimpleTable
          columns={[
            locale === 'es' ? 'Responsable' : 'Owner',
            locale === 'es' ? 'Periodo' : 'Period',
            locale === 'es' ? 'Rango' : 'Range',
            locale === 'es' ? 'Meta ponderada' : 'Weighted target',
            locale === 'es' ? 'Meta ganada' : 'Won target',
            locale === 'es' ? 'Meta bruta' : 'Raw target',
            locale === 'es' ? 'Notas' : 'Notes',
          ]}
          rows={targetRows}
          emptyMessage={t.common.noData}
        />
      </div>
    </div>
  );
}
