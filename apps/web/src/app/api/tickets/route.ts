import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { category, description, priority = 'Medium', bookingId, imageUrl, roomId, preferredMoveIn } =
    await request.json();

  if (!category || !description) {
    return NextResponse.json({ error: 'category and description required' }, { status: 400 });
  }

  // Determine requester type
  const [{ data: tenantRow }, { data: guestRow }] = await Promise.all([
    supabaseAdmin.from('tenants').select('id').eq('id', user.id).single(),
    supabaseAdmin.from('guests').select('id').eq('id', user.id).single(),
  ]);

  const requesterType = tenantRow ? 'tenant' : 'guest';

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .insert({
      requester_id:      user.id,
      requester_type:    requesterType,
      category,
      priority,
      description,
      image_url:         imageUrl ?? null,
      booking_id:        bookingId ?? null,
      room_id:           roomId ?? null,
      preferred_move_in: preferredMoveIn ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket }, { status: 201 });
}
