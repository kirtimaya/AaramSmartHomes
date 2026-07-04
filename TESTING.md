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

### Phase 1.7 — Properties hook (`packages/core`)

#### `packages/core/src/__tests__/properties/useProperties.test.ts`
Tests `useProperties` (`packages/core/src/properties/useProperties.ts`).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, empty array before data arrives |
| Loads properties on mount | Correct count, names, nested rooms/benefits |
| Applies limit to query | `.limit(n)` called on the chain when `limit` prop given |
| No limit when not given | `.limit()` not called when prop is absent |
| DB error from Supabase | `error` set; properties stays empty |
| Thrown exception | Error message captured from catch block |
| Empty array | Zero properties is valid; `error=null` |
| Refresh re-fetches | `from()` called twice (mount + refresh) |

Run individually: `pnpm test -- useProperties`

---

### Phase 1.8 — Aara chat hook (`packages/core`)

#### `packages/core/src/__tests__/aara/useAaraChat.test.ts`
Tests `useAaraChat` (`packages/core/src/aara/useAaraChat.ts`).

| Test | What it covers |
|------|---------------|
| Initialises with greeting | One assistant message present; `loading=false`, `error=null` |
| Appends user + assistant | Both messages appended in order after `send()` |
| Trims input before calling | `sendMessage` receives trimmed text |
| Ignores empty/whitespace | `sendMessage` not called; no messages added |
| loading flag lifecycle | `true` while awaiting, `false` after resolve |
| Error recovery message | Error text in state; fallback assistant message appended |
| clearHistory | Resets to just the greeting |
| Multiple sends accumulate | All messages preserved across sequential sends |

Run individually: `pnpm test -- useAaraChat`

---

### Phase 1.9 — Admin dashboard hook (`packages/core`)

#### `packages/core/src/__tests__/admin/useAdminDashboard.test.ts`
Tests `useAdminDashboard` (`packages/core/src/admin/useAdminDashboard.ts`).

> Supabase mock extends the thenable-chain pattern with `.order()`, `.limit()`,
> `.gte()`, `.lt()`, `.in()`, and `{ count, head }` support for the notice-tenant
> count query.

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, empty arrays on mount |
| Loads all data | Properties, rooms, tickets, revenue, water logs |
| Deduplicates water logs | Keeps latest-per-property; second p1 log discarded |
| Occupancy rate | 3/4 rooms occupied/notice = 75% |
| Open tickets | Excludes Resolved status |
| Avg water level | `Math.round((75+20)/2) = 48` |
| Tenant name map | requester_id → name lookup |
| Not authenticated | `error="not_authenticated"` when session null |
| Exception | Error message captured from catch block |
| Refresh | `getSession` called twice; `refreshing` resets |

Run individually: `pnpm test -- useAdminDashboard`

---

### Phase 1.9 (cont) — Admin Tickets hook (`packages/core`)

#### `packages/core/src/__tests__/admin/useAdminTickets.test.ts`
Tests `useAdminTickets` (`packages/core/src/admin/useAdminTickets.ts`).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, empty array on mount |
| Loads and maps tickets with requester names | Tenant join resolves to `name`; guest join resolves to `name` |
| Returns not_authenticated | `error="not_authenticated"` when session is null |
| Surfaces DB errors | `error` set from `dbErr.message` |
| Filters by status | All/Pending/In-Progress/Resolved filter chip behavior |
| updateTicket optimistic state update | Status + admin_note updated in local state after `update().eq()` |
| Refresh re-fetches | `getSession` called twice; `refreshing` resets |
| Falls back requester_name to id slice | When join row is null, first 8 chars of `requester_id` used |
| Empty ticket list is valid | Zero tickets, `error=null` |

Run individually: `pnpm test -- useAdminTickets`

---

### Phase 1.9 (cont) — Admin Tenants hook (`packages/core`)

