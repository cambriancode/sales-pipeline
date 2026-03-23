import { OpportunityForm } from '@/components/opportunities/opportunity-form';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { getI18n } from '@/lib/i18n';
import { createOpportunity } from '../actions';

export default async function NewOpportunityPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const supabase = await createClient();
  const { t, locale } = await getI18n();
  const params = await searchParams;

  const [{ data: accounts }, { data: opportunityTypes }, { data: stages }] = await Promise.all([
    supabase.from('accounts').select('id, name').order('name'),
    supabase.from('opportunity_types').select('id, name').order('sort_order'),
    supabase.from('opportunity_stages').select('id, name').order('sort_order'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t.opportunities.createTitle} description={t.opportunities.createDescription} />
      <OpportunityForm
        action={createOpportunity}
        accounts={accounts ?? []}
        opportunityTypes={opportunityTypes ?? []}
        stages={stages ?? []}
        initial={{ account_id: params.accountId }}
        labels={{
          title: t.opportunities.createTitle,
          description: t.opportunities.createDescription,
          save: t.common.save,
          cancel: t.common.cancel,
          account: t.opportunities.account,
          type: t.opportunities.type,
          stage: t.common.stage,
          annualValue: t.common.annualValue,
          valueFirst: t.opportunities.valueFirst,
          nextAction: t.common.nextAction,
          nextActionDate: locale === 'es' ? 'Fecha próxima acción' : 'Next action due date',
          expectedClose: t.opportunities.expectedClose,
          needSummary: t.opportunities.needSummary,
          productPlaceholder: t.opportunities.productPlaceholder,
          customerStakeholderSection: locale === 'es' ? 'Responsable del cliente (opcional)' : 'Customer-side owner (optional)',
          customerStakeholderHint: locale === 'es' ? 'Guarda desde el inicio quién es la contraparte principal en esta oportunidad.' : 'Capture the main stakeholder on the customer side for this opportunity.',
          customerStakeholderName: locale === 'es' ? 'Nombre del contacto' : 'Contact name',
          customerStakeholderRole: locale === 'es' ? 'Puesto / rol' : 'Job title / role',
          customerStakeholderEmail: 'Email',
          customerStakeholderPhone: locale === 'es' ? 'Teléfono' : 'Phone',
        }}
      />
    </div>
  );
}
