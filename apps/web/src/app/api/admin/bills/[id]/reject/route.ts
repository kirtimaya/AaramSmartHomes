import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient: db, email: actorEmail, userId: actorId } = auth;

  const { id } = await params;
  const { reason } = await request.json();

  if (!reason) {
    return NextResponse.json({ error: 'rejection reason is required' }, { status: 400 });
  }

  const { data: before } = await db.from('electricity_bills').select('status, rejection_reason').eq('id', id).single();

  const { data, error } = await db
    .from('electricity_bills')
    .update({ status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'bill.reject',
    entityType: 'bill', entityId: id, before: before ?? null, after: data,
  });

  return NextResponse.json(data);
}
