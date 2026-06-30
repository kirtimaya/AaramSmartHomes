import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ROOT_EMAIL } from '@/lib/constants';

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.slice(7);
  if (!token) {
    return NextResponse.json({ isAdmin: false, isRoot: false, hasPendingRequest: false });
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ isAdmin: false, isRoot: false, hasPendingRequest: false });
  }

  const email = user.email?.toLowerCase().trim() ?? '';

  if (email === ROOT_EMAIL.toLowerCase()) {
    return NextResponse.json({ isAdmin: true, isRoot: true, hasPendingRequest: false });
  }

  const [{ data: adminRow }, { data: pendingRequest }] = await Promise.all([
    supabaseAdmin.from('admins').select('email').eq('email', email).single(),
    supabaseAdmin.from('admin_requests').select('id').eq('email', email).eq('status', 'pending').single(),
  ]);

  return NextResponse.json({
    isAdmin: !!adminRow,
    isRoot: false,
    hasPendingRequest: !!pendingRequest,
  });
}
