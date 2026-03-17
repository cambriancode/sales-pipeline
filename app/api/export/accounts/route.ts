import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toCsv } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const query = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const type = (request.nextUrl.searchParams.get('type') ?? '').trim();

  const { data } = await supabase
    .from('accounts')
    .select('name, billing_city, billing_state, billing_country, account_types(name)')
    .order('name')
    .limit(500);

  const filtered = (data ?? []).filter((item: any) => {
    const matchesQuery = !query || [item.name, item.billing_city, item.billing_country, item.account_types?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
    const matchesType = !type || item.account_types?.name === type;
    return matchesQuery && matchesType;
  });

  const csv = toCsv(
    ['Name', 'Type', 'City', 'State', 'Country'],
    filtered.map((item: any) => [
      item.name,
      item.account_types?.name ?? '',
      item.billing_city ?? '',
      item.billing_state ?? '',
      item.billing_country ?? '',
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="accounts-export.csv"',
    },
  });
}
