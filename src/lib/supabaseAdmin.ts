import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ROOT_EMAIL } from './constants';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Admin API routes will fail. Add it to .env.local:\n' +
    'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // Service role key is required for server-side auth.getUser() and bypassing RLS.
  // Falls back to anon key so the app starts, but admin routes will return 401/403.
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.email?.toLowerCase().trim() ?? '';

  // Root user always has admin access
  if (email === ROOT_EMAIL.toLowerCase()) {
    return { userId: user.id, email };
  }

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('email', email)
    .single();

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return { userId: user.id, email };
}

export async function requireTenant(
  request: NextRequest
): Promise<{ userId: string; email: string; roomId: string | null } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, room_id')
    .eq('id', user.id)
    .single();

  return { userId: user.id, email: user.email!, roomId: tenant?.room_id ?? null };
}

export async function requireGuest(
  request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return { userId: user.id, email: user.email! };
}

/** Returns the authenticated user's role: 'admin' | 'tenant' | 'guest' | null */
export async function getUserRole(token: string): Promise<{
  role: 'admin' | 'tenant' | 'guest' | null;
  userId: string | null;
  email: string | null;
}> {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { role: null, userId: null, email: null };

  const email = user.email?.toLowerCase().trim() ?? '';

  // Root admin
  if (email === ROOT_EMAIL.toLowerCase()) {
    return { role: 'admin', userId: user.id, email };
  }

  // Check admins table
  const [{ data: adminRow }, { data: tenantRow }, { data: guestRow }] = await Promise.all([
    supabaseAdmin.from('admins').select('id').eq('email', email).single(),
    supabaseAdmin.from('tenants').select('id').eq('id', user.id).single(),
    supabaseAdmin.from('guests').select('id').eq('id', user.id).single(),
  ]);

  if (adminRow) return { role: 'admin', userId: user.id, email };
  if (tenantRow) return { role: 'tenant', userId: user.id, email };
  if (guestRow) return { role: 'guest', userId: user.id, email };

  return { role: null, userId: user.id, email };
}
