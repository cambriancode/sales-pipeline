import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const status = (request.nextUrl.searchParams.get('status') ?? '').trim();

  const { data } = await supabase
    .from('tasks')
    .select('description, due_date, status, completed_at, opportunities(title)')
    .order('due_date', { ascending: true })
    .limit(500);

  const filtered = (data ?? []).filter((item: any) => {
    const matchesQuery = !query || [item.description, item.opportunities?.title]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchesStatus = !status || item.status === status;
    return matchesQuery && matchesStatus;
  });

  const csv = toCsv(
    ['Description', 'Opportunity', 'Status', 'Due Date', 'Completed At'],
    filtered.map((item: any) => [
      item.description,
      item.opportunities?.title ?? '',
      item.status,
      item.due_date ?? '',
      item.completed_at ?? '',
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tasks-export.csv"',
    },
  });
}
