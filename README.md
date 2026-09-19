# DietRe — Anonymous Dietary Matching for Group Catering

> **When2meet for catering.** Ingredient-level dietary matching that lets hosts
> find restaurants safe for every guest at events of 30 – 300+ people.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Architecture](#architecture)
4. [Environment Variables](#environment-variables)
5. [Running Locally](#running-locally)
6. [Seed Data & Demo Event](#seed-data--demo-event)
7. [Testing Guide](#testing-guide)
8. [Design Guidelines](#design-guidelines)
9. [TODO](#todo)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in values (see section below)
cp .env.example .env.local

# 3. Start the dev server
npm run dev
# → http://localhost:4321
```

---

## Project Overview

DietRe consists of two main user flows:

### Host Flow (requires login)
- **Login** → `/login`
- **Event Dashboard** → `/events` → click event → `/events/[id]`
- Dashboard shows: restaurant matching, guest responses, map, shortlisted venues
- The **Overview** page includes a collapsible QR code panel, zero-match alerts,
  donut chart constraint breakdown, and restaurant cards

### Guest Flow (public, no login required)
- **Form intake** → `/r/[eventId]` — traditional form where guests type their
  dietary needs and get AI-parsed ingredient chips
- **Chat intake** → `/joinevent/[eventCode]` — Gemini-powered conversational
  flow that asks about allergies, religious restrictions, etc.

---

## Architecture

```
app/                     # Next.js 16 App Router (pages & API routes)
├── api/                 # REST endpoints (auth, events, joinevent, parse, profile)
├── events/              # Host event pages (list, new, detail)
├── joinevent/[code]/    # Guest chatbot intake page
├── login/               # Auth page
├── profile/             # Host profile
└── r/[id]/              # Guest form intake page

frontend/
├── components/          # All React components
│   ├── dashboard/       # Dashboard layout + sub-components
│   │   ├── OverviewDashboard.tsx   # Main dashboard orchestrator
│   │   ├── dashboard.css           # Dashboard-specific CSS layout
│   │   ├── adapters.ts             # Data transformation layer
│   │   ├── types.ts                # Dashboard view model types
│   │   └── components/             # Dashboard sub-components
│   │       ├── Sidebar.tsx
│   │       ├── ResponsesView.tsx
│   │       ├── ResponseDetailModal.tsx
│   │       ├── RestaurantCard.tsx
│   │       ├── RestaurantDetailContent.tsx
│   │       ├── RestaurantDetailModal.tsx
│   │       ├── ShortlistedView.tsx
│   │       ├── MapTab.tsx
│   │       ├── EditEventModal.tsx
│   │       ├── AudienceStatsCard.tsx
│   │       └── DonutChart.tsx
│   ├── share-panel.tsx             # Server component: generates QR
│   ├── share-panel-collapsible.tsx # Client component: collapsible QR UI
│   ├── zero-match-panel.tsx        # Collapsible expeditor ticket
│   ├── join-event-chat.tsx         # Gemini chatbot intake UI
│   └── diet-form.tsx               # Traditional form intake
├── lib/                 # Hooks (theme toggle, etc.)
└── styles/
    └── globals.css      # Theme tokens, Tailwind config, tactile utilities

backend/
└── lib/
    ├── db.ts            # Database abstraction (MongoDB or local JSON)
    ├── parser.ts        # Gemini dietary text parser
    └── matcher.ts       # Restaurant matching engine

shared/
└── lib/
    ├── types.ts         # Domain types shared between frontend & backend
    ├── config.ts        # Runtime mode detection (mongo/gemini/firebase)
    └── places.ts        # Geocoding & Blacksburg location presets
```

---

## Environment Variables

Create a `.env.local` file with these values:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | For AI features | Google Gemini API key for dietary parsing & chatbot |
| `MONGODB_URI` | For persistence | MongoDB connection string (falls back to local JSON) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | For auth | Firebase API key (falls back to mock auth) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | For auth | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | For auth | Firebase auth domain |

### Runtime Modes

DietRe auto-detects what's available:
- **No env vars** → local JSON storage, mock parser, mock auth (fully functional demo)
- **GEMINI_API_KEY only** → AI parsing + chatbot, but local storage and mock auth
- **All vars set** → full production mode with MongoDB + Gemini + Firebase

---

## Running Locally

```bash
# Development server (hot reload)
npm run dev
# → http://localhost:4321

# Production build
npm run build
npm start

# Lint
npm run lint
```

---

## Seed Data & Demo Event

When running without MongoDB (`MONGODB_URI` not set), the app uses a built-in
local JSON data store with pre-seeded data.

### Default Demo Event

The demo event **"VT Hacks XI"** is pre-seeded and accessible at:

| Page | URL |
|------|-----|
| Host Dashboard | `http://localhost:4321/events/demo-vt-hacks` |
| Guest Form | `http://localhost:4321/r/demo-vt-hacks` |
| Guest Chat | `http://localhost:4321/joinevent/demo-vt-hacks` |

### Default Login Credentials

For mock auth (no Firebase configured):

| Field | Value |
|-------|-------|
| Email | `demo@dietre.us` |
| Password | `demo1234` |

---

## Testing Guide

### 1. Host Dashboard Flow

1. Navigate to `http://localhost:4321/login`
2. Sign in with `demo@dietre.us` / `demo1234`
3. Click the **VT Hacks XI** event to open the dashboard
4. Verify:
   - ✅ Sidebar collapses when clicking the `←` button
   - ✅ Content stretches to fill the full width when sidebar is collapsed
   - ✅ QR code section is collapsed by default, expands on click
   - ✅ Zero-match panel is collapsible with a paperclip decoration
   - ✅ Restaurant cards display match percentages
   - ✅ Click "View Details" on a restaurant → modal appears on top
   - ✅ Navigate to Responses tab → table shows guest tokens
   - ✅ Click a response row → detail modal opens over the table
   - ✅ Map tab loads with Leaflet markers and filter controls
   - ✅ Shortlisted tab shows bookmarked restaurants
   - ✅ "Edit event details" modal opens and saves changes

### 2. Guest Form Intake

1. Open `http://localhost:4321/r/demo-vt-hacks` in a new tab (no login needed)
2. Type dietary needs (e.g., "I'm allergic to peanuts and shellfish, prefer vegetarian")
3. Click "Parse" → verify AI chips appear for hard/soft restrictions
4. Submit the form
5. Return to the host dashboard → verify the new response appears

### 3. Guest Chat Intake (Gemini)

1. Open `http://localhost:4321/joinevent/demo-vt-hacks`
2. Verify the invitation card shows the host name and event details
3. Chat with the concierge:
   - Provide your name when asked
   - Answer allergy/restriction questions
   - Confirm the summary
   - Optionally provide contact email
4. After completion, verify the response appears in the host dashboard

### 4. Theme Toggle

- Light/dark theme toggle appears in sidebar and on guest pages
- Verify both themes render correctly across all pages
- Host and guest theme preferences are stored separately

### 5. Responsiveness

- Test at various viewport widths (mobile, tablet, desktop)
- Sidebar should auto-collapse on narrow viewports
- Restaurant cards should reflow into single column on mobile

---

## Design Guidelines

### Fonts
- **Headings**: Fraunces (`font-heading`) — warm editorial serif
- **Body text**: Lora (`font-serif` / `font-sans`) — readable text serif
- **Code/data**: Geist Mono (`font-mono`) — monospace for tokens, stats

### Colors
- Cardstock/terracotta palette defined as `--dash-*` CSS custom properties
- Light theme: warm cream/parchment backgrounds
- Dark theme: leather/walnut backgrounds
- Accent: burnt orange (`#b9502a` light / `#c1592f` dark)

### Border Radius
- Use `rounded-xs` or `rounded-sm` (2-4px) throughout
- Never use `rounded-xl`, `rounded-2xl`, or `rounded-full` on containers
- Exception: decorative elements (dot indicators, avatar circles)

### Tactile Utilities
- `.ink-stamp` — monospace uppercase stamped label
- `.paper-grain` — subtle fractal noise overlay
- `.deckle-divider` — diagonal dashed border divider
- `.tilt-left`, `.tilt-right`, `.tilt-slight` — subtle rotation transforms

---

## TODO

### High Priority
- [ ] Wire Gemini API integration for the `/joinevent` chat flow
- [ ] Add MongoDB persistence layer for production deployment
- [ ] Implement Firebase authentication
- [ ] Add email notifications for zero-match guests

### Medium Priority
- [ ] Add bulk export of guest responses (CSV/PDF)
- [ ] Implement restaurant detail page with full menu view
- [ ] Add event creation wizard with location autocomplete
- [ ] Implement response editing/updating for guests

### Low Priority
- [ ] Add PWA support for offline guest form access
- [ ] Implement multi-language support
- [ ] Add analytics dashboard for event insights
- [ ] Implement collaborative shortlisting (multiple hosts)

### Design Polish
- [ ] Verify all components use `rounded-xs`/`rounded-sm` consistently
- [ ] Ensure no hardcoded `text-white` outside of accent-colored backgrounds
- [ ] Add subtle entrance animations to restaurant cards
- [ ] Improve mobile layout for the map tab sidebar

---

## License

Private — all rights reserved.
