// Root admin email — fallback if ROOT_EMAIL env var is not set
export const ROOT_EMAIL = process.env.ROOT_EMAIL ?? 'kirtimayaswain@gmail.com';

// Razorpay token booking amount (₹5,000)
export const BOOKING_TOKEN_AMOUNT = 5000;

// Guest inactivity threshold for retention cleanup (days)
export const GUEST_RETENTION_DAYS = 90;
