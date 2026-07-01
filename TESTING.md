# AaramSmartHomes — Test Suite

## Quick start

```bash
pnpm test              # run all tests once
pnpm test:watch        # watch mode
pnpm test:coverage     # with v8 coverage report
```

## Stack

| Tool | Role |
|------|------|
| Vitest 4 | Test runner, assertion library |
| @testing-library/react | Component + hook rendering |
| @testing-library/user-event | Simulates real user interactions |
| @testing-library/jest-dom | DOM matchers (`toBeInTheDocument`, etc.) |
| jsdom | Browser environment for Node |

Config: [`vitest.config.ts`](vitest.config.ts) — `jsdom` environment, globals enabled, includes `packages/*/src/**/*.test.{ts,tsx}`, excludes `*.native.*` files (those require a React Native environment not available in jsdom).

---

## Test inventory

### Phase 1.4 — Platform adapters (`packages/core`)

#### `packages/core/src/__tests__/platform/storage.test.ts`
Tests the **web** localStorage adapter (`packages/core/src/platform/storage.ts`).

| Test | What it covers |
|------|---------------|
| setItem + getItem round-trip | Stores and retrieves a value |
| getItem missing key | Returns null for nonexistent key |
| removeItem | Deletes key; getItem returns null afterwards |
| overwrite key | Second setItem replaces existing value |
| independent keys | Multiple keys don't interfere |

Run individually: `pnpm test -- storage`

---

#### `packages/core/src/__tests__/platform/links.test.ts`
Tests the **web** `openUrl` adapter (`packages/core/src/platform/links.ts`).

| Test | What it covers |
|------|---------------|
| window.open called with correct args | URL, `_blank`, `noopener,noreferrer` |
| SSR no-op | Returns `undefined` without throwing when `window` is undefined |

Run individually: `pnpm test -- links`

---

#### `packages/core/src/__tests__/platform/useSystemColorScheme.test.ts`
Tests the **web** `useSystemColorScheme` hook (`packages/core/src/platform/useSystemColorScheme.ts`).

| Test | What it covers |
|------|---------------|
| Returns `light` initially | `matchMedia` reports light preference |
| Returns `dark` initially | `matchMedia` reports dark preference |
| Updates to dark | Hook reacts to `change` event firing dark |
| Updates to light | Hook reacts to `change` event firing light |
| Removes listener on unmount | No event listener leak |

Run individually: `pnpm test -- useSystemColorScheme`

---

### Phase 1.5 — Auth hooks (`packages/core`)

#### `packages/core/src/__tests__/auth/useLoginForm.test.ts`
Tests `useLoginForm` (`packages/core/src/auth/useLoginForm.ts`).

| Test | What it covers |
|------|---------------|
| Blocks empty email | No network call; error set |
| Blocks empty password | No network call |
| Calls onSuccess on valid login | `signInWithPassword` called with correct creds |
| Surfaces auth error | Supabase error message surfaced in state |
| Trims email whitespace | Email sent trimmed |
| loading=false after success | Spinner would clear |
| loading=false after error | Spinner would clear |

Run individually: `pnpm test -- useLoginForm`

---

#### `packages/core/src/__tests__/auth/useSignupForm.test.ts`
Tests `useSignupForm` (`packages/core/src/auth/useSignupForm.ts`).

| Test | What it covers |
|------|---------------|
| Blocks missing name | Validation error, no network call |
| Blocks missing email | Validation error, no network call |
| Blocks missing password | Validation error, no network call |
| Blocks password < 6 chars | Specific length error message |
| Calls onSuccess on valid signup | `signUp` called with trimmed name + email |
| Passes emailRedirectTo | Optional redirect URL forwarded to Supabase |
| Surfaces Supabase error | Error message shown to user |
| Trims name and email | Both fields trimmed before the call |

Run individually: `pnpm test -- useSignupForm`

---

#### `packages/core/src/__tests__/auth/useResetPasswordForm.test.ts`
Tests `useResetPasswordForm` and `useForgotPasswordForm` (`packages/core/src/auth/useResetPasswordForm.ts`).

**useResetPasswordForm:**

| Test | What it covers |
|------|---------------|
| Blocks mismatched passwords | "do not match" error, no network call |
| Blocks password < 8 chars | "8 characters" error message |
| Calls onSuccess on valid reset | `updateUser` called; onSuccess fires |
| Surfaces Supabase error | Error shown, onSuccess not called |
| loading=false after success | Spinner clears |

**useForgotPasswordForm:**

| Test | What it covers |
|------|---------------|
| Blocks empty email | No network call |
| Sets `sent=true` on success | UI can show "check your inbox" |
| Trims email | Sent trimmed |
| Passes redirectTo | Forwarded to `resetPasswordForEmail` |
| Surfaces Supabase error | `sent` stays false |

Run individually: `pnpm test -- useResetPasswordForm`

---

### Phase 1.2 — UI primitives (`packages/ui`)

#### `packages/ui/src/__tests__/NeoSurface.test.tsx`
Tests `NeoSurface` (`packages/ui/src/NeoSurface.tsx`).

| Test | What it covers |
|------|---------------|
| Renders children | Content appears in the DOM |
| `variant=out` (default) | `--neo-out-shadow` CSS variable applied |
| `variant=out-sm` | `--neo-out-shadow-sm` CSS variable applied |
| `variant=in` | `--neo-in-shadow` CSS variable applied |
| Custom radius | `borderRadius` matches `radius` prop |
| Extra style props | Merged into container style |

