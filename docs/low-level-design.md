# AaramSmartHomes — Low-Level Design Document (LLD)

> Version 0.1.0 | May 2026  
> For: Developers onboarding to the project

---

## 1. Project Structure

```
AaramSmartHomes/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── page.tsx                  # Landing page (/)
│   │   ├── layout.tsx                # Root layout (AuthProvider, AaraChatbot)
│   │   ├── globals.css               # Global CSS design tokens
│   │   ├── admin/                    # Admin console routes
│   │   │   ├── page.tsx              # Admin dashboard (/admin)
│   │   │   ├── tenants/page.tsx      # Tenant management
│   │   │   ├── occupancy/page.tsx    # Room occupancy management
│   │   │   ├── financials/page.tsx   # Income & expense tracking
│   │   │   ├── tickets/page.tsx      # Support tickets
│   │   │   ├── iot/page.tsx          # Water level IoT
│   │   │   ├── calendar/page.tsx     # Move-out calendar
│   │   │   └── properties/manage/page.tsx  # Property CRUD
│   │   ├── food-hub/                 # Aaram Food Hub Ecosystem
│   │   │   └── page.tsx              # Marketplace, Menu & Subscriptions
│   │   ├── food-dashboard/           # Food & Pantry Admin Dashboard
│   │   │   └── page.tsx
│   │   ├── tenant/page.tsx           # Tenant portal (/tenant)
│   │   ├── onboarding/page.tsx       # Tenant onboarding wizard
│   │   ├── properties/
│   │   │   ├── page.tsx              # Property catalog
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Server component + generateStaticParams
│   │   │       └── PropertyDetailClient.tsx  # Client component (detail view)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── adminLogin/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── auth/callback/page.tsx    # Client-side OAuth callback handler
│   │   └── api/
│   │       └── chat/route.ts         # Aara AI API endpoint (POST /api/chat)
│   ├── components/
│   │   ├── AaraChatbot.tsx           # Floating AI assistant widget
│   │   ├── AaraFABIcon.tsx           # Animated FAB icon for chatbot
│   │   └── layout/
│   │       ├── AdminLayout.tsx       # Admin shell (auth guard + sidebar + header)
│   │       └── Sidebar.tsx           # Admin navigation sidebar
│   ├── context/
│   │   └── AuthContext.tsx           # React Context for Supabase auth state
│   ├── hooks/
│   │   └── useAaraCommands.ts        # Cross-page AI command event bus hook
│   └── lib/
│       ├── supabase.ts               # Supabase client singleton
│       ├── types.ts                  # Shared TypeScript type definitions
│       ├── utils.ts                  # cn() utility (clsx + tailwind-merge)
│       └── mockData.ts               # Mock data for IoT page development
├── public/
│   └── images/                       # Static images + WEBP variants
├── android/                          # Capacitor Android project
├── docs/                             # Documentation (this directory)
├── next.config.ts                    # Next.js config (static export + image optimizer)
├── capacitor.config.ts               # Capacitor config
├── package.json
└── tsconfig.json
```

---

## 2. Core Abstractions

### 2.1 Supabase Client (`src/lib/supabase.ts`)
```typescript
// Single client instance — import everywhere
import { supabase } from '@/lib/supabase';

// Usage patterns:
const { data, error } = await supabase.from('table').select('*');
const { data } = await supabase.from('table').insert({ ... });
const { error } = await supabase.from('table').update({ ... }).eq('id', id);
```
> **⚠️ Note**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` — all queries are governed by Supabase Row-Level Security policies.

### 2.2 Auth Context (`src/context/AuthContext.tsx`)
```typescript
// Wraps the entire app in layout.tsx
import { useAuth } from '@/context/AuthContext';

const { user, session, loading, signOut } = useAuth();
// user: Supabase User object | null
// loading: boolean (true during initial session check)
// signOut: async function → supabase.auth.signOut()
```
- Listens to `supabase.auth.onAuthStateChange` for real-time session updates
- **Always check `loading` before redirecting** — redirecting while loading=true causes flashes

### 2.3 Types (`src/lib/types.ts`)

Key types to understand:

```typescript
type Property = {
  id: string;
  name: string;
  location: string;
  total_rooms: number;
  property_type: 'Villa' | 'Flat' | 'Individual House' | 'Other';
  image_url?: string;
  rooms?: Room[];
  benefits?: Benefit[];
  automation?: AutomationSystem[];
};

