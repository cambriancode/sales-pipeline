import { PageHeader } from "@/components/page-header";
import { SimpleTable } from "@/components/simple-table";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n";
import { requireAdminProfile } from "@/components/admin/admin-guard";

export default async function AdminUsersPage() {
  await requireAdminProfile();
  const supabase = await createClient();
  const { t } = await getI18n();
  const { data } = await supabase.from("profiles").select("full_name, email, role, preferred_language, is_active").order("email");

  const rows = (data ?? []).map((item) => [
    item.full_name,
    item.email,
    item.role,
    item.preferred_language ?? "es",
    item.is_active ? t.admin.access.active : t.admin.access.inactive,
  ]);

  return (
    <div>
      <PageHeader title={t.admin.users.title} description={t.admin.users.description} />
      <SimpleTable columns={["Nombre", "Email", "Rol", "Idioma", "Estado"]} rows={rows} emptyMessage={t.common.noData} />
    </div>
  );
}
