# AaramSmartHomes — Feature Documentation

> Last updated: May 2026 | Version 0.1.0

---

## Overview

**AaramSmartHomes** is a full-stack property management platform (web + Android) for co-living and managed residential properties. It serves three distinct user roles:

| Role | Portal Entry | Description |
|------|-------------|-------------|
| **Guest / Prospective Tenant** | `/` (landing) | Browses available properties, shortlists them |
| **Tenant / Resident** | `/tenant` | Manages their residency — payments, meals, support |
| **Admin / Property Manager** | `/admin` | Manages all properties, residents, finances, IoT |

---

## 1. Public-Facing Features

### 1.1 Landing Page (`/`)
- Hero section with property imagery and call-to-action
- "Our Spaces" section dynamically loaded from Supabase (properties + rooms)
- Curated amenities showcase (Pool, Gym, Badminton Court) with images
- Navigation links to Find a Home, Spaces, and Amenities
- Sign In button for tenants

### 1.2 Property Catalog (`/properties`)
- Filterable grid of all properties by type: **All**, **Villa**, **Flat**, **Individual House**
- Each card shows: Property name, location, room count, and property type badge
- Animated cards using Framer Motion
- Real-time data from Supabase

### 1.3 Property Detail View (`/properties/[id]`)
- Full-screen property hero image
- Key stats: Property type, IoT tier, Certification status
- **Room Explorer**: Tab-based room selector with image slider (multiple images per room)
- Room-level details: sqft, room type, feature list
- Benefits/Amenities section with images
- "Request Allocation" CTA

### 1.4 Authentication Flow
- **Sign Up** (`/signup`): Email + password + full name
- **Login** (`/login`): Email + password with magic link support
- **Forgot Password** (`/forgot-password`): Email-based reset
- **Reset Password** (`/reset-password`): Confirms new password via token
- **Auth Callback** (`/auth/callback`): Client-side handler for Supabase OAuth redirect
- **Admin Login** (`/adminLogin`): Separate login gate for admin access

---

## 2. Tenant / Resident Portal (`/tenant`)

A unified dashboard with tab-based navigation. The experience adapts based on whether the user is an **Active Tenant** or **Guest** (not yet onboarded).

### 2.1 Home Tab (Active Tenants Only)
- **Status Cards**: Room number, edge health node status, fiscal status, move-in date
- **Room Features**: Displays features for the resident's unit (Air Conditioned, Smart Lighting, En-suite Bath, etc.)
- **Automation Pulse**: IoT status display — current climate mode, lighting scene; buttons for "Adjust Climate" and "Scene: Relax"
- **Security Status**: FORTIFIED indicator with animated security panel

### 2.2 Profile Editing
- Available from the Settings icon in the dashboard header
- **Locked fields** (read-only): Full Name, Permanent Address
- **Editable fields**: Email, Phone Number, Occupation, Company Name
- Changes saved to `tenants` table in Supabase

### 2.3 Finance Tab (Active Tenants Only)
- **Current Dues breakdown**: Rent, Utility (estimate), Food — shown per billing period
- **Payment Gateway (PayRent / PayBills)**: Triggers a payment modal with 3 options:
  1. **Payment Gateway** — Proceeds to AaramPay (gateway placeholder)
  2. **Upload Screenshot** — Manual UPI/bank transfer audit (file upload)
  3. **Pay by Cash** — Notifies concierge for physical collection
- All payments recorded to `payments` table with a transaction reference
- **Financial Artifacts section**:
  - **Rental Agreement**: Opens popup with agreement text + download option
  - **Security Deposit Receipt**: Shows deposit amount + setup cost charges
  - **Invoice Receipts** (monthly): Document popup with download option

### 2.4 Meals & Food Hub (Aaram Food)
- **Aaram Food Hub** (`/food-hub`): A dedicated marketplace for residents to order meals and explore the culinary ecosystem.
- **Daily Menu Display**: Fetches today's menu from `food_menu` table by day of week; shows Breakfast, Lunch, Dinner items.
- **Meal Opt-In**: Tenant selects a meal plan:
  - **2 Meals/day** (₹3,000/month)
  - **3 Meals/day** (₹3,500/month)
- **Diet Preference**: Veg or Non-Veg selection.
- **Aaram Food Wallet**: Integrated digital wallet for seamless food transactions.
- **Interactive Menu Explorer**: Category-based menu browsing (Breakfast, Lunch, Dinner) with high-quality imagery.
- **Smart Recommendations**: Aara AI suggests meals based on time of day and dietary preferences.
- **Meal Opt-in/Opt-out**: Flexible subscription management with real-time billing updates.
- **Food service starts from the 1st of next month** (enforced in logic).
- **Meal Suggestions**: Tenant can suggest menu items; creates a ticket visible to admin.
- **Culinary Concierge**: Integrated AI support for food-related queries.

