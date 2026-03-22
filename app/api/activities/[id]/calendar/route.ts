import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildActivityIcs } from '@/lib/calendar';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: activity } = await supabase
    .from('activities')
    .select(`
      id,
      summary,
      details,
      location,
      timezone,
      calendar_uid,
      scheduled_date,
      scheduled_time,
      scheduled_end_date,
      scheduled_end_time,
      opportunities(title, accounts(name))
    `)
    .eq('id', id)
    .maybeSingle();

  if (
    !activity
    || !activity.scheduled_date
    || !activity.scheduled_time
    || !activity.scheduled_end_date
    || !activity.scheduled_end_time
    || !activity.timezone
    || !activity.calendar_uid
  ) {
    return new NextResponse('Not found', { status: 404 });
  }

  function relationName(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value[0] as { name?: string } | undefined;
      return first?.name ?? '—';
    }

    const obj = value as { name?: string } | null | undefined;
    return obj?.name ?? '—';
  }

  function relationTitle(value: unknown): string {
    if (Array.isArray(value)) {
      const first = value[0] as { title?: string; accounts?: unknown } | undefined;
      return first?.title ?? '—';
    }

    const obj = value as { title?: string; accounts?: unknown } | null | undefined;
    return obj?.title ?? '—';
  }

  const opportunityTitle = relationTitle((activity as any).opportunities);
  const accountName = relationName(Array.isArray((activity as any).opportunities)
    ? (activity as any).opportunities[0]?.accounts
    : (activity as any).opportunities?.accounts);

  const ics = buildActivityIcs({
    uid: activity.calendar_uid,
    summary: activity.summary,
    description: [activity.details, `Opportunity: ${opportunityTitle}`, `Account: ${accountName}`].filter(Boolean).join('\n'),
    location: activity.location,
    timezone: activity.timezone,
    startDate: activity.scheduled_date,
    startTime: activity.scheduled_time,
    endDate: activity.scheduled_end_date,
    endTime: activity.scheduled_end_time,
  });

  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="activity-${id}.ics"`,
      'cache-control': 'private, no-store',
    },
  });
}
