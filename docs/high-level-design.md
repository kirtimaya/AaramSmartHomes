# AaramSmartHomes — High-Level Design Document (HLD)

> Version 0.1.0 | May 2026

---

## 1. System Purpose

AaramSmartHomes is a **full-stack co-living property management system** that unifies the experience of three stakeholders:

1. **Prospective Tenants (Guests)** — browse properties, shortlist, schedule visits
2. **Active Residents (Tenants)** — manage payments, meals, support tickets, move-out requests
3. **Property Managers (Admins)** — manage properties, occupancy, finances, IoT, and tenant relations

The system is delivered as a **responsive web application** that is also packaged as an **Android native app** using Capacitor.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│               CLIENT TIER (Browser/App)          │
│  ┌──────────────────────────────────────────┐   │
│  │         Next.js 16 (App Router)          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐  │   │
│  │  │ Public   │ │ Tenant   │ │  Admin  │  │   │
│  │  │  Pages   │ │  Portal  │ │ Console │  │   │
│  │  └──────────┘ └──────────┘ └─────────┘  │   │
│  │  ┌────────────────────────────────────┐  │   │
│  │  │    Aara AI Chatbot (floating)      │  │   │
│  │  └────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        │ HTTPS / Supabase Client
                        ▼
┌─────────────────────────────────────────────────┐
│               BACKEND TIER (Supabase)            │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  PostgreSQL  │  │   Supabase Auth          │ │
│  │  Database    │  │ (Email/Password + Magic)  │ │
│  └──────────────┘  └──────────────────────────┘ │
│  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Supabase    │  │   Supabase Storage       │ │
│  │  Realtime    │  │   (Image uploads)        │ │
│  └──────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────┘
                        │
                        │ REST / SDK calls
                        ▼
┌─────────────────────────────────────────────────┐
│               AI TIER                            │
│  ┌──────────────────┐  ┌───────────────────┐   │
│  │  Google Gemini   │  │  Groq (LLaMA 70B)  │   │
│  │  2.0 Flash Lite  │  │  (Fallback)        │   │
│  └──────────────────┘  └───────────────────┘   │
│                 via /api/chat route              │
└─────────────────────────────────────────────────┘
                        │
                        │ Capacitor Bridge
                        ▼
┌─────────────────────────────────────────────────┐
│               MOBILE TIER (Android)              │
│   Capacitor v8 wrapping the exported Next.js     │
│   static build as a WebView application          │
└─────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Frontend Framework | Next.js | 16.1.6 | App Router, SSG/ISR, API routes |
| UI Language | React | 19.2.3 | Component model |
| Language | TypeScript | ^5 | Type safety |
| Styling | TailwindCSS | ^4 | Utility-first CSS |
| Animation | Framer Motion | ^12 | Page transitions, micro-animations |
| Icons | Lucide React | ^0.577 | Icon library |
| Charts | Recharts | ^3 | Financial data visualization |
| Date Utilities | date-fns | ^4 | Date formatting and manipulation |
| Backend / DB | Supabase | ^2.99 | PostgreSQL + Auth + Realtime + Storage |
| AI (Primary) | Google Gemini 2.0 Flash Lite | — | Natural language processing |
| AI (Fallback) | Groq / LLaMA 3.3 70B | — | Fallback AI provider |
| Mobile | Capacitor | v8 | Android/iOS native wrapper |
| Image Optimization | next-image-export-optimizer | ^1.20 | Static export image optimization |
| CSS Utilities | clsx + tailwind-merge | — | Conditional class merging |

---

## 4. Application Modules

### 4.1 Authentication Module
- Provider: Supabase Auth (email/password + magic link)
- Client-side session management via `AuthContext` (React Context + Supabase `onAuthStateChange`)
- **Admin access**: Email verified against `admins` table OR root email bypass (`kirtimayaswain@gmail.com`)
- Auth callbacks handled client-side at `/auth/callback`

### 4.2 Public Module
- Routes: `/`, `/properties`, `/properties/[id]`
- Pre-rendered via `generateStaticParams` for static export compatibility
- Data fetched client-side from Supabase on mount

### 4.3 Tenant Portal Module
- Route: `/tenant`
- Protected: Redirects to `/login` if unauthenticated
- Dynamic experience based on tenant status (guest vs. active)
- Tabs: Home, Finance, Meals, Support, Refer & Earn
- Integrates with: `tenants`, `units`, `payments`, `tickets`, `food_menu`, `move_out_requests` tables

### 4.4 Onboarding Module
- Route: `/onboarding`
- 5-step wizard for first-time resident setup
- Live vacancy check from `units` table

### 4.5 Admin Console Module
- Routes: `/admin/*`
- Protected by `AdminLayout` (role check against `admins` table)
- Sub-modules: Dashboard, Tenants, Occupancy, Financials, Tickets, IoT, Calendar, Properties
- Real-time data via Supabase Realtime subscriptions + 60s polling