---

## 3. Aaram Food Hub Ecosystem

The **Food Hub** is a core pillar of the Aaram lifestyle, focusing on nutrition, convenience, and community.

### 3.1 Digital Menu Explorer
- **Visual-First UI**: Grid-based menu items with hover effects and detailed descriptions.
- **Category Navigation**: Quick filters for meal types (Breakfast, Main Course, Snacks).
- **Price Transparency**: Clear per-meal and monthly subscription pricing.

### 3.2 Subscription Engine
- **Flexible Plans**: 2-meal and 3-meal monthly options.
- **Automatic Renewal**: Seamless monthly renewal integrated with the rental invoice.
- **Real-time Status**: Track current subscription status and next billing date.

### 3.3 Aara Food Intelligence
- **Voice-Activated Ordering**: "Aara, order my breakfast" triggers the ordering workflow.
- **Menu Inquiry**: "Aara, what's for dinner today?" fetches data from `food_menu`.
- **Feedback Loop**: Voice-based ratings and suggestions for the kitchen team.

### 2.5 Support Tab (All Users)
- **Service Ticket Form**: Category (Maintenance, Cleaning, Concierge), Title, Description
- On submit, inserts to `tickets` table
- **Move-Out Request**: Date picker + confirmation; inserts to `move_out_requests` table with `pending` status

### 2.6 Refer & Earn Tab (Active Tenants Only)
- Referral code display with share mechanism
- Earn credits for referred residents

### 2.7 Guest / Explore Mode
When a user is logged in but not yet onboarded as a tenant:
- **Shortlisted Properties**: Shows properties from `tenantProfile.shortlisted_property_ids` with "Schedule Visit" CTA
- **The Aaram Standard**: Benefits grid (WiFi, Kitchen Hub, Security, Cleaning)
- **Contact Team**: Same support ticket form

---

## 3. Tenant Onboarding (`/onboarding`)

A multi-step wizard that converts a guest user into an active resident.

| Step | Name | Fields Collected |
|------|------|-----------------|
| 1 | Identity | Full Name, Permanent Address |
| 2 | Verification | Occupation, Company, ID Proof (file upload) |
| 3 | Residency | Property selection, Vacant Room selection (live from DB), Move-in Date |
| 4 | Add-ons | Food opt-in (2/3 meals), meal preferences |
| 5 | Complete | Summary + redirect to tenant portal |

- Fetches **live vacant rooms** from Supabase (status = 'Vacant')
- On completion: Creates/updates `tenants` record, updates unit status to 'Occupied'

---

## 4. Admin Console

Accessible at `/admin/*`. Protected by `AdminLayout` which verifies against the `admins` table.

### 4.1 Dashboard (`/admin`)
- **4 KPI stat cards** (all clickable links to the relevant section):
  - Portfolio Occupancy %
  - Monthly Revenue (₹, from `income_records`)
  - Open Tickets count
  - Average Water Level %
- **Recent Tickets table**: Domain, Priority, Resident ID, Status, with "Engage" action
- **Smart Resources panel**: Per-property animated water level bars
- **Real-time subscriptions**: Supabase Realtime for `tickets` and `water_logs` tables
- **60-second polling** for background refresh

### 4.2 Tenant Management (`/admin/tenants`)
- Full tenant list with search
- Per-tenant detail: name, email, room assignment, move-in date, food plan, status
- **Edit modal**: Update tenant details
- Tenant status badges: active, notice, moved_out, guest

### 4.3 Occupancy / Unit Manifest (`/admin/occupancy`)
- Per-property room grid with status color coding:
  - 🟢 Vacant, 🔴 Occupied, 🟠 Notice Period, ⚪ Maintenance
- Room cards show: photo slider (multiple images), sqft, tenant name if occupied
- Click-to-edit: Room number, status, features, images, sqft
- Add new rooms per property
- Summary stats: Vacant, Occupied, Notice Period, Maintenance counts

### 4.4 Financial Hub (`/admin/financials`)
- Month-by-month view with a month navigator
- **Expense tracking** with 12 categories: Rent, Maintenance, Electricity, Gas, WiFi, Maid/Cleaning, Furniture, Smart Devices, Organic & Nature, General Utilities, Other, Custom
- **Inline row editing**: Add expense within a category, specify property, date, notes
- **Income tracking**: Rent receipts, Security Deposits, Setup Costs
- **Summary charts**: Pie chart (expense distribution), Bar chart (income vs expense trend)
- Category filtering and property filtering
- All data from `expenses` and `income_records` tables

