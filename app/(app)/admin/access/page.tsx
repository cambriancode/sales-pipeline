import { PageHeader } from "@/components/page-header";
import { SimpleTable } from "@/components/simple-table";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n";
import { requireAdminProfile } from "@/components/admin/admin-guard";
import { createAllowedEmail } from "./actions";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdminProfile();
  const supabase = await createClient();
  const { t } = await getI18n();
  const params = await searchParams;

  const error = params.error;
  const success = params.success;

  const { data } = await supabase
    .from("allowed_emails")
    .select("email, role, preferred_language, is_active, invited_by_user_id")
    .order("email");

  const rows = (data ?? []).map((item) => [
    item.email,
    item.role,
    item.preferred_language,
    item.is_active ? t.admin.access.active : t.admin.access.inactive,
    item.invited_by_user_id ?? "—",
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.admin.access.title}
        description={t.admin.access.description}
      />

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {t.admin.access.created ?? "Email autorizado agregado correctamente."}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(error)}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,1.3fr]">
        <form
          action={createAllowedEmail}
          className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h3 className="text-base font-semibold">{t.admin.access.create}</h3>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.access.email}
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.access.role}
            </label>
            <select
              name="role"
              className="w-full rounded-lg border px-3 py-2"
              defaultValue="account_manager"
            >
              <option value="account_manager">account_manager</option>
              <option value="finance_supervisor">finance_supervisor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.access.language}
            </label>
            <select
              name="preferred_language"
              className="w-full rounded-lg border px-3 py-2"
              defaultValue="es"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t.common.create}
          </button>

          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t.admin.authRule}
          </div>
        </form>

        <SimpleTable
          columns={[
            t.admin.access.email,
            t.admin.access.role,
            t.admin.access.language,
            t.admin.access.status,
            t.admin.access.invitedBy,
          ]}
          rows={rows}
          emptyMessage={t.common.noData}
        />
      </div>
    </div>
  );
}