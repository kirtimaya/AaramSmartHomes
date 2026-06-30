import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { ROOT_EMAIL } from './constants';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabaseAdmin] SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Admin DB operations will use user JWT via RLS policies instead of bypassing RLS. ' +
    'Add SUPABASE_SERVICE_ROLE_KEY to .env.local or Vercel env vars for full bypass.'
  );
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Returns a per-request Supabase client for admin DB operations.
 * - With SUPABASE_SERVICE_ROLE_KEY: returns the global supabaseAdmin (bypasses RLS entirely).
 * - Without it: returns a new client with the user's JWT so auth.email() is set and
 *   RLS policies using auth_is_admin() can grant access.
 */
export function makeAdminClient(userToken: string): SupabaseClient {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return supabaseAdmin;
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${userToken}` } } }
  );
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; email: string; adminClient: SupabaseClient } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const email = user.email?.toLowerCase().trim() ?? '';
  const adminClient = makeAdminClient(token);

  if (email === ROOT_EMAIL.toLowerCase()) {
    return { userId: user.id, email, adminClient };
  }

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('email', email)
    .single();

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return { userId: user.id, email, adminClient };
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
  // Use per-request client so the user's JWT is attached — required for RLS policies
  // (e.g. "tenant_read_own_profile" uses auth.uid()). When service role key is present,
  // makeAdminClient returns supabaseAdmin and bypasses RLS entirely.
  const db = makeAdminClient(token);

  const [{ data: adminRow }, { data: tenantRow }, { data: guestRow }] = await Promise.all([
    db.from('admins').select('id').eq('email', email).single(),
    db.from('tenants').select('id').eq('id', user.id).single(),
    db.from('guests').select('id').eq('id', user.id).single(),
  ]);

  if (adminRow) return { role: 'admin', userId: user.id, email };
  if (tenantRow) return { role: 'tenant', userId: user.id, email };
  if (guestRow) return { role: 'guest', userId: user.id, email };

  // Fallback: tenant may have been activated with a placeholder UUID before they
  // had an auth account — match by email so login still works.
  if (email) {
    const { data: tenantByEmail } = await db
      .from('tenants')
      .select('id')
      .eq('email', email)
      .in('status', ['active', 'notice'])
      .maybeSingle();
    if (tenantByEmail) return { role: 'tenant', userId: user.id, email };
  }

  return { role: null, userId: user.id, email };
}
