import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const stage = (request.nextUrl.searchParams.get('stage') ?? '').trim();
  const status = (request.nextUrl.searchParams.get('status') ?? '').trim();

  const { data } = await supabase
    .from('opportunities')
    .select(`
      title,
      status,
      probability,
      annual_value_estimate,
      weighted_value,
      expected_close_date,
      next_action,
      next_action_due_date,
      accounts(name),
      opportunity_stages(name)
    `)
    .order('created_at', { ascending: false })
    .limit(500);

  const filtered = (data ?? []).filter((item: any) => {
    const matchesQuery = !query || [item.title, item.accounts?.name, item.next_action, item.opportunity_stages?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchesStage = !stage || item.opportunity_stages?.name === stage;
    const matchesStatus = !status || item.status === status;
    return matchesQuery && matchesStage && matchesStatus;
  });

  const csv = toCsv(
    ['Title', 'Account', 'Status', 'Stage', 'Probability', 'Annual Value', 'Weighted Value', 'Expected Close', 'Next Action', 'Next Action Due'],
    filtered.map((item: any) => [
      item.title,
      item.accounts?.name ?? '',
      item.status,
      item.opportunity_stages?.name ?? '',
      item.probability,
      item.annual_value_estimate,
      item.weighted_value,
      item.expected_close_date ?? '',
      item.next_action ?? '',
      item.next_action_due_date ?? '',
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="opportunities-export.csv"',
    },
  });
}