#### `packages/core/src/__tests__/admin/useAdminTenants.test.ts`
Tests `useAdminTenants` (`packages/core/src/admin/useAdminTenants.ts`).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, empty array on mount |
| Loads and maps tenants with room/property names | Nested join resolves `room_name` and `property_name`; null room handled |
| Returns not_authenticated | `error="not_authenticated"` when session is null |
| Surfaces DB errors | `error` set from `dbErr.message` |
| Filters by status | all/active/notice/moved_out chip behavior |
| Filters by query — name match | Case-insensitive substring search on `name` |
| Filters by query — email match | Substring search on `email` |
| Filters by query — phone match | Substring search on `phone` |
| Combines status + query filters | Both predicates applied together |
| Refresh re-fetches | `getSession` called twice; `refreshing` resets |
| Empty array is valid | Zero tenants, `error=null` |

Run individually: `pnpm test -- useAdminTenants`

---

### Phase 1.10 — Property Detail hook (`packages/core`)

#### `packages/core/src/__tests__/properties/usePropertyDetail.test.ts`
Tests `usePropertyDetail` (`packages/core/src/properties/usePropertyDetail.ts`).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, `property=null` before data arrives |
| Loads property with rooms and benefits | Correct name, nested rooms/benefits present |
| Sets activeRoom to first room on load | `activeRoom.id === rooms[0].id` |
| setActiveRoom switches active room | Picker state change reflected |
| Surfaces DB error | `error` set from `dbErr.message` |
| Returns property-not-found error when data is null | `error="Property not found"` when `maybeSingle` returns `null` data |
| Returns error when propertyId is null | `error="No property ID provided"` without any DB call |
| Refresh re-fetches | `from()` called twice |
| Property with no rooms sets activeRoom to null | `activeRoom` stays null when `rooms=[]` |

Run individually: `pnpm test -- usePropertyDetail`

---

### Phase 1.11 — Guest Dashboard hook (`packages/core`)

