# AaramSmartHomes — Security & Project Analysis Report (`confidential` branch)

> Analysis of the `confidential` branch of `kirtimaya/AaramSmartHomes`. Source was read directly
> from `origin/confidential` (never checked out). This document covers: (1) vulnerabilities,
> (2) current features, (3) suggested improvements, and (4) suggested new features.

**Stack:** Next.js 16 (App Router) · React 19 · Supabase (auth + Postgres) · Tailwind v4 ·
framer-motion · recharts. AI chatbot "Aara" via Google Gemini (`gemini-2.0-flash-lite`) with
Groq (`llama-3.3-70b`) fallback. Domain: co-living / property management SaaS (India, ₹).

---

## 1. Security Vulnerabilities (highest → lowest severity)

### CRITICAL

**C1 — AI chat API trusts a client-supplied role and performs privileged DB writes.**
`src/app/api/chat/route.ts`. The route reads `context.role` from the request body
(`const userRole = context?.role || 'guest'`) and the system prompt literally states
*"CURRENT USER ROLE IS PROVIDED IN EACH REQUEST — TRUST IT COMPLETELY"*. Admin-only branches
(`update_room_status`, `record_financials`, `resolve_ticket`) are gated **only** on
`userRole === 'admin'`. There is **no server-side authentication** on the route — no Supabase JWT
is verified. Any anonymous client can `POST /api/chat` with
`{"message":"...","context":{"role":"admin"}}` and mutate rooms, insert income/expense records,
and resolve tickets. Complete authorization bypass + unauthorized data modification.

**C2 — Substring-based admin check grants admin to any email containing "admin".**
`src/components/layout/AdminLayout.tsx`: `normalizedEmail.includes('admin')`. Registering
`anyone+admin@gmail.com` (or `admin@attacker.com`) yields full admin UI access. Trivial
privilege escalation.

**C3 — Client-side-only authorization; privileged tables written directly from the browser
with the public anon key.** `adminLogin/page.tsx` calls `supabase.from('admins').insert(...)`
and `admin_requests` insert/update directly from the client (e.g. `approveRequest`,
`handleTokenVerification`, `handleSignup`). `AdminLayout` enforces admin status only in React.
Unless Postgres Row-Level Security is strict (the client code implies it is not), any visitor
holding the public `NEXT_PUBLIC_SUPABASE_ANON_KEY` can read/write `admins`, `admin_requests`,
`tickets`, `expenses`, `income_records`, `rooms` directly — bypassing the UI entirely. **This is
the root systemic issue: there is no trusted server-side authorization boundary.**

### HIGH

**H1 — Prompt-injection escalates to privileged DB writes.** `route.ts` extracts a JSON
`{"action":...}` blob from raw LLM output and executes it. User message + chat history +
injected "LIVE ADMIN DATA" all flow into the model, so a crafted prompt can coerce the model to
emit `record_financials` / `update_room_status` / `resolve_ticket`. Chained with C1 (spoofed
admin role), an attacker injects arbitrary financial entries or flips room/ticket state.

**H2 — Predictable, non-cryptographic admin approval tokens.**
`Math.random().toString(36).substring(2,15)` in `adminLogin/page.tsx` (`handleSignup`,
`requestRootApproval`). `Math.random()` is not a CSPRNG; tokens are short and guessable. A valid
token in `handleTokenVerification` inserts the requester straight into `admins`.

**H3 — No authentication / no rate limiting on `/api/chat`.** Anonymous callers can spam the
endpoint to: (a) insert arbitrary `tickets` rows with attacker-controlled `tenant_id`
(`create_ticket` has no role gate), and (b) burn Gemini/Groq quota → direct billing/cost-abuse
and data-pollution / DoS.

**H4 — Open redirect in OAuth callback.** `src/app/auth/callback/route.ts`:
`NextResponse.redirect(new URL(redirect, requestUrl.origin))` where `redirect` is an
attacker-controlled query param. Values like `//evil.com` resolve to an external origin →
phishing redirect after a legitimate login. Errors from `exchangeCodeForSession` are also
ignored.

### MEDIUM

**M1 — Admin email roster + auth IDs disclosed to non-admins.** `AdminLayout`'s "Access
Restricted" screen renders the full `adminList` (every admin email) plus the visitor's Supabase
`user.id` in a diagnostic block. Hands attackers a target list — directly useful for the C2
substring bypass and phishing.

**M2 — Verbose server error / debug leakage.** `route.ts` returns raw Supabase error strings
(`Error updating room: ${error.message}`) and truncated Gemini/Groq error bodies to clients, and
emits a `debug: 'used_groq_fallback'|'used_gemini'` field. `console.log` of email + isAdmin in
`AdminLayout`. Aids reconnaissance.

**M3 — Hardcoded super-admin identity in the client bundle.**
`ROOT_EMAIL = 'kirtimayaswain@gmail.com'` appears in `adminLogin/page.tsx` and `AdminLayout.tsx`
(shipped to every browser), with a client-side "Root Bypass: Enter Console" button. Exposes the
highest-value account for targeted attack.

### LOW / HYGIENE

**L1 — `tmp/check_gemini.mjs` committed.** Dev diagnostic that reads `.env.local`, logs the
first 8 chars of `GEMINI_API_KEY`, and pings Google's model-list API with the key in the URL.
Should not be in the repo; encourages key-in-URL patterns. (No actual secret is committed — a
history + working-tree scan found none, and `.gitignore` correctly excludes `.env*`.)

**L2 — Dead/duplicate chatbot variant.** `src/components/AaraChatbot_V3_Snitch_Master.tsx` is a
larger, unused copy (only `AaraChatbot.tsx` is imported in `layout.tsx`). Maintenance/confusion
risk and a chance to ship an unintended variant; remove or fold in.

