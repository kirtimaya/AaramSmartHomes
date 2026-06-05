import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ROOT_EMAIL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login', requestUrl.origin));
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !session?.user) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
  }

  const user = session.user;
  const email = user.email?.toLowerCase().trim() ?? '';

  // Role-based routing: admins → /admin, tenants → /tenant, guests → /guest
  // Use service-role client for table lookups
  const { createClient: createServiceClient } = await import('@supabase/supabase-js');
  const adminClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Root or admin table
  if (email === ROOT_EMAIL.toLowerCase()) {
    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
  }

  const { data: adminRow } = await adminClient
    .from('admins')
    .select('id')
    .eq('email', email)
    .single();

  if (adminRow) {
    return NextResponse.redirect(new URL('/admin', requestUrl.origin));
  }

  // 2. Active/notice tenant
  const { data: tenantRow } = await adminClient
    .from('tenants')
    .select('id, status')
    .eq('id', user.id)
    .in('status', ['active', 'notice'])
    .single();

  if (tenantRow) {
    return NextResponse.redirect(new URL('/tenant', requestUrl.origin));
  }

  // 3. Known guest — update last_login_at
  const { data: guestRow } = await adminClient
    .from('guests')
    .select('id')
    .eq('id', user.id)
    .single();

  if (guestRow) {
    await adminClient
      .from('guests')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);
    return NextResponse.redirect(new URL('/guest', requestUrl.origin));
  }

  // 4. New user — create guest record
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    email.split('@')[0];

  await adminClient.from('guests').insert({
    id:    user.id,
    name:  displayName,
    email: user.email!,
    phone: user.phone ?? null,
  });

  return NextResponse.redirect(new URL('/guest', requestUrl.origin));
}
