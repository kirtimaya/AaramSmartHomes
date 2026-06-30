import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireGuest } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  const auth = await requireGuest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: bookings, error } = await supabaseAdmin
    .from('room_bookings')
    .select('*, properties(name, location), rooms(name, type)')
    .eq('guest_id', auth.userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ bookings: bookings ?? [] });
}
