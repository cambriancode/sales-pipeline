import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createContact } from '../actions';
import { getI18n } from '@/lib/i18n';

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { locale } = await getI18n();

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, legal_name, billing_city, billing_country, notes, created_by_user_id, account_types(name)')
    .eq('id', id)
    .maybeSingle();

  if (!account) notFound();

  const { count: linkedOwnedOpportunityCount } = profile?.role === 'account_manager'
    ? await supabase
        .from('opportunities')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', id)
        .eq('owner_user_id', profile.id)
    : { count: 0 };

  const canManageAccount = Boolean(
    profile && (
      profile.role === 'admin'
      || (
        profile.role === 'account_manager'
        && (
          account.created_by_user_id === profile.id
          || (linkedOwnedOpportunityCount ?? 0) > 0
        )
      )
    )
  );

  const canViewPrivateAccountFields = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'finance_supervisor' || canManageAccount)
  );

  const [{ data: contacts }, { data: opportunities }] = await Promise.all([
    canViewPrivateAccountFields
      ? supabase
          .from('contacts')
          .select('id, full_name, job_title, email, phone, is_decision_maker')
          .eq('account_id', id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    supabase
      .from('opportunities')
      .select('id, title, status, probability, weighted_value, opportunity_stages(name)')
      .eq('account_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

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
    status: locale === 'es' ? 'Estatus' : 'Status',
    privateFieldsNotice: locale === 'es'
      ? 'Los datos sensibles de cuenta (notas y contactos) sólo se muestran al responsable, finanzas o admins.'
      : 'Sensitive account details (notes and contacts) are only visible to the owner, finance, or admins.',
    readOnlyNotice: locale === 'es'
      ? 'Esta cuenta ahora es visible para todo el equipo en modo consulta.'
      : 'This account is now visible to the full team in read-only mode.',
  };

  return (
    <div className="space-y-8">
      <PageHeader title={account.name} description={locale === 'es' ? 'Ficha de cuenta con oportunidades compartidas y detalles privados protegidos.' : 'Account record with shared opportunity visibility and protected private details.'} />

      {!canManageAccount ? (
        <Card className="border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{copy.readOnlyNotice}</Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle
              title={copy.overview}
              action={canManageAccount ? (
                <Link href={`/opportunities/new?accountId=${account.id}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{copy.createOpportunity}</Link>
              ) : undefined}
            />
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
              {canViewPrivateAccountFields ? (
                <p className="mt-1 text-sm text-slate-700">{account.notes ?? '—'}</p>
              ) : (
                <p className="mt-1 text-sm text-slate-600">{copy.privateFieldsNotice}</p>
              )}
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
                      <p className="mt-1 text-sm text-slate-500">{copy.status}: {opportunity.status}</p>
                    </div>
                    <Pill tone={Number(opportunity.probability) >= 60 ? 'sky' : opportunity.status === 'won' ? 'emerald' : opportunity.status === 'lost' ? 'rose' : 'amber'}>{Number(opportunity.weighted_value).toLocaleString()}</Pill>
                  </div>
                </Link>
              )) : <p className="text-sm text-slate-500">{copy.noOpps}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <SectionTitle title={copy.contacts} />
            {canViewPrivateAccountFields ? (
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
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privateFieldsNotice}</p>
            )}
          </Card>

          {canManageAccount ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
