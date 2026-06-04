import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const rootEmail = process.env.ROOT_EMAIL ?? '';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  if (!token) {
    return NextResponse.json({ isAdmin: false, isRoot: false, hasPendingRequest: false });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ isAdmin: false, isRoot: false, hasPendingRequest: false });
  }

  const email = user.email?.toLowerCase().trim() ?? '';

  if (rootEmail && email === rootEmail) {
    return NextResponse.json({ isAdmin: true, isRoot: true, hasPendingRequest: false });
  }

  const [{ data: adminRow }, { data: pendingRequest }] = await Promise.all([
    supabase.from('admins').select('email').eq('email', email).single(),
    supabase.from('admin_requests').select('id').eq('email', email).eq('status', 'pending').single(),
  ]);

  return NextResponse.json({
    isAdmin: !!adminRow,
    isRoot: false,
    hasPendingRequest: !!pendingRequest,
  });
}
