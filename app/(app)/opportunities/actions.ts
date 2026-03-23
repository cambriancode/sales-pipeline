"use server";

import { revalidatePath } from 'next/cache';
import type { Route } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { closeOpenTasksForOpportunity, syncOpportunityFollowUpTask } from '@/lib/task-sync';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildOpportunityDocumentPath, ensureOpportunityDocumentBucket } from '@/lib/document-storage';
import { sendScheduledActivityNotification } from '@/lib/activity-notifications';

function withMessage(path: string, key: 'success' | 'error', message: string): string {
  const params = new URLSearchParams({ [key]: message });
  return `${path}?${params.toString()}`;
}


function normalizeTime24h(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

export async function createOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();

  const stageId = String(formData.get('stage_id') ?? '').trim();
  const { data: stage } = await supabase
    .from('opportunity_stages')
    .select('id, default_probability')
    .eq('id', stageId)
    .single();

  const payload = {
    account_id: String(formData.get('account_id') ?? '').trim(),
    owner_user_id: profile.id,
    created_by_user_id: profile.id,
    title: String(formData.get('title') ?? '').trim(),
    opportunity_type_id: String(formData.get('opportunity_type_id') ?? '').trim(),
    status: 'open' as const,
    stage_id: stageId,
    probability: Number(stage?.default_probability ?? 5),
    expected_close_date: String(formData.get('expected_close_date') ?? '').trim() || null,
    annual_value_estimate: Number(formData.get('annual_value_estimate') ?? 0) || 0,
    first_value_estimate: Number(formData.get('first_value_estimate') ?? 0) || 0,
    next_action: String(formData.get('next_action') ?? '').trim(),
    next_action_due_date: String(formData.get('next_action_due_date') ?? '').trim(),
    need_summary: String(formData.get('need_summary') ?? '').trim() || null,
  };

  if (!payload.title || !payload.account_id || !payload.opportunity_type_id || !payload.stage_id) {
    throw new Error('Missing required fields');
  }

  const { data, error } = await supabase.from('opportunities').insert(payload).select('id, account_id').single();
  if (error) throw new Error(error.message);

  const customerContactName = String(formData.get('customer_contact_full_name') ?? '').trim();
  const customerContactRole = String(formData.get('customer_contact_job_title') ?? '').trim() || null;
  const customerContactEmail = String(formData.get('customer_contact_email') ?? '').trim() || null;
  const customerContactPhone = String(formData.get('customer_contact_phone') ?? '').trim() || null;

  if (customerContactName) {
    let contactId: string | null = null;

    if (customerContactEmail) {
      const { data: existingByEmail } = await supabase
        .from('contacts')
        .select('id')
        .eq('account_id', data.account_id)
        .eq('email', customerContactEmail)
        .limit(1)
        .maybeSingle();

      contactId = existingByEmail?.id ?? null;
    }

    if (!contactId) {
      const { data: existingByName } = await supabase
        .from('contacts')
        .select('id')
        .eq('account_id', data.account_id)
        .eq('full_name', customerContactName)
        .limit(1)
        .maybeSingle();

      contactId = existingByName?.id ?? null;
    }

    if (!contactId) {
      const { data: insertedContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          account_id: data.account_id,
          full_name: customerContactName,
          job_title: customerContactRole,
          email: customerContactEmail,
          phone: customerContactPhone,
          is_decision_maker: true,
          created_by_user_id: profile.id,
        })
        .select('id')
        .single();

      if (contactError) throw new Error(contactError.message);
      contactId = insertedContact.id;
    }

    if (contactId) {
      const { error: linkError } = await supabase
        .from('opportunity_contacts')
        .upsert({
          opportunity_id: data.id,
          contact_id: contactId,
          relationship_role: customerContactRole ?? 'customer_owner',
          is_primary: true,
        }, { onConflict: 'opportunity_id,contact_id' });

      if (linkError) throw new Error(linkError.message);
    }
  }

  await syncOpportunityFollowUpTask({
    supabase,
    opportunityId: data.id,
    ownerUserId: profile.id,
    description: payload.next_action,
    dueDate: payload.next_action_due_date,
  });

  revalidatePath('/dashboard');
  revalidatePath('/opportunities');
  revalidatePath('/tasks');
  revalidatePath(`/accounts/${data.account_id}` as Route);
  redirect(`/opportunities/${data.id}` as Route);
}

