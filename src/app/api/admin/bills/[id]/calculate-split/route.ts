import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabaseAdmin';
import { runCalculateSplit } from '@/lib/billUtils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient } = auth;

  const { id } = await params;
  const result = await runCalculateSplit(id, adminClient);

  if (!result.success) {
    const status = result.error === 'Bill not found' ? 404
      : result.error?.includes('validated') ? 409
      : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    success: true,
    missing_submissions: result.missing_submissions ?? [],
  });
}
