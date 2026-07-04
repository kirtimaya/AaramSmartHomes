import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/** GET /api/join?token=<token> — public, returns invitation info */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from('tenant_invitations')
    .select('id, name, phone, email, move_in_date, status, rooms(name, type, property_id, properties(name, location))')
    .eq('token', token)
    .single();

  if (!inv) return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
  if (inv.status === 'claimed') return NextResponse.json({ error: 'This invitation has already been used', claimed: true }, { status: 410 });

  return NextResponse.json({ invitation: inv });
}

/** POST /api/join — authenticated, claims the invitation and creates tenant record */
export async function POST(request: NextRequest) {
  const bearerToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!bearerToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(bearerToken);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });

  const { data: inv } = await supabaseAdmin
    .from('tenant_invitations')
    .select('*, rooms(property_id)')
    .eq('token', token)
    .single();

  if (!inv) return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 });
  if (inv.status === 'claimed') return NextResponse.json({ error: 'Already claimed', claimed: true }, { status: 410 });

  const now = new Date().toISOString();

  // Create tenant record with real auth UID
  const { error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .upsert({
      id:           user.id,
      name:         inv.name,
      email:        inv.email ?? user.email ?? '',
      phone:        inv.phone ?? user.phone ?? null,
      room_id:      inv.room_id,
      property_id:  (inv.rooms as any)?.property_id ?? null,
      status:       'active',
      move_in_date: inv.move_in_date ?? now.split('T')[0],
    }, { onConflict: 'id' });

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // Update room occupancy
  await supabaseAdmin
    .from('rooms')
    .update({ occupancy_status: 'Occupied', tenant_id: user.id })
    .eq('id', inv.room_id);

  // Mark invitation claimed and record which auth user claimed it
  await supabaseAdmin
    .from('tenant_invitations')
    .update({ status: 'claimed', auth_user_id: user.id })
    .eq('id', inv.id);

  // Remove guest record if present
  await supabaseAdmin.from('guests').delete().eq('id', user.id);

  // In-app notification
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id:   user.id,
      user_type: 'tenant',
      type:      'tenant_approved',
      title:     'Welcome to Aaram Smart Homes!',
      message:   `Your member portal for ${inv.name} is now active.`,
      read:      false,
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true });
}
