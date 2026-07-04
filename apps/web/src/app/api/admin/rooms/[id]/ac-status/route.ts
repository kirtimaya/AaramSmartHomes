import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';
import { logAudit } from '@/lib/audit';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { email: actorEmail, userId: actorId } = auth;

  const { id } = await params;
  const { has_ac } = await request.json();

  if (typeof has_ac !== 'boolean') {
    return NextResponse.json({ error: 'has_ac must be boolean' }, { status: 400 });
  }

  const { data: before } = await supabaseAdmin.from('rooms').select('has_ac').eq('id', id).single();

  const { data, error } = await supabaseAdmin
    .from('rooms')
    .update({ has_ac })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'room.ac_status_update',
    entityType: 'room', entityId: id,
    before: before ?? null, after: { has_ac },
  });

  return NextResponse.json(data);
}
