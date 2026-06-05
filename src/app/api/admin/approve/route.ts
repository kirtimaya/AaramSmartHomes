import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rootEmail = process.env.ROOT_EMAIL ?? '';

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callerEmail = user.email?.toLowerCase().trim() ?? '';
  if (!rootEmail || callerEmail !== rootEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { requestId?: unknown; requestEmail?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  const { requestId, requestEmail } = body;
  if (
    !requestId || !requestEmail ||
    typeof requestId !== 'string' ||
    typeof requestEmail !== 'string'
  ) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  const db = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey);

  const { error: adminErr } = await db.from('admins').insert([{
    email: requestEmail.toLowerCase().trim(),
    added_by: 'ROOT_DIRECT',
  }]);
  if (adminErr && adminErr.code !== '23505') {
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  await db.from('admin_requests').update({
    status: 'approved',
    approved_at: new Date().toISOString(),
    approved_by: callerEmail,
  }).eq('id', requestId);

  return NextResponse.json({ success: true });
}
