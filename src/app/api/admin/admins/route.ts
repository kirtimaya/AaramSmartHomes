import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';
import { ROOT_EMAIL } from '@/lib/constants';

async function requireRoot(req: NextRequest): Promise<string | NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const token = req.headers.get('authorization')?.slice(7) ?? '';
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user || user.email?.toLowerCase() !== ROOT_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Root access required' }, { status: 403 });
  }
  return user.id;
}

export async function GET(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;

  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id, email, created_at')
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;

  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }
  const normalised = email.trim().toLowerCase();
  if (normalised === ROOT_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: 'Root user cannot be added as admin' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('admins')
    .insert({ email: normalised })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireRoot(req);
  if (result instanceof NextResponse) return result;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabaseAdmin.from('admins').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