#### `packages/core/src/__tests__/guest/useGuestDashboard.test.ts`
Tests `useGuestDashboard` (`packages/core/src/guest/useGuestDashboard.ts`).

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true`, empty arrays on mount |
| Loads properties, shortlist, and visit requests | All three parallel queries resolved; `property_name` from join |
| Sets guestId from session | `guestId` matches session user id |
| Returns not_authenticated when session is null | `error="not_authenticated"` |
| Empty shortlist results in empty Set | `shortlisted.size === 0` |
| toggleShortlist adds property when not shortlisted | `insert` called; Set updated |
| toggleShortlist removes property when already shortlisted | `delete` called; Set updated |
| Refresh re-fetches | `getSession` called twice; `refreshing` resets |
| Empty properties and visits are valid | No error on empty data |

Run individually: `pnpm test -- useGuestDashboard`

---

### Phase 1.11 — Visit Request Form hook (`packages/core`)

#### `packages/core/src/__tests__/guest/useVisitRequestForm.test.ts`
Tests `useVisitRequestForm` (`packages/core/src/guest/useVisitRequestForm.ts`).

| Test | What it covers |
|------|---------------|
| Initialises with default empty values | All fields empty, `submitted=false` |
| Blocks submit when propertyId is empty | Error set; `from()` not called |
| Blocks submit when preferredDate is empty | Error set; `from()` not called |
| Inserts with correct payload on valid submit | `insert` called with trimmed fields + `requester_type=guest` |
| Stores null message when message is empty/whitespace | Blank message coerced to `null` in payload |
| Surfaces DB error and keeps submitted=false | Error message shown; `submitted` stays false |
| Loading resets to false after successful submit | Spinner clears |
| Reset restores all fields to defaults | All fields back to empty; `submitted=false` |

Run individually: `pnpm test -- useVisitRequestForm`

---

### Phase 1.12 — Admin Financials hook (`packages/core`)

#### `packages/core/src/__tests__/admin/useAdminFinancials.test.ts`
Tests `useAdminFinancials` (`packages/core/src/admin/useAdminFinancials.ts`).

> Uses `react-native-gifted-charts` (SVG-based, works with Expo Go) for BarChart + PieChart.
> Hook derives all chart data via `useMemo` — tests verify the derived values without needing a chart library.

| Test | What it covers |
|------|---------------|
| Starts in loading state | `loading=true` before data arrives |
| Loads and computes all-time totals | `totalIncome`, `totalExpenses`, `netProfit` summed correctly |
| Builds monthlyPoints for last 6 months | Array of 6 points with `month`, `income`, `expense` |
| Builds categorySlices sorted by total descending | Top category first; `pct` values sum to 100 |
| Builds recentTransactions sorted by date descending | Combined income+expense list, newest first |
| Returns not_authenticated when session is null | `error="not_authenticated"` |
| Surfaces expense DB error | Error from `expenses` table query propagated |
| Handles empty data — zero totals, no crash | All zero, empty arrays, `error=null` |
| Refresh re-fetches | `getSession` called twice; `refreshing` resets |
| netProfit is negative when expenses exceed income | Negative net profit computed correctly |

Run individually: `pnpm test -- useAdminFinancials`

---

### Phase 6 — Aara agent core (`packages/core`)

#### `packages/core/src/__tests__/aara/toolRegistry.test.ts`
Tests role-based tool filtering (`packages/core/src/aara/toolRegistry.ts`).

| Test | What it covers |
|------|---------------|
| guest only sees guest-scoped tools | `filterToolsForRole` excludes tenant/admin-only tools |
| tenant never sees admin-only tools | `update_room_status` filtered out for tenant |
| admin sees everything | All 3 tools returned |
| toGeminiDeclarations strips internals | Only `name`/`description`/`parameters` survive |
| findTool | Finds by name; returns undefined for a tool outside the (already filtered) list |

Run individually: `pnpm test -- toolRegistry`

---

#### `packages/core/src/__tests__/aara/agentLoop.test.ts`
Tests the Gemini function-calling loop (`packages/core/src/aara/agentLoop.ts`) with a mocked `generateContent` transport — no network calls.

| Test | What it covers |
|------|---------------|
| plain text reply | Single `text-delta` + `done`, one model call |
| server tool call → functionResponse round-trip | Tool executed, result fed back, second model call produces final text |
| tenant can never trigger an admin-only tool | Even if the model calls it, loop rejects with an `error` event and never executes |
| client-kind tool call | `navigate`/`app_command` stop the loop as `client-action` without executing |
| tool execution error is caught | Rejected tool promise becomes a `{error}` functionResponse, not a thrown exception |
| max iterations reached | Loop stops after `maxIterations`, surfaces `error` + graceful `done` |
| transport error | A thrown `generateContent` yields a single `error` event |
| onEvent fires in order | Live event callback receives the same sequence as the returned array |

Run individually: `pnpm test -- agentLoop`

This is the only place the agent's role-scoping and tool-calling contract is exercised without hitting the real Gemini API. The web-side wiring (`apps/web/src/lib/aara/{agent,tools,stream}.ts` and `api/chat/route.ts`) is Next.js server code outside the vitest include glob — verify it manually per the checklist below.

**Manual verification — `/api/chat`:**
1. As a guest (no auth header): ask "what properties do you have?" → should call `list_properties` and answer with real data, never mention admin tools.
2. As a signed-in member: ask "what's for lunch today?" and "what tickets have I raised?" → `get_menu` / `get_my_tickets`, scoped to that member's own `requester_id`/`tenant_id` only.
3. As an admin: ask "how many people are having dinner tonight?" → `get_meal_headcount`.
4. Ask an admin-only question while signed in as a member (e.g. "find room 102") → the model should decline; confirm no `find_room` tool call appears server-side and no room data leaks into the reply.
5. Confirm the response streams (Network tab shows `text/event-stream`, chunked) rather than arriving as one blocked JSON payload.
6. Temporarily unset `GEMINI_API_KEY` → confirm the Groq text-only fallback still answers (no tool calls, but a coherent reply).

---

## Running regression tests

Run the full suite before each phase merge to catch regressions:

```bash
pnpm test
```

Expected output: **230 tests** across **28 test files**, all passing.

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

---

## Spring API tests (`apps/api`)

The Spring Boot backend (WhatsApp ticketing/dispatch, FoodHub admin, cook
voice engine) has its own JUnit 5 + Mockito suite, run via Maven — separate
from the Vitest suite above.

```bash
cd apps/api
./mvnw test
```

Expected: **124 tests**, all passing, 0 failures/errors.

| Layer | Pattern | Example |
|---|---|---|
| Controller slices | `@WebMvcTest` + `@Import(SecurityConfig.class)` + `@MockBean RoleService/JwtDecoder` + `jwt()` post-processor | `TicketControllerTest`, every `AdminXController` gets a TENANT→403 / ADMIN→2xx pair |
| Webhook auth | Same, plus a real HMAC computed in-test against a stubbed `WHATSAPP_APP_SECRET` | `WhatsAppWebhookControllerTest` |
| Service/state-machine logic | Plain Mockito, no Spring context | `TicketDispatchServiceTest` (14 tests, full transition matrix), `CookEngineServiceTest` (7 tests, AGREE/REJECT/CONFUSED/menu-swap), `FeedbackAnonymizationServiceTest` (verifies no PII ends up in `external_service_feedback`) |

Run one class: `./mvnw test -Dtest='TicketDispatchServiceTest'`

### Known gap

The outbox claim query (`OutboxProcessor.claimBatch`, `FOR UPDATE SKIP
LOCKED`) is not integration-tested against H2 — H2's locking semantics
don't reliably match Postgres here. Verify it once manually against the
real Supabase DB (see the E2E section below) before relying on multi-instance
Cloud Run concurrency.

---

## Manual verification: meal-skip cutoff trigger (Postgres, not unit-testable)

`enforce_meal_skip_cutoff()` (supabase/migrations/20260709_meal_skip_cutoff.sql)
runs as a Postgres trigger on `meal_skip_requests` — there's no local harness
for it (H2 doesn't run Supabase triggers; MockMvc never touches this table).
The exact cutoff math is unit-tested via its TS mirror
(`packages/core/src/__tests__/food/mealCutoff.test.ts`), but the trigger
itself should be smoke-tested once against the real Supabase DB after
applying the migration:

```sql
-- As a signed-in member (RLS applies, auth.uid() is set) — should FAIL past cutoff:
insert into meal_skip_requests (tenant_id, skip_date, meal_block)
values (auth.uid(), current_date, 'Lunch');
-- Expect: ERROR: MEAL_SKIP_CUTOFF_PASSED: ... (if run after 5:00 AM IST today)

