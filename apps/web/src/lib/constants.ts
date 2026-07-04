// Root admin email. No hardcoded fallback: previously this baked the root
// admin's address into the server bundle, meaning it could not be rotated
// without a code change. If ROOT_EMAIL is unset, root-admin recognition
// (auth callback routing, /api/admin/status|approve|admins, /api/chat)
// fails closed — no one matches — rather than granting access to a
// hardcoded address. Verify ROOT_EMAIL is set in the deployment
// environment (e.g. Vercel project settings) before this ships.
export const ROOT_EMAIL = process.env.ROOT_EMAIL ?? '';
if (!ROOT_EMAIL && typeof window === 'undefined') {
  console.error('[config] ROOT_EMAIL is not set — root admin recognition will fail closed.');
}

// Razorpay token booking amount (₹5,000)
export const BOOKING_TOKEN_AMOUNT = 5000;

// Guest inactivity threshold for retention cleanup (days)
export const GUEST_RETENTION_DAYS = 90;
