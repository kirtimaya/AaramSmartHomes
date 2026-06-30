import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;
  const { adminClient } = auth;

  const { name, phone, email, roomId, moveInDate } = await request.json();
  if (!name || !roomId) {
    return NextResponse.json({ error: 'name and roomId are required' }, { status: 400 });
  }

  // Verify room exists
  const { data: room } = await adminClient
    .from('rooms')
    .select('id, property_id')
    .eq('id', roomId)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Create invitation record
  const { data: invitation, error: invErr } = await adminClient
    .from('tenant_invitations')
    .insert({
      room_id:      roomId,
      name,
      phone:        phone || null,
      email:        email?.toLowerCase() || null,
      move_in_date: moveInDate || null,
      status:       'pending',
    })
    .select('id, token')
    .single();

  if (invErr || !invitation) {
    return NextResponse.json({ error: invErr?.message ?? 'Failed to create invitation' }, { status: 500 });
  }

  const origin = request.headers.get('origin') ?? 'https://aaram.space';
  const joinUrl = `${origin}/join?token=${invitation.token}`;

  // Send Supabase invite email — requires SUPABASE_SERVICE_ROLE_KEY (admin auth)
  let emailSent = false;
  if (email) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[tenants/add] Cannot send invite email: SUPABASE_SERVICE_ROLE_KEY not set');
    } else {
      const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data:       { full_name: name },
        redirectTo: `${origin}/join?token=${invitation.token}`,
      });
      emailSent = !inviteErr;
      if (inviteErr) console.error('[tenants/add] inviteUserByEmail error:', inviteErr.message);
    }
  }

  return NextResponse.json({ success: true, joinUrl, emailSent, token: invitation.token });
}
