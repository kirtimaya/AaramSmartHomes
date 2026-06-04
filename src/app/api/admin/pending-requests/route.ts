import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const rootEmail = process.env.ROOT_EMAIL ?? '';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.email?.toLowerCase().trim() ?? '';
  if (!rootEmail || email !== rootEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error: fetchErr } = await supabase
    .from('admin_requests')
    .select('id, email, created_at, status')
    .eq('status', 'pending');

  if (fetchErr) return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });

  return NextResponse.json({ requests: data ?? [] });
}