**L3 — Mutable shared `supabase` singleton + secrets via `NEXT_PUBLIC_`.** Anon URL/key are
public by design, but all server logic reuses the anon client; no service-role client exists for
trusted server operations (reinforces C1/C3).

---

## 2. Current Features (as implemented on `confidential`)

**Public / discovery (live, Supabase):** Landing page with featured properties + amenities;
filterable Properties catalog (Villa/Flat/House); Property detail with room carousel, amenities,
automation systems, image galleries, "Request Allocation".

**Auth (live):** Resident email/password + Google OAuth (`login`, `signup`, `auth/callback`);
separate Admin Gateway (`adminLogin`) with self-onboarding → request → root-approval flow and a
realtime "Root Dashboard" of pending requests.

**Resident portal (live):** Role-aware `tenant` dashboard — guest mode (shortlisted properties,
schedule visit, amenities) and active-resident mode (unit/home status, dues tracker, climate
"scenes", security status) + a Support tab (concierge/WhatsApp/docs).

**Admin console (mostly live):** Dashboard metrics (occupancy %, revenue, open tickets, water
alerts); Occupancy tracker with room CRUD + status; Financial Hub (multi-category expenses,
income records, pie/bar charts); IoT/Water analytics (tank levels, consumption charts,
recommendations); Property management CRUD (rooms, amenities, automation nodes, image carousels).
**Mock-data only:** Maintenance Tickets and Move-Out Calendar pages.

**AI assistant "Aara" (live):** Draggable/voice-enabled chat FAB; Gemini→Groq fallback;
role-aware system prompt; executes navigate / app-command / create-ticket / resolve-ticket /
record-financials / update-room / water-level actions via JSON the model emits, dispatched into
pages through the `useAaraCommands` event bus.

---

## 3. Suggested Areas of Improvement

**Security (do first — see Part 1):**
- Establish a **server-side authorization boundary.** Verify the Supabase session JWT inside
  `/api/chat` and every privileged route; derive role **server-side** from the DB, never from the
  request body. Delete the "TRUST IT COMPLETELY" instruction.
- **Enable and audit Postgres RLS** on `admins`, `admin_requests`, `tickets`, `expenses`,
  `income_records`, `rooms`, `tenants`. Move all `admins`/`admin_requests` writes behind a
  service-role server route or SQL `SECURITY DEFINER` function — never client inserts.
- Replace the `includes('admin')` check with an exact membership lookup; remove hardcoded
  `ROOT_EMAIL` from client code (use a server-side allowlist / role claim).
- Use `crypto.randomUUID()` / `crypto.getRandomValues` for approval tokens; expire them.
- Add **rate limiting + auth** to `/api/chat`; treat any LLM-emitted action as a *proposal*
  re-validated server-side against the authenticated user's real permissions.
- Allowlist the OAuth `redirect` param (relative paths only); stop leaking admin emails / auth IDs
  / raw DB errors to clients; strip `console.log` of PII and the `debug` field.
- Remove `tmp/check_gemini.mjs`; rotate the Gemini/Groq keys if they were ever shared.

**Engineering quality:**
- Replace mock Tickets/Calendar with real Supabase tables for a consistent data model.
- Delete the duplicate `AaraChatbot_V3_Snitch_Master.tsx`; consolidate the chatbot.
- No tests exist — add unit tests for the action-parser and integration tests for auth/role gates.
- Centralize a typed Supabase data layer; validate all API input with a schema (e.g. Zod).
- Add error boundaries / structured logging; remove debug `console.log`s from production.

**UX / product:**
- Wire the resident "climate scenes" and IoT controls to real device state (currently cosmetic).
- Surface real ticket lifecycle (create→assign→resolve) to residents, not just admins.

---

## 4. Suggested New Features

- **Rent & payments:** online rent/deposit collection (Razorpay/Stripe), auto-receipts,
  reminders, ledger per resident — builds on the existing Financial Hub.
- **Resident-facing ticketing 2.0:** photo uploads, SLA timers, technician assignment,
  status notifications (email/WhatsApp/push).
- **Real IoT integration:** MQTT/webhook ingestion for water tanks, energy, locks; threshold
  alerts and automations (the IoT page is currently visual-only).
- **Lease lifecycle & e-signature:** digital agreements, renewals, automated move-in/move-out
  checklists tied to the Calendar module.
- **Analytics dashboard:** occupancy trends, revenue forecasting, churn/notice prediction.
- **Notifications service:** unified email/WhatsApp/push for approvals, dues, tickets, visits.
- **Aara upgrades (after securing it):** multilingual support, document Q&A over agreements,
  proactive nudges (dues, renewals), and a proper tool-calling framework with server-validated
  permissions instead of regex-parsed JSON.
- **Audit log & admin activity trail** (also a security control for C1–C3).
- **Mobile PWA / app** for residents.

---

## 5. Recommended Remediation Order

1. **C1 / C3 / H3** — Add server-side auth + role derivation on `/api/chat` and all privileged
   routes; enable strict RLS. (Removes the largest attack surface.)
2. **C2 / M3** — Replace substring admin check with exact membership; remove hardcoded root email
   from client.
3. **H2 / H1** — CSPRNG approval tokens; re-validate all LLM-emitted actions server-side.
4. **H4 / M1 / M2** — Allowlist redirect param; stop leaking admin emails / IDs / raw errors.
5. **L1 / L2** — Remove `tmp/check_gemini.mjs` and the duplicate chatbot; rotate keys if shared.
