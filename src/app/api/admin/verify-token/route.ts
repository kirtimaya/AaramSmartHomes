import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const db = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey);

  const { data: request, error: reqErr } = await db
    .from('admin_requests')
    .select('id, email, status')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  const { error: adminErr } = await db.from('admins').insert([{
    email: request.email,
    added_by: 'ROOT_LINK',
  }]);
  if (adminErr && adminErr.code !== '23505') {
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  await db.from('admin_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', request.id);

  return NextResponse.json({ success: true });
}