### 4.5 Support Tickets (`/admin/tickets`)
- Full ticket inbox with filter by status (Pending, In-Progress, Resolved)
- Ticket detail: category, priority, description, tenant ID, created_at
- Priority color coding: High = red, Medium = amber, Low = green
- Resolve / update ticket status

### 4.6 IoT / Water Management (`/admin/iot`)
- Per-property water tank level display
- Historical usage area chart (24-hour profile)
- Smart recommendations based on level thresholds:
  - < 20%: Critical — restrict heavy usage
  - 20–50%: Warning — limit pool refills
  - > 50%: Normal
- Manual refresh button
- **Note**: Currently uses mock data + simulated level changes

### 4.7 Move-Out Calendar (`/admin/calendar`)
- Scheduled move-outs and unit transitions
- Calendar-based view of pending move-out requests

### 4.8 Property Management (`/admin/properties/manage`)
- Create, edit, and delete properties
- Manage rooms per property (add/edit/reorder)
- Manage benefits/amenities (name, image, description)
- Manage automation systems (Lighting, Security, Climate)
- Property image upload
- Drag-to-reorder rooms

---

## 5. Aara AI Assistant (Chatbot)

A floating AI assistant powered by **Google Gemini** (primary) with **Groq / LLaMA** as fallback.

### Access
- Appears as a floating animated Snitch icon (draggable)
- Available on all pages — adapts behavior based on user role

### Capabilities

| Capability | Guest | Tenant | Admin |
|-----------|-------|--------|-------|
| Browse properties info | ✅ | ✅ | ✅ |
| Navigate to any page | Public only | Tenant pages | All pages |
| Create support ticket | ❌ | ✅ | ✅ |
| Check water levels | ❌ | ❌ | ✅ |
| Record financials | ❌ | ❌ | ✅ |
| Resolve tickets | ❌ | ❌ | ✅ |
| Update room status | ❌ | ❌ | ✅ |
| App command (scroll/filter/select) | ❌ | ❌ | ✅ |

### Features
- **Voice Input**: Browser speech recognition (en-IN locale)
- **Voice Output**: Browser speech synthesis (female voice preference)
- **Pinnable window**: Stays open across navigation
- **Action Badges**: Visual confirmation of ticket created, task logged, navigation, data entry
- **"Take me there" button**: Inline navigation links in chat messages
- **Role-aware**: Aara adjusts available commands based on logged-in user role
- **Context injection**: Live property/room/ticket data sent to AI on each request

### AI Actions (Executable by Aara)
1. `navigate` — Router push to any page
2. `create_ticket` — Inserts to `tickets` table
3. `update_room_status` — Updates room status (admin only)
4. `record_financials` — Inserts expense or income record (admin only)
5. `resolve_ticket` — Marks ticket as Resolved (admin only)
6. `app_command` — Triggers cross-page UI commands via `CustomEvent`

### App Commands (via `useAaraCommands` hook)
- `SHOW_METRIC` — Scrolls to a stat card on dashboard
- `FILTER_TICKETS` — Sets ticket filter status
- `SELECT_TICKET` — Focuses a specific ticket
- `SELECT_PROPERTY` — Focuses a specific property
- `SELECT_ROOM` — Focuses a specific room
- `EDIT_PROPERTY` — Opens property edit modal

---

## 6. Android App (via Capacitor)

The web application is packaged as an Android app using **Capacitor v8**.

- App ID: `com.aaramsmarthomes.app`
- Web directory: `out/` (static export)
- Android scheme: HTTPS
- Build command: `npm run export` → `npx cap sync android` → `npx cap open android`
- Images are optimized via `next-image-export-optimizer` — 25 images × 17 breakpoint sizes = 425 WEBP variants

---

## 7. Image Optimization

- All `<Image>` components use `ExportedImage` from `next-image-export-optimizer`
- Images stored in `public/images/`
- Optimized variants stored in `public/images/nextImageExportOptimizer/`
- Format: WEBP at 75% quality
- Blur placeholder generation enabled

---

## 8. Key Database Tables

| Table | Purpose |
|-------|---------|
| `properties` | Property records |
| `rooms` | Room records linked to properties |
| `units` | Bookable units (with status) linked to properties |
| `tenants` | Resident profiles |
| `admins` | Email whitelist for admin access |
| `tickets` | Support and maintenance tickets |
| `payments` | Rent and utility payment records |
| `income_records` | Admin income tracking |
| `expenses` | Admin expense tracking |
| `water_logs` | IoT water level readings |
| `food_menu` | Daily meal menu by day of week |
| `meal_suggestions` | Tenant menu suggestion submissions |
| `move_out_requests` | Move-out requests from tenants |
| `benefits` | Amenity/benefit records per property |
| `automation_systems` | IoT/automation system records per property |