export async function updateOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const detailPath = `/opportunities/${id}` as Route;
  const stageId = String(formData.get('stage_id') ?? '').trim();

  if (!id || !stageId) {
    redirect(withMessage(detailPath, 'error', 'Missing required fields') as Route);
  }

  const { data: stage } = await supabase
    .from('opportunity_stages')
    .select('default_probability, sort_order')
    .eq('id', stageId)
    .single();

  const requiresProducts = Number(stage?.sort_order ?? 0) >= 4;
  if (requiresProducts) {
    const { count } = await supabase
      .from('opportunity_products')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', id);

    if ((count ?? 0) < 1) {
      redirect(withMessage(detailPath, 'error', 'From stage 4 onward, at least one product or service must be linked') as Route);
    }
  }

  const payload = {
    title: String(formData.get('title') ?? '').trim(),
    stage_id: stageId,
    probability: Number(stage?.default_probability ?? formData.get('probability') ?? 5),
    annual_value_estimate: Number(formData.get('annual_value_estimate') ?? 0) || 0,
    first_value_estimate: Number(formData.get('first_value_estimate') ?? 0) || 0,
    expected_close_date: String(formData.get('expected_close_date') ?? '').trim() || null,
    need_summary: String(formData.get('need_summary') ?? '').trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('opportunities').update(payload).eq('id', id);
  if (error) {
    redirect(withMessage(detailPath, 'error', error.message) as Route);
  }

  revalidatePath('/dashboard');
  revalidatePath('/opportunities');
  revalidatePath('/tasks');
  revalidatePath(detailPath);
  redirect(withMessage(detailPath, 'success', 'Opportunity updated') as Route);
}

export async function addOpportunityProduct(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const opportunityId = String(formData.get('opportunity_id') ?? '').trim();
  const detailPath = `/opportunities/${opportunityId}` as Route;
  const productId = String(formData.get('product_id') ?? '').trim() || null;
  const customName = String(formData.get('custom_item_name') ?? '').trim() || null;
  const quantity = Number(formData.get('quantity_estimate') ?? 0) || 0;
  const unitPrice = Number(formData.get('unit_price_estimate') ?? 0) || 0;

  const payload = {
    opportunity_id: opportunityId,
    product_id: productId,
    custom_item_name: customName,
    quantity_estimate: quantity,
    unit_price_estimate: unitPrice,
    line_total_estimate: quantity * unitPrice,
    notes: String(formData.get('notes') ?? '').trim() || null,
  };

  if (!payload.opportunity_id || (!payload.product_id && !payload.custom_item_name)) {
    redirect(withMessage(detailPath, 'error', 'A product or custom item is required') as Route);
  }

  const { error } = await supabase.from('opportunity_products').insert(payload);
  if (error) {
    redirect(withMessage(detailPath, 'error', error.message) as Route);
  }

  revalidatePath(detailPath);
  revalidatePath('/reports');
  redirect(withMessage(detailPath, 'success', 'Product or service linked') as Route);
}

