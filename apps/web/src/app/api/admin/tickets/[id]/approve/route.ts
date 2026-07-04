import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

/**
 * Approve a TenantAccessRequest ticket.
 * Creates a tenant record, resolves the ticket, and notifies the user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const adminNote = body.adminNote ?? 'Approved';

  // Load ticket
  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('id', id)
    .eq('category', 'TenantAccessRequest')
    .single();

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === 'Resolved') {
    return NextResponse.json({ error: 'Already resolved' }, { status: 409 });
  }

  // Load guest profile for name/email/phone
  const { data: guest } = await supabaseAdmin
    .from('guests')
    .select('id, name, email, phone')
    .eq('id', ticket.requester_id)
    .single();

  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });

  // Get room_id: prefer direct room_id on ticket, fall back to booking
  let roomId: string | null = ticket.room_id ?? null;
  let propertyId: string | null = null;
  if (ticket.booking_id) {
    const { data: booking } = await supabaseAdmin
      .from('room_bookings')
      .select('room_id, property_id')
      .eq('id', ticket.booking_id)
      .single();
    if (!roomId) roomId = booking?.room_id ?? null;
    propertyId = booking?.property_id ?? null;
  }
  // Get property_id from room if not from booking
  if (roomId && !propertyId) {
    const { data: roomRow } = await supabaseAdmin.from('rooms').select('property_id').eq('id', roomId).single();
    propertyId = roomRow?.property_id ?? null;
  }

  const now = new Date().toISOString();

  // Insert into tenants
  const { error: tenantErr } = await supabaseAdmin
    .from('tenants')
    .upsert({
      id:         guest.id,
      name:       guest.name,
      email:      guest.email,
      phone:      guest.phone ?? null,
      room_id:    roomId,
      property_id: propertyId,
      status:     'active',
      move_in_date: now.split('T')[0],
    }, { onConflict: 'id' });

  if (tenantErr) return NextResponse.json({ error: tenantErr.message }, { status: 500 });

  // Update room occupancy to Occupied
  if (roomId) {
    await supabaseAdmin
      .from('rooms')
      .update({ occupancy_status: 'Occupied', tenant_id: guest.id })
      .eq('id', roomId);
  }

  // Mark booking as confirmed
  if (ticket.booking_id) {
    await supabaseAdmin
      .from('room_bookings')
      .update({ status: 'confirmed' })
      .eq('id', ticket.booking_id);
  }

  // Remove guest record now that they're a tenant
  await supabaseAdmin.from('guests').delete().eq('id', guest.id);

  // Resolve ticket
  await supabaseAdmin
    .from('tickets')
    .update({ status: 'Resolved', admin_note: adminNote, updated_at: now })
    .eq('id', id);

  // In-app notification
  await supabaseAdmin.from('notifications').insert({
    user_id:   guest.id,
    user_type: 'tenant',
    type:      'tenant_approved',
    title:     'Welcome to Aaram!',
    message:   'Your member access has been approved. You can now log in to your member portal.',
    read:      false,
  });

  // WhatsApp notification
  if (guest.phone) {
    await sendWhatsAppMessage(
      guest.phone,
      `Hi ${guest.name}! 🎉 Your member access at Aaram Smart Homes has been approved. Log in at aaram.space/login to access your portal.`
    );
  }

  return NextResponse.json({ success: true });
}
