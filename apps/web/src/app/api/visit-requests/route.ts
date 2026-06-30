import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireGuest } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const auth = await requireGuest(request);
  if (auth instanceof NextResponse) return auth;

  const { propertyId, roomId, preferredDate, message } = await request.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('visit_requests')
    .insert({
      requester_id:   auth.userId,
      requester_type: 'guest',
      property_id:    propertyId,
      room_id:        roomId ?? null,
      preferred_date: preferredDate ?? null,
      message:        message ?? null,
      status:         'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visitRequest: data }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await requireGuest(request);
  if (auth instanceof NextResponse) return auth;

  const { data, error } = await supabaseAdmin
    .from('visit_requests')
    .select('*, properties(name, location), rooms(name, type)')
    .eq('requester_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ visitRequests: data ?? [] });
}
