import crypto from 'crypto';

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

/**
 * Create a Razorpay order via the Orders API.
 * Returns the raw Razorpay order object on success, throws on failure.
 */
export async function createRazorpayOrder(
  amountPaise: number,
  receiptId: string
): Promise<{ id: string; amount: number; currency: string }> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment');
  }

  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,    // in paise (₹5000 = 500000 paise)
      currency: 'INR',
      receipt: receiptId,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`Razorpay order creation failed (${res.status}): ${err.slice(0, 200)}`);
  }

  return res.json();
}

/**
 * Verify Razorpay payment signature (HMAC-SHA256).
 * signature = HMAC(orderId + "|" + paymentId, keySecret)
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}
