import { AccountForm } from '@/components/accounts/account-form';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { getI18n } from '@/lib/i18n';
import { createAccount } from '../actions';

export default async function NewAccountPage() {
  const supabase = await createClient();
  const { t } = await getI18n();

  const { data: accountTypes } = await supabase.from('account_types').select('id, name').order('sort_order');

  return (
    <div className="space-y-6">
      <PageHeader title={t.accounts.createTitle} description={t.accounts.createDescription} />
      <AccountForm
        action={createAccount}
        accountTypes={accountTypes ?? []}
        labels={{
          title: t.accounts.createTitle,
          description: t.accounts.createDescription,
          save: t.common.save,
          cancel: t.common.cancel,
          name: t.accounts.name,
          legalName: t.accounts.legalName,
          city: t.accounts.city,
          country: t.accounts.country,
          type: t.accounts.type,
          notes: t.accounts.notes,
          hint: t.accounts.newHint,
        }}
      />
    </div>
  );
}
