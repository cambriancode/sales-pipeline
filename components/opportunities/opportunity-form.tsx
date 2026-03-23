import Link from 'next/link';

export function OpportunityForm({
  action,
  labels,
  accounts,
  opportunityTypes,
  stages,
  initial,
}: {
  action: (formData: FormData) => void | Promise<void>;
  labels: {
    title: string;
    description: string;
    save: string;
    cancel: string;
    account: string;
    type: string;
    stage: string;
    annualValue: string;
    valueFirst: string;
    nextAction: string;
    expectedClose: string;
    needSummary: string;
    productPlaceholder: string;
    nextActionDate: string;
    customerStakeholderSection: string;
    customerStakeholderHint: string;
    customerStakeholderName: string;
    customerStakeholderRole: string;
    customerStakeholderEmail: string;
    customerStakeholderPhone: string;
  };
  accounts: Array<{ id: string; name: string }>;
  opportunityTypes: Array<{ id: string; name: string }>;
  stages: Array<{ id: string; name: string }>;
  initial?: Partial<{
    account_id: string;
    title: string;
    opportunity_type_id: string;
    stage_id: string;
    expected_close_date: string;
    annual_value_estimate: number;
    first_value_estimate: number;
    next_action: string;
    next_action_due_date: string;
    need_summary: string;
  }>;
}) {
  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">{labels.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{labels.description}</p>
      </div>

      <div className="lg:col-span-2">
        <label className="mb-1 block text-sm font-medium">Título</label>
        <input name="title" required defaultValue={initial?.title} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.account}</label>
        <select name="account_id" required defaultValue={initial?.account_id} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          <option value="">—</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.type}</label>
        <select name="opportunity_type_id" required defaultValue={initial?.opportunity_type_id} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          <option value="">—</option>
          {opportunityTypes.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.stage}</label>
        <select name="stage_id" required defaultValue={initial?.stage_id ?? stages[0]?.id} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
          {stages.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.expectedClose}</label>
        <input name="expected_close_date" type="date" defaultValue={initial?.expected_close_date} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.annualValue}</label>
        <input name="annual_value_estimate" type="number" step="0.01" min="0" defaultValue={initial?.annual_value_estimate ?? 0} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.valueFirst}</label>
        <input name="first_value_estimate" type="number" step="0.01" min="0" defaultValue={initial?.first_value_estimate ?? 0} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div className="lg:col-span-2">
        <label className="mb-1 block text-sm font-medium">{labels.nextAction}</label>
        <input name="next_action" required defaultValue={initial?.next_action} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">{labels.nextActionDate}</label>
        <input name="next_action_due_date" type="date" required defaultValue={initial?.next_action_due_date} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {labels.productPlaceholder}
      </div>

      <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-semibold text-slate-900">{labels.customerStakeholderSection}</h3>
        <p className="mt-1 text-sm text-slate-500">{labels.customerStakeholderHint}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.customerStakeholderName}</label>
            <input name="customer_contact_full_name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.customerStakeholderRole}</label>
            <input name="customer_contact_job_title" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.customerStakeholderPhone}</label>
            <input name="customer_contact_phone" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{labels.customerStakeholderEmail}</label>
            <input name="customer_contact_email" type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <label className="mb-1 block text-sm font-medium">{labels.needSummary}</label>
        <textarea name="need_summary" rows={4} defaultValue={initial?.need_summary} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
      </div>

      <div className="lg:col-span-2 flex items-center gap-3">
        <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{labels.save}</button>
        <Link href="/opportunities" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">
          {labels.cancel}
        </Link>
      </div>
    </form>
  );
}
