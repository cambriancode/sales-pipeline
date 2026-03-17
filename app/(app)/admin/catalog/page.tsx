import { PageHeader } from "@/components/page-header";
import { SimpleTable } from "@/components/simple-table";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n";
import { requireAdminProfile } from "@/components/admin/admin-guard";
import { createProduct } from "./actions";

export default async function AdminCatalogPage({
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
    .from("products")
    .select("name, sku, category, unit_of_measure, base_price, is_active")
    .order("name");

  const rows = (data ?? []).map((item) => [
    item.name,
    item.sku ?? "—",
    item.category ?? "—",
    item.unit_of_measure ?? "—",
    item.base_price ?? "—",
    item.is_active ? t.admin.access.active : t.admin.access.inactive,
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t.admin.catalog.title}
        description={t.admin.catalog.description}
      />

      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Producto creado correctamente.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {decodeURIComponent(error)}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr,1.3fr]">
        <form
          action={createProduct}
          className="space-y-4 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h3 className="text-base font-semibold">{t.admin.catalog.create}</h3>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.catalog.name}
            </label>
            <input
              name="name"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">SKU</label>
            <input
              name="sku"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.catalog.category}
            </label>
            <input
              name="category"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.catalog.description}
            </label>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.catalog.unit}
            </label>
            <input
              name="unit_of_measure"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              {t.admin.catalog.basePrice}
            </label>
            <input
              name="base_price"
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
            {t.common.create}
          </button>
        </form>

        <SimpleTable
          columns={[
            t.admin.catalog.name,
            "SKU",
            t.admin.catalog.category,
            t.admin.catalog.unit,
            t.admin.catalog.basePrice,
            t.admin.access.status,
          ]}
          rows={rows}
          emptyMessage={t.common.noData}
        />
      </div>
    </div>
  );
}