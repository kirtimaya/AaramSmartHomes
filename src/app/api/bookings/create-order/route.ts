import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireGuest } from '@/lib/supabaseAdmin';
import { createRazorpayOrder, RAZORPAY_KEY_ID } from '@/lib/razorpay';
import { BOOKING_TOKEN_AMOUNT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  const auth = await requireGuest(request);
  if (auth instanceof NextResponse) return auth;

  const { propertyId, roomId } = await request.json();
  if (!propertyId) return NextResponse.json({ error: 'propertyId required' }, { status: 400 });

  // Create pending booking row first
  const { data: booking, error: bookingErr } = await supabaseAdmin
    .from('room_bookings')
    .insert({
      guest_id:    auth.userId,
      property_id: propertyId,
      room_id:     roomId ?? null,
      token_amount: BOOKING_TOKEN_AMOUNT,
      status: 'pending',
    })
    .select()
    .single();

  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 500 });

  // Create Razorpay order (amount in paise)
  const order = await createRazorpayOrder(
    BOOKING_TOKEN_AMOUNT * 100,
    booking.id
  ).catch((e) => { throw e; });

  // Store order ID
  await supabaseAdmin
    .from('room_bookings')
    .update({ razorpay_order_id: order.id })
    .eq('id', booking.id);

  return NextResponse.json({
    bookingId: booking.id,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: RAZORPAY_KEY_ID,
  });
}