type Room = {
  id: string;
  name: string;          // e.g., "Master Bedroom"
  type: string;          // e.g., "Master Suite"
  sqft?: number;
  features: string[];
  image_urls?: string[];  // Multiple images per room
};

type Unit = {
  id: string;
  property_id: string;
  room_number: string;
  status: 'Vacant' | 'Occupied' | 'Maintenance' | 'Notice Period';
  current_tenant_id?: string;
  lease_end_date?: string;
};

type Tenant = {
  id: string;            // Same as Supabase auth user UUID
  name: string;
  email: string;
  room_id?: string;      // The unit/room they occupy
  status: 'active' | 'notice' | 'moved_out' | 'guest';
  food_opted?: boolean;
  meal_plan?: '2_meals' | '3_meals' | 'none';
  shortlisted_property_ids?: string[];
  // ... profile fields
};

type Ticket = {
  id: string;
  tenant_id: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In-Progress' | 'Resolved';
  description: string;
  created_at: string;
};
```

### 2.4 Utilities (`src/lib/utils.ts`)
```typescript
import { cn } from '@/lib/utils';

// Merges Tailwind classes conditionally
cn("base-class", condition && "conditional-class", "another-class")
```

---

## 3. CSS Design System (`src/app/globals.css`)

The project uses a **custom neumorphic/glassmorphism design system** via CSS custom properties and utility classes. These are the core design tokens:

### Color Tokens
```css
:root {
  --background: /* off-white warm */
  --foreground: /* dark slate */
  --primary:    /* terracotta/rust */
  --secondary:  /* sage green */
  --accent:     /* warm sand */
}
```

### Key Utility Classes
| Class | Description |
|-------|-------------|
| `soft-card` | Neumorphic card with border and shadow |
| `soft-button` | Neumorphic button (inset shadow) |
| `soft-well` | Inset well / pressed surface |
| `soft-ui-in` | Inset soft-UI effect |
| `soft-ui-out` | Raised soft-UI effect |
| `btn-terracotta` | Primary CTA button (rust/terracotta) |
| `sage-badge` | Status badge (green) |
| `tab-user` | Tab navigation button |
| `tab-user.active` | Active tab state |
| `animate-float` | Floating animation (CSS keyframes) |
| `no-scrollbar` | Hide scrollbar utility |

> **Key principle**: Never use ad-hoc Tailwind for component-level styling. Always extend the design system with named classes.

---

## 4. Route-by-Route Implementation Guide

### 4.1 `/` — Landing Page (`src/app/page.tsx`)
- **Type**: `'use client'` 
- **Data**: Fetches `properties` + `rooms` + `benefits` from Supabase on mount
- **State**: `properties[]`, `activeProperty`, `activeRoom`, `currentImgIdx`
- **Images**: `ExportedImage` from `next-image-export-optimizer`
- **Key interactions**:
  - Property selector → updates `activeProperty` + fetches rooms
  - Room tab → updates `activeRoom`
  - Image slider → updates `currentImgIdx`

### 4.2 `/properties/[id]` — Property Detail (Dynamic Route)

**Server component** (`page.tsx`):
```typescript
// REQUIRED for static export
export async function generateStaticParams() {
  const { data: properties } = await supabase.from('properties').select('id');
  return properties?.map((p) => ({ id: p.id })) || [];
}

export default async function PropertyDetailPage({ params }) {
  // Fetch initial data server-side
  const { data: property } = await supabase
    .from('properties')
    .select('*, rooms(*), benefits(*), automation_systems(*)')
    .eq('id', id)
    .single();
  return <PropertyDetailClient initialProperty={property} />;
}
```

**Client component** (`PropertyDetailClient.tsx`):
- Receives `initialProperty` prop for immediate render
- Falls back to client-side fetch if `initialProperty` is null
- Handles room selection, image sliding, admin edit link

### 4.3 `/tenant` — Tenant Portal

**Structure**: Single-page app with tab navigation
```typescript
type Tab = 'explore' | 'home' | 'meals' | 'finance' | 'support' | 'referrals';
```

**Data loading sequence** (`fetchProfileAndData`):
1. Fetch tenant profile from `tenants` table by `user.id`
2. If no profile → set as guest, switch to 'explore' tab
3. If has `room_id` → fetch unit details from `units`
4. Fetch all `properties` for guest shortlist

**Payment flow**:
```typescript
// Modal state
const [activePayment, setActivePayment] = useState<{
  type: 'rent' | 'utility' | 'food',
  amount: number
} | null>(null);

