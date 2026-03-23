import Link from 'next/link';

export function AccountForm({
  action,
  labels,
  accountTypes,
}: {
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    title: string;
    description: string;
    save: string;
    cancel: string;
    name: string;
    legalName: string;
    city: string;
    country: string;
    type: string;
    notes: string;
    hint: string;
    stakeholderSection: string;
    stakeholderHint: string;
    stakeholderName: string;
    stakeholderEmail: string;
    stakeholderPhone: string;
  };
  accountTypes: Array<{ id: string; name: string }>;
}) {
  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">{labels.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{labels.description}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.name}</label>
        <input name="name" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.legalName}</label>
        <input name="legal_name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.type}</label>
        <select name="account_type_id" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          <option value="">—</option>
          {accountTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.city}</label>
        <input name="billing_city" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.country}</label>
        <input name="billing_country" defaultValue="México" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-semibold text-slate-900">{labels.stakeholderSection}</h3>
        <p className="mt-1 text-sm text-slate-500">{labels.stakeholderHint}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.stakeholderName}</label>
            <input name="stakeholder_full_name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.stakeholderPhone}</label>
            <input name="stakeholder_phone" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.stakeholderEmail}</label>
            <input name="stakeholder_email" type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <label className="mb-1 block text-sm font-medium">{labels.notes}</label>
        <textarea name="notes" rows={4} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
        <p className="mt-2 text-xs text-slate-500">{labels.hint}</p>
      </div>

      <div className="lg:col-span-2 flex items-center gap-3">
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{labels.save}</button>
        <Link href="/accounts" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
