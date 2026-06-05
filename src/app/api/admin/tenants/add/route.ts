import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { name, email, phone, roomId, moveInDate } = await request.json();
  if (!name || !email || !roomId) {
    return NextResponse.json({ error: 'name, email, and roomId are required' }, { status: 400 });
  }

  // Determine user ID: check guests table first (existing user), then invite
  let userId: string;

  const { data: existingGuest } = await supabaseAdmin
    .from('guests')
    .select('id')
    .eq('email', email.toLowerCase())
    .single();

  if (existingGuest) {
    userId = existingGuest.id;
  } else {
    // Check tenants table in case they're already a tenant
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingTenant) {
      userId = existingTenant.id;
    } else {
      // Invite new user — creates auth account and sends invite email
      const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        { data: { full_name: name } }
      );
      if (inviteErr) {
        // User may already have an auth account not in our tables — list and find
        const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
        const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (!found) return NextResponse.json({ error: inviteErr.message }, { status: 400 });
        userId = found.id;
      } else {
        userId = inviteData.user.id;
      }
    }
  }

  // Get room + property info
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, property_id')
    .eq('id', roomId)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Upsert tenant record
  const { error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .upsert({
      id:           userId,
      name,
      email:        email.toLowerCase(),
      phone:        phone || null,
      room_id:      roomId,
      property_id:  room.property_id,
      status:       'active',
      move_in_date: moveInDate || new Date().toISOString().split('T')[0],
    }, { onConflict: 'id' });

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // Update room occupancy
  await supabaseAdmin
    .from('rooms')
    .update({ occupancy_status: 'Occupied', tenant_id: userId })
    .eq('id', roomId);

  // Remove from guests if present (they're now a tenant)
  await supabaseAdmin.from('guests').delete().eq('id', userId);

  // In-app notification (non-fatal)
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id:   userId,
      user_type: 'tenant',
      type:      'tenant_approved',
      title:     'Welcome to Aaram Smart Homes!',
      message:   'Your tenant portal has been set up. Check your email for login instructions.',
      read:      false,
    });
  } catch { /* ignore */ }

  return NextResponse.json({ success: true, tenantId: userId });
}