// Record payment
const recordPayment = async (type, amount, method) => {
  await supabase.from('payments').insert({
    tenant_id: user.id,
    amount,
    type,
    status: 'completed',
    transaction_ref: `${method}-${randomRef}`
  });
};
```

### 4.4 `/onboarding` — Onboarding Wizard

**Steps**:
```typescript
type Step = 'identity' | 'verification' | 'residency' | 'addons' | 'complete';
```

**Vacancy fetch** (step: residency):
```typescript
const { data } = await supabase
  .from('units')
  .select('*, properties(name)')
  .eq('status', 'Vacant');
```

**Completion logic**:
```typescript
// Upsert tenant profile
await supabase.from('tenants').upsert({ id: user.id, ...formData });
// Mark unit as Occupied
await supabase.from('units').update({ status: 'Occupied', current_tenant_id: user.id })
  .eq('id', formData.roomId);
```

### 4.5 `/admin` — Admin Dashboard

**Real-time setup**:
```typescript
// Supabase Realtime
const channel = supabase.channel('tickets-all')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, 
      () => fetchDashboardData())
  .subscribe();

// Polling fallback
const pollId = setInterval(() => fetchDashboardData(), 60000);

// Cleanup (important!)
return () => {
  supabase.removeChannel(channel);
  clearInterval(pollId);
};
```

**Revenue calculation**:
```typescript
const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"
const { data } = await supabase.from('income_records')
  .select('amount')
  .gte('income_date', `${currentMonth}-01`)
  .lte('income_date', `${currentMonth}-31`);
const revenue = data.reduce((acc, curr) => acc + curr.amount, 0);
```

### 4.6.5 `/food-hub` — Aaram Food Hub
- **Marketplace Logic**: Fetches `food_menu` items grouped by `meal_type`.
- **Wallet Integration**: `AaramFoodWallet` component manages virtual balance for food transactions.
- **Subscription State**: Uses `tenants` profile to track `meal_plan` and `food_service_start_date`.
- **AI Concierge**: Integrates `AaraChatbot` with domain-specific prompts for food recommendations.
- **Real-time Menu**: Updates based on day of week via `date-fns` `getDay()`.

**Expense categories** (defined in `CATEGORY_META`):
```typescript
type ExpenseCategory = 
  'rent' | 'maintenance' | 'electricity' | 'gas' | 'wifi' |
  'maid' | 'furniture' | 'smart_devices' | 'organic_nature' | 
  'utilities' | 'other' | 'custom';
```

**Month navigation pattern**:
```typescript
// selectedMonth is "YYYY-MM-DD" (first day of month)
const [selectedMonth, setSelectedMonth] = useState(getFirstDayOfMonth(new Date()));

// Fetch for selected month
const { data } = await supabase.from('expenses')
  .select('*')
  .gte('expense_date', selectedMonth)
  .lte('expense_date', lastDayOfMonth);
```

**Charts**: Uses `recharts` — `PieChart` for expense breakdown, `BarChart` for income vs. expense trend.

### 4.7 `/api/chat` — Aara AI API

**Request schema**:
```typescript
POST /api/chat
{
  message: string,
  history: { role: 'user' | 'assistant', text: string }[],
  context: {
    properties: Property[],
    admin_data: { properties, rooms, tickets } | null,
    user_id: string,
    user_email: string,
    role: 'guest' | 'tenant' | 'admin'
  }
}
```

**Response schema**:
```typescript
{
  reply: string,          // Human-readable response
  action: string | null,  // 'navigate' | 'ticket_created' | 'data_entry' | etc.
  data: object | null,    // Action-specific payload
  debug: string           // 'used_gemini' | 'used_groq_fallback'
}
```

**AI provider failover**:
```typescript
try {
  rawReply = await callGemini(history, enrichedMessage);
} catch (err) {
  if (GROQ_API_KEY) rawReply = await callGroq(history, enrichedMessage);
  else throw err;
}
```

**Action parsing** (robust, handles JSON in code fences):
```typescript
// 1. Try ```json ... ``` fence
const fenceMatch = rawReply.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
// 2. Try inline JSON object
const jsonMatch = rawReply.match(/\{[\s\S]*"action"[\s\S]*\}/);
```

---

## 5. `useAaraCommands` Hook — Cross-Page Integration

### Pattern
```typescript
// In any page component:
import { useAaraCommands } from '@/hooks/useAaraCommands';

