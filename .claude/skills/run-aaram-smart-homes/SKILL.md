---
name: run-aaram-smart-homes
description: Run, start, build, screenshot, or test the AaramSmartHomes Next.js web app. Use this skill when asked to launch the app, take a screenshot, verify a UI change, or smoke-test the running server.
---

AaramSmartHomes is a Next.js 16 + React 19 property management system (PMS) for premium villas. It uses Supabase for auth/data and exposes routes for admin, tenants, food-hub, Alexa integration, and a guest landing page. The driver is a Playwright script at `.claude/skills/run-aaram-smart-homes/driver.mjs`.

## Prerequisites

```bash
# Playwright chromium browser (one-time, ~92 MB)
npx playwright install chromium
```

No other global installs needed. Environment variables are already in `.env.local`.

## Start the dev server

```bash
pnpm dev
# Starts on http://localhost:3000, ready in ~1.3 s (Turbopack)
```

Run in a background terminal. The server must be running before using the driver.

## Run (agent path)

### Smoke-test all pages — screenshots to `/tmp/aaramhomes-screenshots/`

```bash
node .claude/skills/run-aaram-smart-homes/driver.mjs
```

Output (verified 2026-06-05):
```
✓ /              → HTTP 200  → /tmp/aaramhomes-screenshots/landing.png
✓ /login         → HTTP 200  → /tmp/aaramhomes-screenshots/login.png
✓ /adminLogin    → HTTP 200  → /tmp/aaramhomes-screenshots/adminLogin.png
✓ /admin         → HTTP 200  → /tmp/aaramhomes-screenshots/admin.png
✓ /food-hub      → HTTP 200  → /tmp/aaramhomes-screenshots/food-hub.png
✓ /properties    → HTTP 200  → /tmp/aaramhomes-screenshots/properties.png
```

### Screenshot a specific route

```bash
node .claude/skills/run-aaram-smart-homes/driver.mjs screenshot /login /tmp/login.png
```

### Test an API endpoint (no browser needed)

```bash
node .claude/skills/run-aaram-smart-homes/driver.mjs api /api/admin/pending-requests
# → HTTP 401  (unauthenticated — expected)
```

### Custom base URL or screenshot dir

```bash
NEXT_URL=http://localhost:3001 SCREENSHOT_DIR=/tmp/myshots \
  node .claude/skills/run-aaram-smart-homes/driver.mjs
```

## Run (human path)

```bash
pnpm dev   # opens http://localhost:3000 in any browser
```

## Key routes

| Route | Notes |
|---|---|
| `/` | Landing page — property cards, no auth required |
| `/login` | Tenant login via Supabase |
| `/adminLogin` | Admin login — redirects to `/admin` on success |
| `/admin` | Admin dashboard — shows "VERIFYING ADMIN ACCESS" until session resolves |
| `/admin/occupancy` | Unit manifest |
| `/admin/financials` | Rent & electricity billing |
| `/admin/tickets` | Maintenance tickets |
| `/admin/iot` | Smart home hub |
| `/admin/calendar` | Management calendar |
| `/food-hub` | Kitchen Hub — role-gated, Alexa-integrated |
| `/properties` | Public property listings |

## API endpoints

| Endpoint | Method | Notes |
|---|---|---|
| `/api/alexa` | POST | Alexa skill handler — requires signature verification |
| `/api/admin/pending-requests` | GET | Returns 401 without valid session cookie |
| `/api/chat` | POST | Aara AI chat — needs Gemini or Groq API key in `.env.local` |

## Gotchas

- **Playwright not in project `node_modules`**: The driver auto-installs it to `/tmp/aaramsmoke/` on first run. Takes ~10 s. Subsequent runs reuse the cache.
- **Admin page shows spinner, not dashboard**: This is correct — the auth check hits Supabase and redirects unauthenticated sessions. You will not see the dashboard UI without a valid Supabase session cookie.
- **Screenshots are `domcontentloaded`, not `networkidle`**: Pages with Supabase calls finish rendering asynchronously. If you need the fully-loaded state, change `waitUntil: 'networkidle'` in driver.mjs (adds ~3–5 s per page).
- **All pages return HTTP 200 even when redirecting**: Next.js client-side auth redirects happen in JS after the 200 HTML response. Check the screenshot, not just the status code, to verify the actual UI state.
- **Port 3000 conflict**: If another process holds 3000, `pnpm dev` silently tries 3001. Check `NEXT_URL` env var and update if needed.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot find package 'playwright'` | Run `npx playwright install chromium` from the project root once |
| `Error: connect ECONNREFUSED 127.0.0.1:3000` | Dev server not running — start with `pnpm dev` first |
| `TimeoutError: page.goto` exceeded 15000ms | Server compiling a cold route — retry; first hit for a route takes 3–4 s |
| Supabase warning in server logs | Normal — credentials warn if missing; app still loads with mock-data fallbacks |