Run individually: `pnpm test -- NeoSurface`

---

### Phase 1.5 — Auth screen components (`packages/ui`)

#### `packages/ui/src/__tests__/auth/LoginScreen.test.tsx`
Tests `LoginScreen` web variant (`packages/ui/src/auth/LoginScreen.tsx`).

> Note: tests the **web** `.tsx` variant, not `.native.tsx`. The native variant requires a React Native test environment (not jsdom).

| Test | What it covers |
|------|---------------|
| Renders email + password inputs | Both fields present |
| Hook validation on empty form | Error shown; no network call (`fireEvent.submit` bypasses HTML5 `required`) |
| signInWithPassword called with creds | Correct arguments forwarded |
| onSuccess fires after login | Callback invoked on success |
| Auth error displayed | Supabase message rendered |
| Forgot? opens overlay | Overlay with "Reset Password" appears |
| Signup navigation | `onNavigateSignup` called |
| Home navigation | `onNavigateHome` called |

Run individually: `pnpm test -- LoginScreen`

---

#### `packages/ui/src/__tests__/auth/SignupScreen.test.tsx`
Tests `SignupScreen` web variant (`packages/ui/src/auth/SignupScreen.tsx`).

| Test | What it covers |
|------|---------------|
| Renders all three inputs | Name, email, password present |
| Success state after signup | "Request Received" heading shown |
| Hook validation on empty form | Error shown; no network call |
| Supabase error displayed | Error message rendered |
| Login navigation | `onNavigateLogin` called |

Run individually: `pnpm test -- SignupScreen`

---

#### `packages/ui/src/__tests__/auth/ResetPasswordScreen.test.tsx`
Tests `ResetPasswordScreen` web variant (`packages/ui/src/auth/ResetPasswordScreen.tsx`).

| Test | What it covers |
|------|---------------|
| Renders password + confirm inputs | Both fields present |
| Mismatch error | "Passwords do not match" shown |
| Too-short error | "8 characters" message shown |
| Success state shown | "Password updated!" heading visible |
| onSuccess called after delay | Fires after the 2500ms auto-redirect (real timer, 8s test budget) |
| Supabase error displayed | Error message rendered; onSuccess not called |

Run individually: `pnpm test -- ResetPasswordScreen`

---

### Phase 1.6 — Tenant portal hooks (`packages/core`)

#### `packages/core/src/__tests__/tenant/useTenantDashboard.test.ts`
Tests `useTenantDashboard` (`packages/core/src/tenant/useTenantDashboard.ts`).

> Mock pattern: a thenable chain (`then`/`catch`/`finally` + `maybeSingle`) covers both
> the `.maybeSingle()` path (tenants) and direct-await path (tickets, bill_splits).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, `tenant=null` before data arrives |
| Loads tenant, tickets, and bills | All three fetched in parallel; correct values in state |
| Not authenticated | `error="not_authenticated"` when session is null |
| Throws on load | Error message surfaced from caught exception |
| Null tenant row | `tenant=null`, `error=null` — missing profile is graceful |
| Empty arrays | Zero tickets and bills handled without errors |
| Refresh re-fetches | `refreshing` resets; `getSession` called twice (mount + refresh) |

Run individually: `pnpm test -- useTenantDashboard`

---

#### `packages/core/src/__tests__/tenant/useTicketForm.test.ts`
Tests `useTicketForm` (`packages/core/src/tenant/useTicketForm.ts`).

| Test | What it covers |
|------|---------------|
| Initialises with defaults | `category=Maintenance`, `priority=Medium`, `description=""` |
| Blocks empty description | Error set; `from()` not called |
| Inserts correct payload | `insert` called with trimmed description + correct fields |
| Surfaces DB error | Error message shown; `submitted` stays false |
| loading=false after success | Spinner clears |
| loading=false after error | Spinner clears |
| reset restores defaults | All fields back to initial values; `submitted=false` |

Run individually: `pnpm test -- useTicketForm`

---

## Running regression tests

Run the full suite before each phase merge to catch regressions:

```bash
pnpm test
```

Expected output: **76 tests** across **12 test files**, all passing.

To see coverage:

```bash
pnpm test:coverage
# report at: coverage/index.html
```

Coverage includes all `packages/*/src/**` except test files and `.native.*` overrides.

---

## What is NOT covered (and why)

| Item | Reason |
|------|--------|
| `.native.tsx` / `.native.ts` variants | Require React Native runtime; use Expo's built-in Jest preset in `apps/mobile` for those |
| Web app routes (`apps/web`) | Integration-tested via Next.js dev server; unit tests would duplicate what component tests already cover |
| Supabase edge functions / DB | Use Supabase's own migration tests |
| Mobile navigation (`expo-router`) | End-to-end; covered by device simulator verification |

---

## Adding tests for a new phase

1. Create `packages/<package>/src/__tests__/<feature>/` directory.
2. Name files `<hookOrComponent>.test.ts[x]`.
3. For hooks: use `renderHook` + two separate `act` blocks (one for state setters, one for async actions) — see `useLoginForm.test.ts` for the pattern.
4. For components with `required` inputs: use `fireEvent.submit(container.querySelector('form')!)` to test hook-level validation, bypassing HTML5 browser validation.
5. Run `pnpm test` — new tests are picked up automatically.