useAaraCommands({
  SELECT_ROOM: (data) => {
    const room = rooms.find(r => r.id === data.id);
    setSelectedRoom(room);
  },
  FILTER_TICKETS: (data) => {
    setFilterStatus(data.status);
  },
  SHOW_METRIC: (data) => {
    document.getElementById(`stat-${data.label}`)?.scrollIntoView();
  }
});
```

### How it Works
1. `AaraChatbot` calls `dispatchAaraCommand(action, data)` → fires `CustomEvent('AARA_APP_COMMAND')`
2. If navigating first: saves to `sessionStorage.AARA_PENDING_COMMAND`
3. Target page mounts → `useAaraCommands` hook checks `sessionStorage` → replays the command after 800ms delay (allows page to render first)

### Adding a New Command
1. Define in the target page's `useAaraCommands` call
2. Update `SYSTEM_PROMPT` in `/api/chat/route.ts` with the new command syntax
3. Handle in `AaraChatbot.tsx` if it needs client-side behavior beyond routing

---

## 6. Adding New Features — Patterns

### 6.1 Adding a New Admin Page

1. Create `src/app/admin/new-feature/page.tsx`
2. Wrap with `AdminLayout`:
   ```typescript
   import { AdminLayout } from '@/components/layout/AdminLayout';
   export default function NewPage() {
     return <AdminLayout title="New Feature">
       {/* content */}
     </AdminLayout>;
   }
   ```
3. Add to sidebar in `src/components/layout/Sidebar.tsx`:
   ```typescript
   { icon: SomeIcon, label: 'New Feature', href: '/admin/new-feature' }
   ```
4. Optionally add `useAaraCommands` hook for AI integration
5. Update AI `SYSTEM_PROMPT` with navigation mapping

### 6.2 Adding a New Tenant Tab

1. Add tab value to the union type:
   ```typescript
   useState<'explore' | 'home' | 'meals' | 'finance' | 'support' | 'referrals' | 'new-tab'>
   ```
2. Add button in the tab bar JSX
3. Add `{activeTab === 'new-tab' && <motion.div>...</motion.div>}` section

### 6.3 Adding a New Database Table

1. Create table in Supabase dashboard with appropriate RLS policies
2. Add TypeScript type in `src/lib/types.ts`
3. Add queries where needed using the `supabase` client

### 6.4 Adding a New Aara AI Action

1. Define the action in `SYSTEM_PROMPT` in `/api/chat/route.ts`
2. Add the handler case in the `POST` function:
   ```typescript
   if (parsed?.action === 'new_action' && userRole === 'admin') {
     // Execute DB operation
     return NextResponse.json({ reply: humanReply, action: 'new_action', data: parsed });
   }
   ```
3. Handle the response in `AaraChatbot.tsx` `sendMessage` function

---

## 7. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# AI Providers (server-side only — not NEXT_PUBLIC)
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
```

> **⚠️ Security**: `GEMINI_API_KEY` and `GROQ_API_KEY` must NOT have the `NEXT_PUBLIC_` prefix — they are only used in `/api/chat/route.ts` (server-side). Never expose these to the browser.

---

## 8. Build & Run Commands

```bash
# Development
npm run dev                  # Start local dev server (http://localhost:3000)

# Production (Web)
npm run build                # Next.js production build

# Production (Android)
npm run export               # Static export + image optimization → out/
npx cap sync android         # Sync out/ to Android project
npx cap open android         # Open Android Studio

# Linting
npm run lint                 # ESLint check

# Port management (kill if stuck)
lsof -ti :3000 | xargs kill  # Kill anything on port 3000
```

---

## 9. Static Export Constraints & Rules

Since `output: "export"` is enabled in `next.config.ts`, these rules apply:

