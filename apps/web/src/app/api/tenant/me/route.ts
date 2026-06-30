import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Primary: match by auth UID
  const { data: byId } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', user.id)
    .in('status', ['active', 'notice'])
    .maybeSingle();

  if (byId) return NextResponse.json(byId);

  // Fallback: tenant activated with placeholder UUID — match by email
  const email = user.email?.toLowerCase().trim();
  if (email) {
    const { data: byEmail } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('email', email)
      .in('status', ['active', 'notice'])
      .maybeSingle();

    if (byEmail) return NextResponse.json(byEmail);
  }

  return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
}
