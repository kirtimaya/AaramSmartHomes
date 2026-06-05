import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function requireAdmin(
  request: NextRequest
): Promise<{ userId: string; email: string } | NextResponse> {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: admin } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('email', user.email)
    .single();

  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return { userId: user.id, email: user.email! };
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
