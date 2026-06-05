import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, requireGuest } from '@/lib/supabaseAdmin';
import { verifyRazorpaySignature } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  const auth = await requireGuest(request);
  if (auth instanceof NextResponse) return auth;

  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    await request.json();

  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 });
  }

  // Verify signature
  const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });

  // Mark booking as paid
  const { data: booking, error } = await supabaseAdmin
    .from('room_bookings')
    .update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'paid',
    })
    .eq('id', bookingId)
    .eq('guest_id', auth.userId)
    .select()
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? 'Booking not found' }, { status: 500 });
  }

  // Fire in-app notification
  await supabaseAdmin.from('notifications').insert({
    user_id:   auth.userId,
    user_type: 'guest',
    type:      'booking_confirmed',
    title:     'Booking Confirmed!',
    message:   `Your token payment of ₹${booking.token_amount} has been received. You can now request tenant access.`,
    read:      false,
  }).then(() => {});

  return NextResponse.json({ success: true, booking });
}
