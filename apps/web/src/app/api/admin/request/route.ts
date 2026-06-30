import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error: authErr } = await authClient.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.email?.toLowerCase().trim() ?? '';
  const db = createClient(supabaseUrl, serviceRoleKey ?? supabaseAnonKey);

  const { data: existing } = await db
    .from('admin_requests')
    .select('id')
    .eq('email', email)
    .eq('status', 'pending')
    .single();

  if (existing) return NextResponse.json({ success: true, alreadyPending: true });

  const verifyToken = crypto.randomUUID();
  const { error } = await db.from('admin_requests').insert([{
    email,
    token: verifyToken,
    status: 'pending',
  }]);

  if (error && error.code !== '23505') {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