export async function addOpportunityActivity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const opportunityId = String(formData.get('opportunity_id') ?? '').trim();
  const detailPath = `/opportunities/${opportunityId}` as Route;
  const summary = String(formData.get('summary') ?? '').trim() || String(formData.get('details') ?? '').trim();
  const nextStep = String(formData.get('next_step') ?? '').trim() || null;
  const nextStepDueDate = String(formData.get('next_step_due_date') ?? '').trim() || null;
  const calendarEventEnabled = String(formData.get('calendar_event_enabled') ?? '').trim() === 'on';
  const scheduledDate = calendarEventEnabled ? (String(formData.get('scheduled_date') ?? '').trim() || null) : null;
  const scheduledTimeInput = calendarEventEnabled ? (String(formData.get('scheduled_time') ?? '').trim() || null) : null;
  const scheduledEndTimeInput = calendarEventEnabled ? (String(formData.get('scheduled_end_time') ?? '').trim() || null) : null;
  const scheduledTime = calendarEventEnabled ? normalizeTime24h(scheduledTimeInput) : null;
  const scheduledEndTime = calendarEventEnabled ? normalizeTime24h(scheduledEndTimeInput) : null;
  const timezone = calendarEventEnabled ? (String(formData.get('timezone') ?? '').trim() || 'America/Mexico_City') : null;
  const location = calendarEventEnabled ? (String(formData.get('location') ?? '').trim() || null) : null;
  const scheduledEndDate = calendarEventEnabled ? scheduledDate : null;

  if ((nextStep && !nextStepDueDate) || (!nextStep && nextStepDueDate)) {
    redirect(withMessage(detailPath, 'error', 'Next step and due date must be captured together') as Route);
  }

  if (calendarEventEnabled && (!scheduledDate || !scheduledTimeInput || !scheduledEndTimeInput)) {
    redirect(withMessage(detailPath, 'error', 'Calendar events require one date plus start and end time') as Route);
  }

  if (calendarEventEnabled && (!scheduledTime || !scheduledEndTime)) {
    redirect(withMessage(detailPath, 'error', 'Use 24-hour time in HH:MM format') as Route);
  }

  if (calendarEventEnabled && scheduledTime && scheduledEndTime && scheduledEndTime <= scheduledTime) {
    redirect(withMessage(detailPath, 'error', 'End time must be later than start time') as Route);
  }

  const payload = {
    opportunity_id: opportunityId,
    created_by_user_id: profile.id,
    activity_type: String(formData.get('activity_type') ?? 'internal_note').trim() || 'internal_note',
    summary,
    details: String(formData.get('details') ?? '').trim() || null,
    next_step: nextStep,
    scheduled_date: scheduledDate,
    scheduled_time: scheduledTime,
    scheduled_end_date: scheduledEndDate,
    scheduled_end_time: scheduledEndTime,
    timezone,
    location,
  };

  if (!payload.opportunity_id || !payload.summary) {
    redirect(withMessage(detailPath, 'error', 'Activity summary is required') as Route);
  }

  const { data: inserted, error } = await supabase
    .from('activities')
    .insert(payload)
    .select('id, calendar_uid')
    .single();
  if (error || !inserted) {
    redirect(withMessage(detailPath, 'error', error?.message ?? 'Could not create activity') as Route);
  }

  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('title, owner_user_id, accounts(name), profiles!opportunities_owner_user_id_fkey(id, full_name, email, preferred_language)')
    .eq('id', opportunityId)
    .maybeSingle();

  const ownerProfile = Array.isArray((opportunity as any)?.profiles)
    ? (opportunity as any)?.profiles?.[0]
    : (opportunity as any)?.profiles;

  if (nextStep && nextStepDueDate) {
    const ownerUserId = ownerProfile?.id ?? (opportunity as any)?.owner_user_id ?? profile.id;

    const { error: followUpError } = await supabase
      .from('opportunities')
      .update({
        next_action: nextStep,
        next_action_due_date: nextStepDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', opportunityId);

    if (followUpError) {
      redirect(withMessage(detailPath, 'error', followUpError.message) as Route);
    }

    await syncOpportunityFollowUpTask({
      supabase,
      opportunityId,
      ownerUserId,
      description: nextStep,
      dueDate: nextStepDueDate,
    });
  }

  let successMessage = 'Activity added';

  if (
    calendarEventEnabled
    && inserted.calendar_uid
    && scheduledDate
    && scheduledTime
    && scheduledEndDate
    && scheduledEndTime
    && ownerProfile?.email
  ) {
    const accountName = Array.isArray((opportunity as any)?.accounts)
      ? (opportunity as any)?.accounts?.[0]?.name ?? '—'
      : (opportunity as any)?.accounts?.name ?? '—';

    const mailResult = await sendScheduledActivityNotification({
      locale: ownerProfile?.preferred_language === 'en' ? 'en' : 'es',
      to: ownerProfile.email,
      managerName: ownerProfile?.full_name ?? profile.full_name,
      opportunityTitle: (opportunity as any)?.title ?? summary,
      accountName,
      activitySummary: summary,
      activityDetails: payload.details,
      location,
      timezone: payload.timezone ?? 'America/Mexico_City',
      startDate: scheduledDate,
      startTime: scheduledTime,
      endDate: scheduledEndDate,
      endTime: scheduledEndTime,
      uid: inserted.calendar_uid,
    });

    if (mailResult.delivered) {
      await supabase
        .from('activities')
        .update({ notification_sent_at: new Date().toISOString() })
        .eq('id', inserted.id);
      successMessage = 'Activity added and emailed';
    } else {
      successMessage = 'Activity added. SMTP not configured in the app runtime yet';
    }
  }

  revalidatePath(detailPath);
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  redirect(withMessage(detailPath, 'success', successMessage) as Route);
}

export async function rescheduleOpportunityFollowUp(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const id = String(formData.get('id') ?? '').trim();
  const detailPath = `/opportunities/${id}` as Route;
  const dueDate = String(formData.get('next_action_due_date') ?? '').trim();

  if (!id || !dueDate) {
    redirect(withMessage(detailPath, 'error', 'A new follow-up date is required') as Route);
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from('opportunities')
    .select('id, next_action, owner_user_id, status')
    .eq('id', id)
    .maybeSingle();

  if (opportunityError || !opportunity) {
    redirect(withMessage(detailPath, 'error', opportunityError?.message ?? 'Opportunity not found') as Route);
  }

  if (opportunity.status !== 'open') {
    redirect(withMessage(detailPath, 'error', 'Only open opportunities can be rescheduled') as Route);
  }

  if (!opportunity.next_action) {
    redirect(withMessage(detailPath, 'error', 'This opportunity has no current next action to reschedule') as Route);
  }

  const { error } = await supabase
    .from('opportunities')
    .update({
      next_action_due_date: dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    redirect(withMessage(detailPath, 'error', error.message) as Route);
  }

  await syncOpportunityFollowUpTask({
    supabase,
    opportunityId: id,
    ownerUserId: opportunity.owner_user_id,
    description: opportunity.next_action,
    dueDate,
  });

  revalidatePath('/dashboard');
  revalidatePath('/opportunities');
  revalidatePath('/tasks');
  revalidatePath(detailPath);
  redirect(withMessage(detailPath, 'success', 'Follow-up rescheduled') as Route);
}

export async function addOpportunityDocument(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const opportunityId = String(formData.get('opportunity_id') ?? '').trim();
  const detailPath = `/opportunities/${opportunityId}` as Route;
  const uploadedFile = formData.get('file');

  const payload = {
    opportunity_id: opportunityId,
    document_type_id: String(formData.get('document_type_id') ?? '').trim(),
    requested_by_user_id: profile.id,
    owner_user_id: profile.id,
    request_date: String(formData.get('request_date') ?? '').trim() || null,
    due_date: String(formData.get('due_date') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'requested').trim() || 'requested',
    notes: String(formData.get('notes') ?? '').trim() || null,
  };

  if (!payload.opportunity_id || !payload.document_type_id) {
    redirect(withMessage(detailPath, 'error', 'Document type is required') as Route);
  }

  const { data: inserted, error } = await supabase
    .from('documents')
    .insert(payload)
    .select('id')
    .single();

  if (error || !inserted?.id) {
    redirect(withMessage(detailPath, 'error', error?.message ?? 'Could not create document record') as Route);
  }

  if (uploadedFile instanceof File && uploadedFile.size > 0) {
    try {
      await ensureOpportunityDocumentBucket();
      const admin = createAdminClient();
      const filePath = buildOpportunityDocumentPath({
        opportunityId,
        documentId: inserted.id,
        fileName: uploadedFile.name,
      });

      const arrayBuffer = await uploadedFile.arrayBuffer();
      const { error: uploadError } = await admin.storage
        .from('opportunity-documents')
        .upload(filePath, Buffer.from(arrayBuffer), {
          contentType: uploadedFile.type || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update({
          file_path: filePath,
          file_name: uploadedFile.name,
          file_size_bytes: uploadedFile.size,
          mime_type: uploadedFile.type || null,
          uploaded_at: new Date().toISOString(),
          status: payload.status === 'requested' ? 'uploaded' : payload.status,
        })
        .eq('id', inserted.id);

      if (updateError) {
        throw updateError;
      }
    } catch (uploadErr) {
      const message = uploadErr instanceof Error ? uploadErr.message : 'Document upload failed';
      redirect(withMessage(detailPath, 'error', message) as Route);
    }
  }

  revalidatePath(detailPath);
  revalidatePath('/reports');
  redirect(withMessage(detailPath, 'success', uploadedFile instanceof File && uploadedFile.size > 0 ? 'Document uploaded' : 'Document tracked') as Route);
}

export async function closeOpportunity(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createClient();
  const opportunityId = String(formData.get('id') ?? '').trim();
  const detailPath = `/opportunities/${opportunityId}` as Route;
  const status = String(formData.get('status') ?? '').trim() as 'won' | 'lost' | 'on_hold';
  const closeValue = Number(formData.get('close_value') ?? 0) || 0;

  const payload: Record<string, unknown> = {
    status,
    close_date: String(formData.get('close_date') ?? '').trim() || null,
    close_value: closeValue || null,
    won_proof_type: null,
    lost_reason_id: null,
    on_hold_until: null,
    next_action: null,
    next_action_due_date: null,
    updated_at: new Date().toISOString(),
  };

  if (status === 'won') {
    payload.won_proof_type = String(formData.get('won_proof_type') ?? '').trim();
    const { data: wonStage } = await supabase.from('opportunity_stages').select('id, default_probability').eq('code', 'won').maybeSingle();
    if (wonStage?.id) {
      payload.stage_id = wonStage.id;
      payload.probability = Number(wonStage.default_probability ?? 100);
    }
  }

  if (status === 'lost') {
    payload.lost_reason_id = String(formData.get('lost_reason_id') ?? '').trim() || null;
    payload.probability = 0;
  }

  if (status === 'on_hold') {
    payload.on_hold_until = String(formData.get('on_hold_until') ?? '').trim() || null;
    payload.probability = Number(formData.get('current_probability') ?? 0) || 0;
  }

  const { error } = await supabase.from('opportunities').update(payload).eq('id', opportunityId);
  if (error) {
    redirect(withMessage(detailPath, 'error', error.message) as Route);
  }

  await closeOpenTasksForOpportunity({ supabase, opportunityId });

  revalidatePath('/dashboard');
  revalidatePath('/opportunities');
  revalidatePath('/reports');
  revalidatePath('/dashboard');
  revalidatePath('/tasks');
  revalidatePath(detailPath);
  redirect(withMessage(detailPath, 'success', `Opportunity marked as ${status}`) as Route);
}