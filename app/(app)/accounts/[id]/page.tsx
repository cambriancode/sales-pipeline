import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { createClient } from '@/lib/supabase/server';
import { createContact } from '../actions';
import { getI18n } from '@/lib/i18n';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { locale } = await getI18n();

  const [{ data: account }, { data: contacts }, { data: opportunities }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, legal_name, billing_city, billing_country, notes, account_types(name)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('contacts')
      .select('id, full_name, job_title, email, phone, is_decision_maker')
      .eq('account_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('opportunities')
      .select('id, title, probability, weighted_value, opportunity_stages(name)')
      .eq('account_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  if (!account) notFound();

  const copy = {
    overview: locale === 'es' ? 'Resumen de cuenta' : 'Account overview',
    contacts: locale === 'es' ? 'Contactos' : 'Contacts',
    linkedOpps: locale === 'es' ? 'Oportunidades vinculadas' : 'Linked opportunities',
    addContact: locale === 'es' ? 'Agregar contacto' : 'Add contact',
    contactName: locale === 'es' ? 'Nombre completo' : 'Full name',
    title: locale === 'es' ? 'Puesto' : 'Job title',
    email: 'Email',
    phone: locale === 'es' ? 'Teléfono' : 'Phone',
    decisionMaker: locale === 'es' ? 'Es decisor' : 'Decision maker',
    createOpportunity: locale === 'es' ? 'Nueva oportunidad' : 'New opportunity',
    noContacts: locale === 'es' ? 'Aún no hay contactos capturados.' : 'No contacts captured yet.',
    noOpps: locale === 'es' ? 'Aún no hay oportunidades para esta cuenta.' : 'No opportunities for this account yet.',
    save: locale === 'es' ? 'Guardar contacto' : 'Save contact',
    legalName: locale === 'es' ? 'Razón social' : 'Legal name',
    cityCountry: locale === 'es' ? 'Ubicación' : 'Location',
    notes: locale === 'es' ? 'Notas' : 'Notes',
    stage: locale === 'es' ? 'Etapa' : 'Stage',
    weighted: locale === 'es' ? 'Ponderado' : 'Weighted',
  };

  return (
    <div className="space-y-8">
      <PageHeader title={account.name} description={locale === 'es' ? 'Ficha de cuenta con contactos y oportunidades.' : 'Account record with contacts and opportunities.'} />

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle title={copy.overview} action={<Link href={`/opportunities/new?accountId=${account.id}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{copy.createOpportunity}</Link>} />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-slate-500">{copy.legalName}</p>
                <p className="font-medium">{account.legal_name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{copy.cityCountry}</p>
                <p className="font-medium">{account.billing_city ?? '—'}{account.billing_country ? `, ${account.billing_country}` : ''}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Tipo</p>
                <p className="font-medium">{(account as any).account_types?.name ?? '—'}</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">{copy.notes}</p>
              <p className="mt-1 text-sm text-slate-700">{account.notes ?? '—'}</p>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.linkedOpps} />
            <div className="mt-4 space-y-3">
              {(opportunities ?? []).length > 0 ? opportunities!.map((opportunity: any) => (
                <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="block rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{opportunity.title}</p>
                      <p className="text-sm text-slate-500">{copy.stage}: {opportunity.opportunity_stages?.name ?? '—'}</p>
                    </div>
                    <Pill tone={Number(opportunity.probability) >= 60 ? 'sky' : 'amber'}>{Number(opportunity.weighted_value).toLocaleString()}</Pill>
                  </div>
                </Link>
              )) : <p className="text-sm text-slate-500">{copy.noOpps}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle title={copy.contacts} />
            <div className="mt-4 space-y-3">
              {(contacts ?? []).length > 0 ? contacts!.map((contact: any) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{contact.full_name}</p>
                      <p className="text-sm text-slate-500">{contact.job_title ?? '—'}</p>
                    </div>
                    {contact.is_decision_maker ? <Pill tone="emerald">{copy.decisionMaker}</Pill> : null}
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    <p>{contact.email ?? '—'}</p>
                    <p>{contact.phone ?? '—'}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-slate-500">{copy.noContacts}</p>}
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.addContact} />
            <form action={createContact} className="mt-4 space-y-4">
              <input type="hidden" name="account_id" value={account.id} />
              <div>
                <label className="mb-1 block text-sm font-medium">{copy.contactName}</label>
                <input name="full_name" required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{copy.title}</label>
                <input name="job_title" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{copy.email}</label>
                <input name="email" type="email" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{copy.phone}</label>
                <input name="phone" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" name="is_decision_maker" />
                {copy.decisionMaker}
              </label>
              <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{copy.save}</button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
