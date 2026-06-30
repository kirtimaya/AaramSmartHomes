import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const { token } = body;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const { data: adminRequest, error: reqErr } = await supabaseAdmin
    .from('admin_requests')
    .select('id, email, status, token_expires_at')
    .eq('token', token)
    .eq('status', 'pending')
    .single();

  if (reqErr || !adminRequest) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }

  // Check token expiry (48-hour window)
  if (adminRequest.token_expires_at && new Date(adminRequest.token_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Token has expired. Please request a new approval link.' }, { status: 410 });
  }

  const { error: adminErr } = await supabaseAdmin.from('admins').insert([{
    email:    adminRequest.email,
    added_by: 'ROOT_LINK',
  }]);

  if (adminErr && adminErr.code !== '23505') {
    return NextResponse.json({ error: 'Failed to grant access' }, { status: 500 });
  }

  await supabaseAdmin
    .from('admin_requests')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('id', adminRequest.id);

  return NextResponse.json({ success: true });
}
