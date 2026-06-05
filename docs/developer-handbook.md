# AaramSmartHomes — Developer Handbook

Welcome to the **AaramSmartHomes** project! This handbook serves as your primary guide for understanding, developing, and maintaining the platform.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (v20 recommended)
- **Git**: For version control
- **Android Studio**: For mobile builds

### 2. Setup
```bash
# Clone and install
git clone <repo-url>
cd AaramSmartHomes
npm install

# Environment Variables
# Copy .env.local.example to .env.local
# Ensure the following are set:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
```

### 3. Development
```bash
npm run dev
# Open http://localhost:3000
```

---

## 🏗️ Architecture at a Glance

AaramSmartHomes is built with a modern stack optimized for both web performance and mobile portability.

- **Frontend**: Next.js 16 (App Router) + TailwindCSS 4 + Framer Motion.
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage).
- **AI**: Google Gemini (Primary) + Groq (Fallback) via a central `/api/chat` agent.
- **Mobile**: Capacitor v8 wrapping the static Next.js export.

### Core Philosophy: "Premium Experience"
Every component should feel "soft," "premium," and "alive." Use the `soft-card` and `btn-terracotta` design tokens found in `globals.css`.

---

## 📁 Key Directories

| Path | Purpose |
|------|---------|
| `/src/app` | All routes and page logic |
| `/src/components` | Reusable UI components |
| `/src/context` | Global state (Auth) |
| `/src/hooks` | Custom logic (AI commands, events) |
| `/src/lib` | Client singletons and type definitions |
| `/android` | Native Android wrapper |
| `/docs` | Comprehensive technical documentation |

---

## 🤖 Aara AI Integration

Aara is more than a chatbot; it's a cross-page command agent.

- **API**: Handled in `src/app/api/chat/route.ts`.
- **UI**: Handled in `src/components/AaraChatbot.tsx`.
- **Command Bus**: Uses `src/hooks/useAaraCommands.ts` to trigger actions in page components from the chat.

### Adding a Command
1. Define the action in `SYSTEM_PROMPT` in `route.ts`.
2. Add a listener in the target page using `useAaraCommands`.

---

## 📱 Mobile Build Pipeline

To generate the Android APK:

1. Run `npm run export`. This generates a static site in `/out` and optimizes all 425+ image variants.
2. Run `npx cap sync android`.
3. Open Android Studio with `npx cap open android`.

---

## 🎨 Design System & Aesthetics
To maintain the "Premium" feel of AaramSmartHomes, adhere to these guidelines:

### 1. Color Palette (HSL)
- **Background**: `hsl(40, 33%, 94%)` (Warm Cream)
- **Primary**: `hsl(14, 48%, 61%)` (Terracotta)
- **Secondary**: `hsl(143, 20%, 61%)` (Sage Green)
- **Accent**: `hsl(38, 28%, 88%)` (Warm Sand)

### 2. Glassmorphism & Neumorphism
- Use `soft-card` for main containers.
- Use `soft-ui-in` for inputs and "pressed" states.
- Use `soft-ui-out` for buttons and "raised" elements.
- Apply `backdrop-blur-md` and `bg-white/40` for overlays.

### 3. Typography
- Font: **Inter** or **Roboto** (Google Fonts).
- Use `uppercase tracking-widest` for labels and headers to give a modern, technical feel.

---

## 🔄 Common Workflows

### 1. Adding a new Feature Page
1. Create the page in `src/app`.
2. Wrap with `AdminLayout` (for admin) or add to the `tenant` portal tabs.
3. Update `Sidebar.tsx` navigation.
4. Add feature details to `docs/features.md`.

### 2. Database Schema Changes
1. Apply migrations via Supabase SQL Editor.
2. Update `src/lib/types.ts` to reflect changes.
3. Update `docs/low-level-design.md` Table Reference.

---

## 🛠️ Maintenance & Roadmap

### Current Focus
- Replacing native `alert()` and `prompt()` with UI modals.
- Integrating live IoT data (replacing `mockData.ts`).
- Implementing the "AaramPay" payment gateway.

### Support
For technical queries, refer to:
- [High-Level Design](file:///Users/kirtimayaswain/Projects/AI%20Projects/AaramSmartHomes/docs/high-level-design.md)
- [Low-Level Design](file:///Users/kirtimayaswain/Projects/AI%20Projects/AaramSmartHomes/docs/low-level-design.md)
- [Feature Documentation](file:///Users/kirtimayaswain/Projects/AI%20Projects/AaramSmartHomes/docs/features.md)

---

**Happy Coding!** 🏡✨