### 4.6 AI Module
- Route: `/api/chat` (Next.js API Route — dynamic, excluded from static export)
- Dual-provider: Gemini primary → Groq fallback
- Role-injected context: guest / tenant / admin
- Executes real DB mutations for admin actions
- Client-side: `AaraChatbot` component with voice I/O, drag-and-drop, pin feature
- Cross-page commands via `useAaraCommands` hook + `CustomEvent` bus

### 4.9 Food Hub & Ecosystem (`/food-hub`)
- **Aaram Food Hub**: A centralized marketplace for culinary discovery and subscription management.
- **Aaram Food Wallet**: Integrated digital wallet for per-meal transactions and subscription auto-renewals.
- **Interactive Menu Explorer**: Visual-first menu browsing with category-based filtering.
- **Aara Food Intelligence**: Culinary AI concierge for menu inquiries, recommendations, and feedback.
- **Weekly food menu**: Weekly view with current day highlighting.
- **Admin-mode pantry monitoring**: Inventory tracking and essential reminders (Grocery list management).
- **Integrated food expense ledger**: Budget tracking and pie chart visualization for food operations.

---

## 5. Data Flow

### 5.1 Tenant Payment Flow
```
Tenant clicks "Pay Rent"
    → PaymentModal opens (Gateway / Screenshot / Cash)
    → On confirm: POST to supabase.payments
    → If food payment: updates tenants.food_opted, meal_plan, food_service_start_date
    → fetchProfileAndData() refresh
```

### 5.2 Admin Real-time Dashboard Flow
```
Admin loads /admin
    → fetchDashboardData() fetches properties, units, tickets, water_logs, income_records
    → Supabase Realtime subscription on 'tickets' and 'water_logs'
    → Any DB change → fetchDashboardData() triggered
    → 60s interval poll as backup
```

### 5.3 Aara AI Flow
```
User sends message
    → AaraChatbot sends POST /api/chat with: message, history, context{role, properties, admin_data}
    → API enriches message with live DB context
    → Calls Gemini (primary) or Groq (fallback)
    → Parses JSON action from AI response
    → Executes DB mutation if applicable (ticket, finance, room status)
    → Returns { reply, action, data } to frontend
    → Frontend displays reply + ActionBadge
    → If action = navigate: router.push(path)
    → If action = app_command: dispatchAaraCommand() via CustomEvent
    → Target page listens via useAaraCommands hook
```

---

## 6. Security Design

### 6.1 Admin Access Control
- `AdminLayout` component enforces access on every admin route
- Three-tier verification:
  1. Root email hardcode bypass (`kirtimayaswain@gmail.com`)
  2. Email contains 'admin'
  3. Email exists in `admins` table (DB lookup)
- Non-admin users see an "Access Restricted" screen with diagnostic info

### 6.2 AI Security
- Role gate enforced at API level — JSON not exposed to guests/tenants
- Admin mutations only execute when `userRole === 'admin'`
- Role passed from authenticated session, not client-controlled

### 6.3 Supabase RLS
- Row-Level Security policies on Supabase tables
- Tenants can only read/write their own data

---

## 7. Deployment Architecture

### 7.1 Web Deployment
- Targeted for Vercel (Next.js native hosting)
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`

### 7.2 Android Deployment
```
npm run export         # Next.js build + image optimization → out/
npx cap sync android   # Copy out/ to android/app/src/main/assets/public
npx cap open android   # Open Android Studio for APK build / Play Store
```
- Capacitor serves the static export as a WebView
- `androidScheme: 'https'` ensures secure context APIs (camera, microphone) work

### 7.3 Static Export Constraints
- Pages with dynamic routes (`/properties/[id]`) must use `generateStaticParams`
- Server-side route handlers (like auth callbacks) must be converted to client-side pages
- API routes (`/api/chat`) remain dynamic and are NOT included in the static export (used only via live web/dev server)

---

## 8. Performance Considerations

| Area | Strategy |
|------|---------|
| Image serving | WEBP via next-image-export-optimizer, 17 size breakpoints |
| Real-time updates | Supabase Realtime subscriptions (push vs. poll) |
| Polling fallback | 60s interval on admin dashboard |
| Animations | Framer Motion with `AnimatePresence` for smooth transitions |
| Data fetching | Client-side per route, no server components (for static export compat) |
| AI latency | ~1–3s (Gemini), ~0.5–1.5s (Groq fallback) |

---

## 9. Known Limitations & Future Work

| Area | Current State | Suggested Improvement |
|------|-------------|----------------------|
| IoT Dashboard | Uses mock data + simulated levels | Connect real IoT sensor APIs |
| Payment Gateway | Placeholder "AaramPay" | Integrate Razorpay / PhonePe |
| Meal Suggestions | Basic prompt() dialog | Replace with proper modal UI |
| Move-out Ticket | alert() feedback | Rich notification / in-app toast |
| iOS Support | Capacitor iOS installed but untested | Test and configure iOS build |
| Admin: Water Logs | Only last reading per property | Time-series chart from real logs |
| Referral System | UI stub, no backend | Implement referral code generation + tracking |
| Push Notifications | Not implemented | Capacitor Push Notifications plugin |
| Offline Support | None | Capacitor Network plugin + local caching |