-- Same insert for TOMORROW's Lunch — should SUCCEED (cutoff hasn't arrived yet):
insert into meal_skip_requests (tenant_id, skip_date, meal_block)
values (auth.uid(), current_date + 1, 'Lunch');

-- As service role (bypasses RLS, auth.uid() IS NULL) — should SUCCEED regardless of time:
-- (run with the service-role key, e.g. via supabaseAdmin or Spring JDBC)
insert into meal_skip_requests (tenant_id, skip_date, meal_block)
values ('<any-tenant-uuid>', current_date, 'Lunch');

-- As an admin (auth_is_admin() true) — should SUCCEED regardless of time.
```

Also confirm from the UI: attempt to skip a meal in `apps/web/src/app/tenant/components/MealsTab.tsx`
after that meal's cutoff has passed (button should already be disabled
client-side per `isMealLocked`, but the trigger is the real guarantee against
a direct API call or a second tab with stale state).

---

## WhatsApp / cook engine manual E2E

These exercise the full webhook → outbox → handler path against a local
`./mvnw spring-boot:run` instance. Requires `WHATSAPP_APP_SECRET` and
`TASKS_SECRET` set in your local env (any value — they just need to match
what you sign with below; `WHATSAPP_ENABLED=false` is fine, sends will
no-op and log instead of hitting Meta).

### 1. Sign and send a webhook payload

```bash
export WHATSAPP_APP_SECRET=test-secret
export TASKS_SECRET=test-tasks-secret
BODY='{"object":"whatsapp_business_account","entry":[{"id":"waba-1","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","messages":[{"from":"+919876543210","id":"wamid.TEST1","timestamp":"1","type":"text","text":{"body":"hi"}}]}}]}]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" -r | cut -d' ' -f1)

