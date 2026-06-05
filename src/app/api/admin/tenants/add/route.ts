import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { name, phone, email, roomId, moveInDate } = await request.json();
  if (!name || !roomId) {
    return NextResponse.json({ error: 'name and roomId are required' }, { status: 400 });
  }

  // Verify room exists
  const { data: room } = await supabaseAdmin
    .from('rooms')
    .select('id, property_id')
    .eq('id', roomId)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Create invitation record — generates a unique token automatically
  const { data: invitation, error: invErr } = await supabaseAdmin
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

  // Optionally send Supabase invite email if email was provided
  let emailSent = false;
  if (email) {
    const { error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data:           { full_name: name },
      redirectTo:     `${origin}/join?token=${invitation.token}`,
    });
    emailSent = !inviteErr;
  }

  return NextResponse.json({ success: true, joinUrl, emailSent, token: invitation.token });
}
