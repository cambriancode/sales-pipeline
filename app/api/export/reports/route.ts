import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const owner = (request.nextUrl.searchParams.get('owner') ?? '').trim();
  const scope = (request.nextUrl.searchParams.get('scope') ?? 'all').trim();

  const { data } = await supabase
    .from('opportunities')
    .select('title, status, probability, annual_value_estimate, weighted_value, close_value, owner_user_id, profiles!opportunities_owner_user_id_fkey(full_name), opportunity_stages(name)')
    .order('created_at', { ascending: false })
    .limit(500);

  const filtered = (data ?? []).filter((item: any) => {
    const matchesOwner = !owner || item.owner_user_id === owner;
    const matchesScope = scope === 'all' || (scope === 'open' ? item.status === 'open' : item.status !== 'open');
    return matchesOwner && matchesScope;
  });

  const csv = toCsv(
    ['Title', 'Owner', 'Status', 'Stage', 'Probability', 'Annual Value', 'Weighted Value', 'Close Value'],
    filtered.map((item: any) => [
      item.title,
      item.profiles?.full_name ?? '',
      item.status,
      item.opportunity_stages?.name ?? '',
      item.probability,
      item.annual_value_estimate,
      item.weighted_value,
      item.close_value ?? '',
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reports-export.csv"',
    },
  });
}
