---
name: security-hardening
description: Status of security improvements from Claude_Security_Report.md — what's fixed, what's still open
metadata:
  type: project
---

## What was implemented (session: 2026-06-04)

Server-side API routes created under `/src/app/api/admin/`:
- `status/route.ts` — GET, verifies JWT, returns `{ isAdmin, isRoot, hasPendingRequest }`. Replaces client-side admin email list fetch.
- `pending-requests/route.ts` — GET, root-only, returns pending admin requests without exposing to non-root users.
- `approve/route.ts` — POST, root-only, inserts into `admins` table server-side (fixes C3).
- `verify-token/route.ts` — POST, verifies approval token and inserts into `admins` server-side (fixes C3).
- `request/route.ts` — POST, authenticated, submits admin access request server-side.

Client files updated:
- `adminLogin/page.tsx` — ROOT_EMAIL removed from client bundle; direct `admins` table writes replaced with API calls; error messages sanitized (no raw DB codes); ROOT_EMAIL removed from footer/pending-approval display; "Root Bypass" button removed.
- `AdminLayout.tsx` — replaced `supabase.from('admins').select('email')` full-list fetch with `/api/admin/status` boolean check (fixes M1 email leak).
- `AaraChatbot.tsx` — same admin check replaced; debug `console.log` removed.
- `useAaraCommands.ts` — debug `console.log` removed.
- `auth/callback/route.ts` — `exchangeCodeForSession` error is now handled (redirects to `/login?error=auth_failed`).

## What is already fixed (pre-existing)

C1 — `/api/chat` route verifies Supabase JWT server-side and derives role from DB.
C2 — AdminLayout uses exact email equality, not substring `includes('admin')`.
H2 — Approval tokens use `crypto.randomUUID()` (CSPRNG).
H4 — OAuth redirect param allowlisted (relative paths only, no `//`).
L1 — `tmp/check_gemini.mjs` does not exist.
L2 — Duplicate `AaraChatbot_V3_Snitch_Master.tsx` does not exist.

## What still needs manual work (cannot fix from code alone)

- **Postgres RLS** — Enable strict RLS on `admins`, `admin_requests`, `tickets`, `expenses`, `income_records`, `rooms`. Without RLS, the anon key can bypass server checks at the DB layer.
- **`SUPABASE_SERVICE_ROLE_KEY`** — Add to `.env.local`; API routes use it if present for `admins` inserts, falling back to anon key.
- **`ROOT_EMAIL`** — Must be set as server-only env var (no `NEXT_PUBLIC_` prefix). The old `NEXT_PUBLIC_ROOT_EMAIL` var can be removed.
- **Rate limiting** — `/api/chat` and `/api/admin/*` have no rate limiter. Consider Upstash/Redis rate limiting middleware.
- **Tests** — No unit/integration tests exist for auth flows or role gates.

**Why:** Fixes the C3 "client writes directly to privileged tables" and M1 "admin email list leak" issues from the security report.
**How to apply:** Future sessions should not re-introduce direct `supabase.from('admins').insert()` calls in client components. All `admins` table writes must go through server routes that verify the caller is root.
