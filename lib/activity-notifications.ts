import { buildActivityIcs } from '@/lib/calendar';
import { sendMail } from '@/lib/mailer';

function formatSchedule(date: string, time: string, locale: 'es' | 'en') {
  const languageTag = locale === 'es' ? 'es-MX' : 'en-US';
  const maybeDate = new Date(`${date}T${time}`);
  return Number.isNaN(maybeDate.getTime())
    ? `${date} ${time}`
    : maybeDate.toLocaleString(languageTag, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
}

export async function sendScheduledActivityNotification(args: {
  locale: 'es' | 'en';
  to: string;
  managerName: string;
  opportunityTitle: string;
  accountName: string;
  activitySummary: string;
  activityDetails?: string | null;
  location?: string | null;
  timezone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  uid: string;
}) {
  const {
    locale,
    to,
    managerName,
    opportunityTitle,
    accountName,
    activitySummary,
    activityDetails,
    location,
    timezone,
    startDate,
    startTime,
    endDate,
    endTime,
    uid,
  } = args;

  const subject = locale === 'es'
    ? `Actividad programada: ${activitySummary}`
    : `Scheduled activity: ${activitySummary}`;

  const startLabel = formatSchedule(startDate, startTime, locale);
  const endLabel = formatSchedule(endDate, endTime, locale);

  const text = locale === 'es'
    ? [
        `Hola ${managerName},`,
        '',
        `Se programó una actividad para la oportunidad "${opportunityTitle}" de la cuenta "${accountName}".`,
        `Actividad: ${activitySummary}`,
        `Inicio: ${startLabel}`,
        `Fin: ${endLabel}`,
        `Zona horaria: ${timezone}`,
        location ? `Ubicación: ${location}` : null,
        activityDetails ? `Detalle: ${activityDetails}` : null,
        '',
        'Adjuntamos un archivo .ics para agregarlo a tu calendario.',
      ].filter(Boolean).join('\n')
    : [
        `Hello ${managerName},`,
        '',
        `A new activity was scheduled for opportunity "${opportunityTitle}" on account "${accountName}".`,
        `Activity: ${activitySummary}`,
        `Start: ${startLabel}`,
        `End: ${endLabel}`,
        `Time zone: ${timezone}`,
        location ? `Location: ${location}` : null,
        activityDetails ? `Details: ${activityDetails}` : null,
        '',
        'An .ics file is attached so you can add it to your calendar.',
      ].filter(Boolean).join('\n');

  const html = locale === 'es'
    ? `<p>Hola ${managerName},</p><p>Se programó una actividad para la oportunidad <strong>${opportunityTitle}</strong> de la cuenta <strong>${accountName}</strong>.</p><ul><li><strong>Actividad:</strong> ${activitySummary}</li><li><strong>Inicio:</strong> ${startLabel}</li><li><strong>Fin:</strong> ${endLabel}</li><li><strong>Zona horaria:</strong> ${timezone}</li>${location ? `<li><strong>Ubicación:</strong> ${location}</li>` : ''}${activityDetails ? `<li><strong>Detalle:</strong> ${activityDetails}</li>` : ''}</ul><p>Adjuntamos un archivo .ics para agregarlo a tu calendario.</p>`
    : `<p>Hello ${managerName},</p><p>A new activity was scheduled for opportunity <strong>${opportunityTitle}</strong> on account <strong>${accountName}</strong>.</p><ul><li><strong>Activity:</strong> ${activitySummary}</li><li><strong>Start:</strong> ${startLabel}</li><li><strong>End:</strong> ${endLabel}</li><li><strong>Time zone:</strong> ${timezone}</li>${location ? `<li><strong>Location:</strong> ${location}</li>` : ''}${activityDetails ? `<li><strong>Details:</strong> ${activityDetails}</li>` : ''}</ul><p>An .ics file is attached so you can add it to your calendar.</p>`;

  const ics = buildActivityIcs({
    uid,
    summary: activitySummary,
    description: [activityDetails, `Opportunity: ${opportunityTitle}`, `Account: ${accountName}`].filter(Boolean).join('\n'),
    location,
    timezone,
    startDate,
    startTime,
    endDate,
    endTime,
    organizerEmail: to,
  });

  return sendMail({
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename: 'activity.ics',
        content: ics,
        contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
      },
    ],
  });
}