| Constraint | Solution Used |
|-----------|--------------|
| Dynamic routes need pre-rendering | `generateStaticParams()` in `properties/[id]/page.tsx` |
| Server-side route handlers (`route.ts`) cannot use `request.url` | Converted auth callback to client-side `page.tsx` |
| Server Components can fetch from Supabase at build time | Used for initial property data in `properties/[id]/page.tsx` |
| `/api/chat` is dynamic and excluded from export | Works in dev/web; not available in Android app (requires live server) |

> **⚠️ Important for Android**: The Aara chatbot's `/api/chat` endpoint requires a live Next.js server. In the Android APK (pure static export), the chatbot will fail unless the `server.url` in `capacitor.config.ts` points to a live API server. Consider deploying the API separately or using `capacitor.config.ts` `server.url` to point at a hosted URL.

---

## 10. Known Code Smells & Tech Debt

| Item | Location | Issue | Recommended Fix |
|------|----------|-------|----------------|
| `alert()` for ticket submission | `tenant/page.tsx` line ~358 | Basic native alert | Replace with toast/modal |
| `alert()` for move-out request | `tenant/page.tsx` line ~374 | Basic native alert | Replace with toast/modal |
| `prompt()` for meal suggestions | `tenant/page.tsx` line ~404 | Basic browser prompt | Replace with modal |
| Hardcoded room features | `tenant/page.tsx` line ~659 | Static array, not from DB | Fetch from `rooms.features` |
| Hardcoded financial figures | `tenant/page.tsx` lines ~698–716 | Mocked ₹24,500, ₹22,000 etc. | Fetch from `payments`/`income_records` |
| Mock data in IoT page | `admin/iot/page.tsx` | `mockProperties`, `mockWaterLogs` | Replace with Supabase live data |
| Admin check via email string | `AdminLayout.tsx` line ~32 | `email.includes('admin')` is weak | Use only `admins` table lookup |
| `console.log` Auth Debug | `AdminLayout.tsx` lines ~34, 55 | Debug logs in production | Remove before production deploy |
| Duplicate `callGemini` function | `api/chat/route.ts` | Defined twice (outer + inner) | Remove outer definition |
| `any` types in chatbot | `AaraChatbot.tsx` | `useState<any[]>`, etc. | Type with proper interfaces |
| Root email hardcode | `AdminLayout.tsx` line ~15 | `kirtimayaswain@gmail.com` in code | Move to `NEXT_PUBLIC_ROOT_EMAIL` env var |

---

## 11. Supabase Table Reference (Quick Lookup)

```sql
-- Core tables and their key columns
properties (id, name, location, total_rooms, property_type, image_url, description)
rooms      (id, property_id, name, type, sqft, features[], image_urls[], sort_order)
units      (id, property_id, room_number, status, current_tenant_id, lease_end_date)
tenants    (id, name, email, phone, room_id, status, move_in_date, food_opted, meal_plan, occupation, company, address, referral_code)
admins     (id, email)

-- Support
tickets    (id, tenant_id, title, category, priority, status, description, image_url, created_at)
move_out_requests (id, tenant_id, requested_date, status)

-- Financial
payments       (id, tenant_id, amount, type, status, transaction_ref, created_at)
income_records (id, room_id, amount, income_type, category, income_date, note)
expenses       (id, label, amount, category, property_id, room_ids[], expense_date, note)

-- IoT
water_logs (id, property_id, level_percentage, timestamp)

-- Food
food_menu        (id, day_of_week, meal_type, items[])
meal_suggestions (id, tenant_id, item_name, status)

-- Property extras
benefits          (id, property_id, name, icon, description, image_url)
automation_systems (id, property_id, name, type, status, description, image_url)
```

---

## 12. Developer Onboarding Checklist

```
[ ] Clone repo and run `npm install` (or `pnpm install`)
[ ] Copy .env.local.example to .env.local and fill in credentials
[ ] Run `npm run dev` and verify http://localhost:3000 loads
[ ] Log in as admin (kirtimayaswain@gmail.com or an email in `admins` table)
[ ] Verify admin console at /admin loads with data
[ ] Log in as a tenant (any non-admin email in `tenants` table)
[ ] Verify tenant portal at /tenant loads with the correct user
[ ] Test the Aara chatbot (floating icon) as both guest and admin
[ ] Run `npm run export` to verify the static export builds without errors
[ ] Run `npx cap sync android` to verify Android sync
[ ] Review the `admins` table in Supabase to understand who has admin access
[ ] Review Supabase RLS policies to understand data access boundaries
```
