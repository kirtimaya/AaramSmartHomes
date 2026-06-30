const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN ?? '';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? '';

/**
 * Send a WhatsApp text message via Meta Cloud API (free tier: 1000 conversations/month).
 * Requires WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID env vars.
 * Silently logs errors — never throws — so billing operations aren't blocked.
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) return;

  // Normalise phone: ensure E.164 format without leading +
  const normalised = phone.replace(/\D/g, '');
  if (!normalised) return;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalised,
          type: 'text',
          text: { body: message },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      console.error(`WhatsApp send failed (${res.status}):`, err.slice(0, 200));
    }
  } catch (e) {
    console.error('WhatsApp send error:', e);
  }
}
