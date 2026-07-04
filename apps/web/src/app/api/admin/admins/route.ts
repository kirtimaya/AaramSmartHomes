import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin, makeAdminClient } from '@/lib/supabaseAdmin';
import { ROOT_EMAIL } from '@/lib/constants';
import { logAudit } from '@/lib/audit';

type RootResult = { userId: string; email: string; adminClient: ReturnType<typeof makeAdminClient> };

async function requireRoot(req: NextRequest): Promise<RootResult | NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const token = req.headers.get('authorization')?.slice(7) ?? '';
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user || user.email?.toLowerCase() !== ROOT_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Root access required' }, { status: 403 });
  }
  return { userId: user.id, email: user.email!, adminClient: auth.adminClient };
}

export async function GET(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;
  const { adminClient: db } = result;

  const { data, error } = await db
    .from('admins')
    .select('id, email, created_at')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;
  const { adminClient: db, email: actorEmail, userId: actorId } = result;

  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  const normalised = email.trim().toLowerCase();
  if (normalised === ROOT_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Root user cannot be added as admin' }, { status: 400 });
  }

  const { data, error } = await db
    .from('admins')
    .insert({ email: normalised })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'admin.add',
    entityType: 'admin', entityId: data.id, before: null, after: data,
  });

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;
  const { adminClient: db, email: actorEmail, userId: actorId } = result;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { data: before } = await db.from('admins').select().eq('id', id).single();

  const { error } = await db.from('admins').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAudit({
    actorId, actorEmail, actorRole: 'admin', action: 'admin.remove',
    entityType: 'admin', entityId: id, before: before ?? null, after: null,
  });

  return NextResponse.json({ ok: true });
}