curl -i -X POST http://localhost:8080/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIG" \
  -d "$BODY"
```

Expect `200 OK` immediately (the handler only verifies, dedupes by `wamid`,
and enqueues — nothing is processed inline). Sending the exact same body
again should still return `200` but must NOT create a second `wa_messages`
row (dedupe check).

### 2. Drain the outbox

```bash
curl -i -X POST http://localhost:8080/api/internal/tasks/process-outbox \
  -H "X-Tasks-Secret: $TASKS_SECRET"
```

Response body reports how many events were processed; check application
logs for the routed outcome (unknown-actor reply, cook engine turn, dispatch
button handling, etc. depending on what you sent).

### 3. Simulate a professional accepting a dispatch offer

Same signing pattern as step 1, with a `button_reply` payload:

```json
{"messages":[{"from":"+91<pro-phone>","id":"wamid.TEST2","type":"interactive","interactive":{"type":"button_reply","button_reply":{"id":"offer:<offerId>:slot:s1","title":"Today 2-4 PM"}}}]}
```

Wrap it in the same `object`/`entry`/`changes`/`value` envelope as step 1,
sign, POST, then drain the outbox. Verify in the DB: the matching
`dispatch_offers` row is `ACCEPTED`, sibling offers `RESCINDED`, and
`ticket_dispatches.status = 'PENDING_CONFIRMATION'`.

### 4. Simulate a feedback Flow submission

```json
{"messages":[{"from":"+91<tenant-phone>","id":"wamid.TEST3","type":"interactive","interactive":{"type":"nfm_reply","nfm_reply":{"name":"feedback_form","body":"Submitted","response_json":"{\"flow_token\":\"<token>\",\"service_used\":\"Urban Company\",\"cost_score\":\"3\",\"speed_score\":\"2\",\"consent\":[\"granted\"]}"}}}]}
```

After draining the outbox, confirm anonymization: the new
`external_service_feedback` row has no ticket/user/phone column at all
(the table doesn't have one), and every `wa_messages` row for that ticket
now has `payload IS NULL` and `phone_e164 IS NULL`:

```sql
SELECT payload, phone_e164, purged_at FROM wa_messages WHERE ticket_id = '<ticket-id>';
-- expect: payload=NULL, phone_e164=NULL, purged_at set, for every row
```

### 5. Run the timer sweep (offer/confirmation/feedback-token expiry)

```bash
curl -i -X POST http://localhost:8080/api/internal/tasks/run-timers \
  -H "X-Tasks-Secret: $TASKS_SECRET"
```

### Web ↔ local Spring

```bash
# terminal 1
cd apps/api && ./mvnw spring-boot:run   # CORS_ORIGINS=http://localhost:3000

# terminal 2
NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm --filter web dev
```

Sign in as the root admin, open **Kitchen Hub** — the Weekly Plan, Day
Builder, Reorder List, Suggestions, Pantry, and Dish Catalog tabs should
all hit `localhost:8080/api/admin/...` with a bearer token (check the
Network tab). **Alexa Log** stays on direct Supabase reads by design (see
plan). **Service Desk** (`/admin/tickets`) shows the ticket metrics strip,
external-feedback metrics, and the Dispatch modal.
5. Run `pnpm test` — new tests are picked up automatically.
