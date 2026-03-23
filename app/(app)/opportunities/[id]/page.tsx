import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card, Pill, SectionTitle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { OPPORTUNITY_DOCUMENT_BUCKET } from '@/lib/document-storage';
import { getI18n } from '@/lib/i18n';
import { demoOpportunities } from '@/lib/demo-data';
import { addOpportunityActivity, addOpportunityDocument, addOpportunityProduct, closeOpportunity, rescheduleOpportunityFollowUp, updateOpportunity } from '../actions';

function Notice({ type, message }: { type: 'success' | 'error'; message: string }) {
  const tones = type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-rose-200 bg-rose-50 text-rose-800';

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tones}`}>{message}</div>;
}

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const { t, locale } = await getI18n();
  const demo = demoOpportunities.find((item) => item.id === id);

  if (demo) {
    return (
      <div className="space-y-8">
        <PageHeader title={demo.title} description={t.opportunities.detailDescription} />
        <div className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr]">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{demo.accountName} · {demo.city}</p>
                <h2 className="mt-1 text-2xl font-semibold">{demo.title}</h2>
              </div>
              <Pill tone={demo.probability >= 80 ? 'emerald' : demo.probability >= 60 ? 'sky' : 'amber'}>
                {locale === 'es' ? demo.stageNameEs : demo.stageNameEn}
              </Pill>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{t.common.owner}</p>
                <p className="font-semibold">{demo.ownerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.common.annualValue}</p>
                <p className="font-semibold">{demo.annualValue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.common.weighted}</p>
                <p className="font-semibold">{demo.weightedValue.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">{t.common.nextAction}</p>
              <p className="mt-1 font-medium">{locale === 'es' ? demo.nextActionEs : demo.nextActionEn}</p>
              <p className="mt-1 text-sm text-slate-500">{demo.nextActionDate}</p>
            </div>
            <div className="mt-6">
              <SectionTitle title={t.opportunities.commercialFocus} />
              <p className="text-sm text-slate-600">{locale === 'es' ? demo.notesEs : demo.notesEn}</p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="p-6">
              <SectionTitle title={t.common.products} />
              <div className="flex flex-wrap gap-2">
                {(locale === 'es' ? demo.productsEs : demo.productsEn).map((product) => (
                  <Pill key={product} tone="sky">{product}</Pill>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <SectionTitle title={t.opportunities.stageSummary} />
              <ul className="space-y-3 text-sm text-slate-600">
                <li>{t.common.stage}: {locale === 'es' ? demo.stageNameEs : demo.stageNameEn}</li>
                <li>{t.opportunities.probability}: {demo.probability}%</li>
                <li>{t.opportunities.type}: {locale === 'es' ? demo.typeEs : demo.typeEn}</li>
                <li>{t.opportunities.expectedClose}: {demo.nextActionDate}</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select(`
      id,
      title,
      status,
      owner_user_id,
      probability,
      annual_value_estimate,
      first_value_estimate,
      weighted_value,
      expected_close_date,
      next_action,
      next_action_due_date,
      need_summary,
      account_id,
      stage_id,
      close_date,
      close_value,
      accounts(name),
      opportunity_stages(name),
      opportunity_types(name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!opportunity) notFound();

  function relationName(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value[0] as { name?: string } | undefined;
      return first?.name ?? '—';
    }

    const obj = value as { name?: string } | null | undefined;
    return obj?.name ?? '—';
  }

  const accountName = relationName((opportunity as any).accounts);
  const stageName = relationName((opportunity as any).opportunity_stages);
  const typeName = relationName((opportunity as any).opportunity_types);
  const canManageOpportunity = Boolean(
    profile && (
      profile.role === 'admin'
      || (
        profile.role === 'account_manager'
        && opportunity.owner_user_id === profile.id
        && opportunity.status === 'open'
      )
    )
  );
  const canViewPrivatePanels = Boolean(
    profile && (
      profile.role === 'admin'
      || profile.role === 'finance_supervisor'
      || opportunity.owner_user_id === profile.id
    )
  );

  const [
    { data: lines },
    { data: products },
    { data: stages },
    { data: activities },
    { data: history },
    { data: tasks },
    { data: opportunityContacts },
    { data: documentTypes },
    { data: documents },
    { data: lostReasons },
  ] = await Promise.all([
    supabase
      .from('opportunity_products')
      .select('id, custom_item_name, quantity_estimate, unit_price_estimate, products(name)')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false }),
    canManageOpportunity
      ? supabase.from('products').select('id, name').order('name')
      : Promise.resolve({ data: [] as any[] }),
    canManageOpportunity
      ? supabase.from('opportunity_stages').select('id, name').order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
    canViewPrivatePanels
      ? supabase
          .from('activities')
          .select('id, activity_type, summary, details, next_step, activity_at, scheduled_date, scheduled_time, scheduled_end_date, scheduled_end_time, timezone, location, calendar_uid, notification_sent_at')
          .eq('opportunity_id', id)
          .order('activity_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    canViewPrivatePanels
      ? supabase
          .from('opportunity_stage_history')
          .select('id, changed_at, to_probability, opportunity_stages!opportunity_stage_history_to_stage_id_fkey(name)')
          .eq('opportunity_id', id)
          .order('changed_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    canViewPrivatePanels
      ? supabase
          .from('tasks')
          .select('id, description, due_date, status')
          .eq('opportunity_id', id)
          .order('due_date', { ascending: true })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    canViewPrivatePanels
      ? supabase
          .from('opportunity_contacts')
          .select('id, relationship_role, is_primary, contacts(full_name, job_title, email, phone)')
          .eq('opportunity_id', id)
          .order('is_primary', { ascending: false })
      : Promise.resolve({ data: [] as any[] }),
    canManageOpportunity
      ? supabase.from('document_types').select('id, name').order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
    canViewPrivatePanels
      ? supabase
          .from('documents')
          .select('id, request_date, due_date, status, notes, file_path, file_name, uploaded_at, document_types(name)')
          .eq('opportunity_id', id)
          .order('created_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    canManageOpportunity
      ? supabase.from('lost_reasons').select('id, name').order('sort_order')
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const documentsWithUrls = canViewPrivatePanels
    ? await Promise.all(
        (documents ?? []).map(async (document: any) => {
          if (!document.file_path) {
            return { ...document, signedUrl: null };
          }

          try {
            const admin = createAdminClient();
            const { data } = await admin.storage
              .from(OPPORTUNITY_DOCUMENT_BUCKET)
              .createSignedUrl(document.file_path, 60 * 15);

            return { ...document, signedUrl: data?.signedUrl ?? null };
          } catch {
            return { ...document, signedUrl: null };
          }
        })
      )
    : [];

  const copy = {
    commercialPanel: locale === 'es' ? 'Editar oportunidad' : 'Edit opportunity',
    productsPanel: locale === 'es' ? 'Productos y servicios vinculados' : 'Linked products and services',
    addLine: locale === 'es' ? 'Agregar línea' : 'Add line item',
    addActivity: locale === 'es' ? 'Agregar actividad' : 'Add activity',
    activityTimeline: locale === 'es' ? 'Timeline comercial' : 'Commercial timeline',
    stageHistory: locale === 'es' ? 'Historial de etapa' : 'Stage history',
    customItem: locale === 'es' ? 'Placeholder / item manual' : 'Placeholder / custom item',
    quantity: locale === 'es' ? 'Cantidad estimada' : 'Estimated quantity',
    unitPrice: locale === 'es' ? 'Precio unitario' : 'Unit price',
    saveChanges: locale === 'es' ? 'Guardar cambios' : 'Save changes',
    summary: locale === 'es' ? 'Resumen' : 'Summary',
    details: locale === 'es' ? 'Detalle' : 'Details',
    nextStep: locale === 'es' ? 'Siguiente paso' : 'Next step',
    noActivities: locale === 'es' ? 'Sin actividades todavía.' : 'No activities yet.',
    noHistory: locale === 'es' ? 'Sin cambios de etapa todavía.' : 'No stage changes yet.',
    nextStepDate: locale === 'es' ? 'Fecha siguiente paso' : 'Next-step due date',
    followUpTasks: locale === 'es' ? 'Tareas vinculadas' : 'Linked tasks',
    followUpControl: locale === 'es' ? 'Seguimiento actual' : 'Current follow-up',
    followUpControlDescription: locale === 'es'
      ? 'La próxima acción ya no se edita directamente aquí. Actualízala desde una nueva actividad o sólo reprograma la fecha actual.'
      : 'The next action is no longer edited directly here. Update it from a new activity, or only reschedule the current date.',
    rescheduleFollowUp: locale === 'es' ? 'Reprogramar seguimiento' : 'Reschedule follow-up',
    rescheduleDate: locale === 'es' ? 'Nueva fecha de seguimiento' : 'New follow-up date',
    currentFollowUpLabel: locale === 'es' ? 'Próxima acción vigente' : 'Current next action',
    nextActionManagedNote: locale === 'es'
      ? 'La próxima acción se actualiza cuando registras una actividad con siguiente paso.'
      : 'The next action is updated when you log an activity with a next step.',
    noTasks: locale === 'es' ? 'Sin tareas vinculadas todavía.' : 'No linked tasks yet.',
    stakeholderPanel: locale === 'es' ? 'Stakeholders del cliente' : 'Customer stakeholders',
    stakeholderPrimary: locale === 'es' ? 'Principal' : 'Primary',
    stakeholderRole: locale === 'es' ? 'Rol' : 'Role',
    stakeholderNone: locale === 'es' ? 'Aún no hay stakeholders vinculados a esta oportunidad.' : 'No customer stakeholders linked to this opportunity yet.',
    docsPanel: locale === 'es' ? 'Pipeline documental' : 'Document pipeline',
    scheduleStart: locale === 'es' ? 'Inicio programado' : 'Scheduled start',
    scheduleEnd: locale === 'es' ? 'Fin programado' : 'Scheduled end',
    timezone: locale === 'es' ? 'Zona horaria' : 'Time zone',
    location: locale === 'es' ? 'Ubicación' : 'Location',
    calendarDownload: locale === 'es' ? 'Descargar .ics' : 'Download .ics',
    emailSent: locale === 'es' ? 'Email enviado al responsable' : 'Email sent to owner',
    emailPending: locale === 'es' ? 'Email pendiente / SMTP no configurado' : 'Email pending / SMTP not configured',
    calendarToggle: locale === 'es' ? 'Crear evento de calendario' : 'Create calendar event',
    calendarToggleHint: locale === 'es'
      ? 'Actívalo sólo si esta actividad necesita una cita en calendario y un archivo .ics.'
      : 'Turn this on only if this activity needs a calendar appointment and an .ics file.',
    calendarEventDate: locale === 'es' ? 'Fecha del evento' : 'Event date',
    startTime24: locale === 'es' ? 'Hora de inicio (24 h)' : 'Start time (24h)',
    endTime24: locale === 'es' ? 'Hora de fin (24 h)' : 'End time (24h)',
    timePlaceholder: locale === 'es' ? '1430 o 14:30' : '1430 or 14:30',
    calendarHelp: locale === 'es'
      ? 'Usa formato de 24 horas. Puedes escribir 1430 o 14:30.'
      : 'Use 24-hour format. You can type 1430 or 14:30.',
    locationOptional: locale === 'es' ? 'Ubicación (opcional)' : 'Location (optional)',
    addDoc: locale === 'es' ? 'Registrar documento' : 'Track document',
    uploadFile: locale === 'es' ? 'Adjuntar archivo' : 'Attach file',
    uploaded: locale === 'es' ? 'Archivo cargado' : 'File uploaded',
    download: locale === 'es' ? 'Descargar' : 'Download',
    noDocs: locale === 'es' ? 'Sin documentos registrados todavía.' : 'No documents tracked yet.',
    closePanel: locale === 'es' ? 'Cerrar / pausar oportunidad' : 'Close / pause opportunity',
    closeValue: locale === 'es' ? 'Valor final' : 'Final value',
    closeDate: locale === 'es' ? 'Fecha de cierre' : 'Close date',
    wonProof: locale === 'es' ? 'Prueba de cierre' : 'Win proof',
    lostReason: locale === 'es' ? 'Motivo de pérdida' : 'Lost reason',
    holdUntil: locale === 'es' ? 'Pausar hasta' : 'On hold until',
    markWon: locale === 'es' ? 'Marcar ganada' : 'Mark won',
    markLost: locale === 'es' ? 'Marcar perdida' : 'Mark lost',
    markHold: locale === 'es' ? 'Poner en pausa' : 'Put on hold',
    currentStatus: locale === 'es' ? 'Estatus actual' : 'Current status',
    readOnlyNotice: locale === 'es'
      ? 'Esta oportunidad está visible para todo el equipo en modo consulta.'
      : 'This opportunity is visible to the full team in read-only mode.',
    lockedNotice: locale === 'es'
      ? 'Las oportunidades cerradas quedan bloqueadas para account managers. Sólo admins pueden corregirlas.'
      : 'Closed opportunities are locked for account managers. Only admins can correct them.',
    privatePanelsNotice: locale === 'es'
      ? 'El historial comercial, tareas y documentos siguen protegidos para el responsable, finanzas o admins.'
      : 'Commercial history, tasks, and documents remain protected for the owner, finance, or admins.',
    stageSummary: locale === 'es' ? 'Resumen actual' : 'Current summary',
    status: locale === 'es' ? 'Estatus' : 'Status',
  };

  const formLabelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';
  const formInputClass = 'w-full rounded-2xl border border-slate-300 px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200';
  const formTextareaClass = `${formInputClass} min-h-[112px] resize-y`;
  const schedulerPanelClass = 'rounded-2xl border border-slate-200 bg-slate-50 p-4';

  const readOnlyMessage = canManageOpportunity
    ? null
    : opportunity.status !== 'open' && opportunity.owner_user_id === profile?.id
      ? copy.lockedNotice
      : copy.readOnlyNotice;

  return (
    <div className="space-y-8">
      <PageHeader title={opportunity.title} description={t.opportunities.detailDescription} />

      {resolvedSearchParams.success ? <Notice type="success" message={resolvedSearchParams.success} /> : null}
      {resolvedSearchParams.error ? <Notice type="error" message={resolvedSearchParams.error} /> : null}
      {readOnlyMessage ? <Card className="border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{readOnlyMessage}</Card> : null}
      {!canViewPrivatePanels ? <Card className="border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">{copy.privatePanelsNotice}</Card> : null}

      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr,0.95fr]">
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">{accountName}</p>
                <h2 className="mt-1 text-2xl font-semibold">{opportunity.title}</h2>
                <p className="mt-2 text-sm text-slate-500">{copy.status}: {opportunity.status}</p>
              </div>
              <Pill tone={opportunity.status === 'won' ? 'emerald' : opportunity.status === 'lost' ? 'rose' : Number(opportunity.probability) >= 60 ? 'sky' : 'amber'}>
                {stageName}
              </Pill>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">{t.common.annualValue}</p>
                <p className="font-semibold">{Number(opportunity.annual_value_estimate).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.common.weighted}</p>
                <p className="font-semibold">{Number(opportunity.weighted_value).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">{t.common.stage}</p>
                <p className="font-semibold">{stageName}</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">{t.common.nextAction}</p>
              <p className="mt-1 font-medium">{opportunity.next_action ?? '—'}</p>
              <p className="mt-1 text-sm text-slate-500">{opportunity.next_action_due_date ?? '—'}</p>
            </div>
            <div className="mt-6">
              <SectionTitle title={copy.stageSummary} />
              <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <div>
                  <p className="text-xs text-slate-500">{t.opportunities.type}</p>
                  <p className="font-medium">{typeName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.opportunities.expectedClose}</p>
                  <p className="font-medium">{opportunity.expected_close_date ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{t.opportunities.needSummary}</p>
                  <p className="font-medium whitespace-pre-wrap">{opportunity.need_summary ?? '—'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.stakeholderPanel} />
            {canViewPrivatePanels ? (
              <div className="mt-4 space-y-3">
                {(opportunityContacts ?? []).length > 0 ? opportunityContacts!.map((entry: any) => {
                  const contact = Array.isArray(entry.contacts) ? entry.contacts[0] : entry.contacts;

                  return (
                    <div key={entry.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{contact?.full_name ?? '—'}</p>
                          <p className="text-slate-500">{contact?.job_title ?? entry.relationship_role ?? '—'}</p>
                        </div>
                        {entry.is_primary ? <Pill tone="sky">{copy.stakeholderPrimary}</Pill> : null}
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        <p>{copy.stakeholderRole}: {entry.relationship_role ?? contact?.job_title ?? '—'}</p>
                        <p>{contact?.email ?? '—'}</p>
                        <p>{contact?.phone ?? '—'}</p>
                      </div>
                    </div>
                  );
                }) : <p className="text-sm text-slate-500">{copy.stakeholderNone}</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privatePanelsNotice}</p>
            )}
          </Card>


          {canManageOpportunity ? (
            <>
              <Card className="p-6">
                <SectionTitle title={copy.commercialPanel} description={t.opportunities.description} />
                <form action={updateOpportunity} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={id} />
                  <div>
                    <label className="mb-1 block text-sm font-medium">{locale === 'es' ? 'Título' : 'Title'}</label>
                    <input name="title" defaultValue={opportunity.title} required className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t.common.stage}</label>
                      <select name="stage_id" defaultValue={opportunity.stage_id} className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
                        {(stages ?? []).map((stage: any) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t.opportunities.expectedClose}</label>
                      <input name="expected_close_date" type="date" defaultValue={opportunity.expected_close_date ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t.common.annualValue}</label>
                      <input name="annual_value_estimate" type="number" step="0.01" min="0" defaultValue={Number(opportunity.annual_value_estimate)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t.opportunities.valueFirst}</label>
                      <input name="first_value_estimate" type="number" step="0.01" min="0" defaultValue={Number((opportunity as any).first_value_estimate ?? 0)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-medium">{copy.currentFollowUpLabel}</p>
                    <p className="mt-1">{opportunity.next_action ?? '—'}</p>
                    <p className="mt-1 text-slate-500">{opportunity.next_action_due_date ?? '—'}</p>
                    <p className="mt-3 text-xs text-slate-500">{copy.nextActionManagedNote}</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t.opportunities.needSummary}</label>
                    <textarea name="need_summary" rows={4} defaultValue={opportunity.need_summary ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                  </div>
                  <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">{copy.saveChanges}</button>
                </form>
              </Card>

              <Card className="p-6">
                <SectionTitle title={copy.closePanel} description={`${copy.currentStatus}: ${opportunity.status}`} />
                <div className="grid gap-4 lg:grid-cols-3">
                  <form action={closeOpportunity} className="space-y-3 rounded-2xl border border-emerald-200 p-4">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value="won" />
                    <label className="block text-sm font-medium">{copy.closeDate}</label>
                    <input name="close_date" type="date" defaultValue={opportunity.close_date ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                    <label className="block text-sm font-medium">{copy.closeValue}</label>
                    <input name="close_value" type="number" step="0.01" min="0" defaultValue={Number(opportunity.close_value ?? (opportunity as any).first_value_estimate ?? 0)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                    <label className="block text-sm font-medium">{copy.wonProof}</label>
                    <input name="won_proof_type" placeholder={locale === 'es' ? 'PO / contrato / depósito' : 'PO / contract / deposit'} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                    <button className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">{copy.markWon}</button>
                  </form>

                  <form action={closeOpportunity} className="space-y-3 rounded-2xl border border-rose-200 p-4">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value="lost" />
                    <label className="block text-sm font-medium">{copy.closeDate}</label>
                    <input name="close_date" type="date" defaultValue={opportunity.close_date ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                    <label className="block text-sm font-medium">{copy.closeValue}</label>
                    <input name="close_value" type="number" step="0.01" min="0" defaultValue="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    <label className="block text-sm font-medium">{copy.lostReason}</label>
                    <select name="lost_reason_id" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required>
                      <option value="">—</option>
                      {(lostReasons ?? []).map((reason: any) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                    </select>
                    <button className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-rose-700">{copy.markLost}</button>
                  </form>

                  <form action={closeOpportunity} className="space-y-3 rounded-2xl border border-amber-200 p-4">
                    <input type="hidden" name="id" value={id} />
                    <input type="hidden" name="status" value="on_hold" />
                    <input type="hidden" name="current_probability" value={String(opportunity.probability)} />
                    <label className="block text-sm font-medium">{copy.holdUntil}</label>
                    <input name="on_hold_until" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                    <label className="block text-sm font-medium">{copy.closeValue}</label>
                    <input name="close_value" type="number" step="0.01" min="0" defaultValue={Number(opportunity.close_value ?? 0)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    <button className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600">{copy.markHold}</button>
                  </form>
                </div>
              </Card>
            </>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6">
            <SectionTitle title={copy.productsPanel} description={t.opportunities.stageChangeRule} />
            <div className="mt-4 space-y-3">
              {lines && lines.length > 0 ? (
                lines.map((line: any) => (
                  <div key={line.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <p className="font-medium">{line.products?.name ?? line.custom_item_name ?? '—'}</p>
                    <p className="text-slate-500">{line.quantity_estimate ?? 0} × {Number(line.unit_price_estimate ?? 0).toLocaleString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t.common.noProductsYet}</p>
              )}
            </div>
            {canManageOpportunity ? (
              <form action={addOpportunityProduct} className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                <input type="hidden" name="opportunity_id" value={id} />
                <div>
                  <label className="mb-1 block text-sm font-medium">{t.common.products}</label>
                  <select name="product_id" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
                    <option value="">—</option>
                    {(products ?? []).map((product: any) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">{copy.customItem}</label>
                  <input name="custom_item_name" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{copy.quantity}</label>
                    <input name="quantity_estimate" type="number" step="0.01" min="0" defaultValue="1" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{copy.unitPrice}</label>
                    <input name="unit_price_estimate" type="number" step="0.01" min="0" defaultValue="0" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                  </div>
                </div>
                <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{copy.addLine}</button>
              </form>
            ) : null}
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.docsPanel} />
            {canViewPrivatePanels ? (
              <>
                <div className="mt-4 space-y-3">
                  {documentsWithUrls.length > 0 ? documentsWithUrls.map((document: any) => (
                    <div key={document.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{document.document_types?.name ?? '—'}</p>
                        <Pill tone={document.status === 'accepted' ? 'emerald' : document.status === 'rejected' ? 'rose' : 'amber'}>{document.status}</Pill>
                      </div>
                      <p className="mt-2 text-slate-500">{document.request_date ?? '—'} → {document.due_date ?? '—'}</p>
                      {document.notes ? <p className="mt-2">{document.notes}</p> : null}
                      {document.file_name ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <span>{copy.uploaded}: {document.file_name}</span>
                          {document.signedUrl ? <a href={document.signedUrl} target="_blank" rel="noreferrer" className="font-medium text-slate-700 underline-offset-4 hover:underline">{copy.download}</a> : null}
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="text-sm text-slate-500">{copy.noDocs}</p>}
                </div>
                {canManageOpportunity ? (
                  <form action={addOpportunityDocument} className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                    <input type="hidden" name="opportunity_id" value={id} />
                    <div>
                      <label className="mb-1 block text-sm font-medium">{copy.addDoc}</label>
                      <select name="document_type_id" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required>
                        <option value="">—</option>
                        {(documentTypes ?? []).map((documentType: any) => <option key={documentType.id} value={documentType.id}>{documentType.name}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Request date</label>
                        <input name="request_date" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Due date</label>
                        <input name="due_date" type="date" className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Status</label>
                      <select name="status" defaultValue="requested" className="w-full rounded-xl border border-slate-200 px-3 py-2.5">
                        {['requested', 'in_progress', 'uploaded', 'sent', 'accepted', 'rejected'].map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{copy.uploadFile}</label>
                      <input name="file" type="file" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{copy.details}</label>
                      <textarea name="notes" rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" />
                    </div>
                    <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{copy.addDoc}</button>
                  </form>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privatePanelsNotice}</p>
            )}
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.stageHistory} />
            {canViewPrivatePanels ? (
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {(history ?? []).length > 0 ? history!.map((entry: any) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="font-medium">{entry.opportunity_stages?.name ?? '—'}</p>
                    <p>{entry.changed_at?.slice(0, 10) ?? '—'} · {Number(entry.to_probability ?? 0)}%</p>
                  </div>
                )) : <p className="text-slate-500">{copy.noHistory}</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privatePanelsNotice}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-1">
          {canManageOpportunity ? (
            <Card className="p-6">
              <SectionTitle title={copy.followUpControl} description={copy.followUpControlDescription} />
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="text-xs text-slate-500">{copy.currentFollowUpLabel}</p>
                <p className="mt-1 font-medium">{opportunity.next_action ?? '—'}</p>
                <p className="mt-1 text-slate-500">{opportunity.next_action_due_date ?? '—'}</p>
              </div>
              <form action={rescheduleOpportunityFollowUp} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={id} />
                <div>
                  <label className="mb-1 block text-sm font-medium">{copy.rescheduleDate}</label>
                  <input name="next_action_due_date" type="date" defaultValue={opportunity.next_action_due_date ?? ''} className="w-full rounded-xl border border-slate-200 px-3 py-2.5" required />
                </div>
                <button className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{copy.rescheduleFollowUp}</button>
              </form>
            </Card>
          ) : null}

          {canManageOpportunity ? (
            <Card className="p-6">
              <SectionTitle title={copy.addActivity} />
              <form action={addOpportunityActivity} className="mt-4 space-y-5">
                <input type="hidden" name="opportunity_id" value={id} />
                <input type="hidden" name="timezone" value="America/Mexico_City" />
                <div>
                  <label className={formLabelClass}>Tipo</label>
                  <select name="activity_type" className={formInputClass}>
                    <option value="meeting">meeting</option>
                    <option value="call">call</option>
                    <option value="email">email</option>
                    <option value="quote_sent">quote_sent</option>
                    <option value="internal_note">internal_note</option>
                  </select>
                </div>
                <div>
                  <label className={formLabelClass}>{copy.summary}</label>
                  <input name="summary" required placeholder={locale === 'es' ? 'Ej. Cliente pidió propuesta para evento de empresa' : 'E.g. Customer asked for proposal for company event'} className={formInputClass} />
                </div>
                <div>
                  <label className={formLabelClass}>{copy.details}</label>
                  <textarea name="details" rows={4} className={formTextareaClass} />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">{copy.currentFollowUpLabel}</p>
                  <p className="mt-1 text-xs text-slate-500">{copy.nextActionManagedNote}</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className={formLabelClass}>{copy.nextStep}</label>
                      <input name="next_step" className={formInputClass} />
                    </div>
                    <div className="max-w-sm">
                      <label className={formLabelClass}>{copy.nextStepDate}</label>
                      <input name="next_step_due_date" type="date" className={formInputClass} />
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <input id="calendar_event_enabled" type="checkbox" name="calendar_event_enabled" value="on" className="peer sr-only" />
                  <label htmlFor="calendar_event_enabled" className="flex cursor-pointer items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-white transition peer-checked:border-slate-900 peer-checked:bg-slate-900">
                      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-0 transition peer-checked:opacity-100" aria-hidden="true">
                        <path d="M3 8.5 6.25 11.5 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">{copy.calendarToggle}</span>
                      <span className="mt-1 block text-xs text-slate-500">{copy.calendarToggleHint}</span>
                    </span>
                  </label>
                  <div className="mt-4 hidden peer-checked:block">
                    <div className={schedulerPanelClass}>
                      <div>
                        <label className={formLabelClass}>{copy.calendarEventDate}</label>
                        <input name="scheduled_date" type="date" className={formInputClass} />
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="min-w-0">
                          <label className={formLabelClass}>{copy.startTime24}</label>
                          <input
                            name="scheduled_time"
                            type="text"
                            inputMode="numeric"
                            pattern="^((([01]\d|2[0-3]):[0-5]\d)|(\d{3,4}))$"
                            placeholder={copy.timePlaceholder}
                            className={formInputClass}
                          />
                        </div>
                        <div className="min-w-0">
                          <label className={formLabelClass}>{copy.endTime24}</label>
                          <input
                            name="scheduled_end_time"
                            type="text"
                            inputMode="numeric"
                            pattern="^((([01]\d|2[0-3]):[0-5]\d)|(\d{3,4}))$"
                            placeholder={copy.timePlaceholder}
                            className={formInputClass}
                          />
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className={formLabelClass}>{copy.locationOptional}</label>
                          <input name="location" className={formInputClass} />
                        </div>
                        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                          <p className="font-medium text-slate-700">{copy.timezone}</p>
                          <p className="mt-1">America/Mexico_City</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{copy.calendarHelp}</p>
                      <p className="mt-1 text-xs text-slate-500">{locale === 'es' ? 'Si activas esta opción, el sistema intentará enviar un email al responsable con un archivo .ics.' : 'If you enable this option, the system will try to email the owner with an .ics file.'}</p>
                    </div>
                  </div>
                </div>
                <button className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">{copy.addActivity}</button>
              </form>
              <Link href="/opportunities" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{t.common.back}</Link>
            </Card>
          ) : (
            <Link href="/opportunities" className="inline-flex rounded-xl border border-slate-200 px-4 py-2.5 text-sm hover:bg-slate-50">{t.common.back}</Link>
          )}

          <Card className="p-6">
            <SectionTitle title={copy.activityTimeline} />
            {canViewPrivatePanels ? (
              <div className="mt-4 space-y-3">
                {(activities ?? []).length > 0 ? activities!.map((activity: any) => (
                  <div key={activity.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{activity.summary}</p>
                      <Pill tone="amber">{activity.activity_type}</Pill>
                    </div>
                    <p className="mt-2 text-slate-500">{activity.activity_at?.slice(0, 10) ?? '—'}</p>
                    {activity.scheduled_date && activity.scheduled_time ? (
                      <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <p>
                          <span className="font-medium">{copy.scheduleStart}:</span>{' '}
                          {activity.scheduled_date} · {String(activity.scheduled_time).slice(0, 5)}
                          {activity.scheduled_end_time ? `–${String(activity.scheduled_end_time).slice(0, 5)}` : ''}
                        </p>
                        <p><span className="font-medium">{copy.timezone}:</span> {activity.timezone ?? 'America/Mexico_City'}</p>
                        {activity.location ? <p><span className="font-medium">{copy.location}:</span> {activity.location}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <a href={`/api/activities/${activity.id}/calendar`} className="font-medium text-slate-700 underline-offset-4 hover:underline">{copy.calendarDownload}</a>
                          <Pill tone={activity.notification_sent_at ? 'emerald' : 'amber'}>{activity.notification_sent_at ? copy.emailSent : copy.emailPending}</Pill>
                        </div>
                      </div>
                    ) : null}
                    {activity.details ? <p className="mt-2">{activity.details}</p> : null}
                    {activity.next_step ? <p className="mt-2 text-slate-500">→ {activity.next_step}</p> : null}
                  </div>
                )) : <p className="text-sm text-slate-500">{copy.noActivities}</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privatePanelsNotice}</p>
            )}
          </Card>

          <Card className="p-6">
            <SectionTitle title={copy.followUpTasks} />
            {canViewPrivatePanels ? (
              <div className="mt-4 space-y-3">
                {(tasks ?? []).length > 0 ? tasks!.map((task: any) => (
                  <div key={task.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{task.description}</p>
                      <Pill tone={task.status === 'completed' ? 'emerald' : task.status === 'overdue' ? 'rose' : 'amber'}>{task.status}</Pill>
                    </div>
                    <p className="mt-2 text-slate-500">{task.due_date ?? '—'}</p>
                  </div>
                )) : <p className="text-sm text-slate-500">{copy.noTasks}</p>}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">{copy.privatePanelsNotice}</p>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}
