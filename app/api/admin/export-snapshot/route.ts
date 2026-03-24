import { NextResponse } from 'next/server';
import { buildSnapshotArchive } from '@/lib/snapshot-export';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const snapshot = await buildSnapshotArchive({
      requestedBy: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
      },
    });

    const body = snapshot.buffer.buffer.slice(
      snapshot.buffer.byteOffset,
      snapshot.buffer.byteOffset + snapshot.buffer.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${snapshot.fileName}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'snapshot-export-failed' },
      { status: 500 },
    );
  }
}
