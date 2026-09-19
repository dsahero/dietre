# DietRe

When2meet for catering. Hosts collect anonymous, ingredient-level dietary needs and match them against a Blacksburg / Virginia Tech restaurant seed — ranked so the most constrained guests count more.

This is a demoable MVP: host login → create event → shareable guest link (with QR) → parse “what do you eat?” into chips → live-enough dashboard with match %, map pins, safe menu items, and zero-match alerts.

## Run locally

```bash
npm install
npm run dev
```

Dev server binds to **http://127.0.0.1:4321** (not 3000).

No cloud keys are required. Missing env vars fall back to mocks:

| Missing | Fallback |
| --- | --- |
| `MONGODB_URI` | `.data/store.json` plus the seeded restaurants/menus/demo event |
| `GEMINI_API_KEY` | Deterministic keyword parser |
| Firebase `NEXT_PUBLIC_FIREBASE_*` | Email-only host session (same email → same host id) |

Copy `.env.example` to `.env.local` when you have real credentials.

```
MONGODB_URI=                 # MongoDB Atlas; prize-track store for events/responses/restaurants/menu_items
MONGODB_DB=dietre
GEMINI_API_KEY=              # single-shot dietary parse + ingredient-oriented chips
AUTH_SECRET=                 # signs the host session cookie
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Demo path

1. Open `/` and use **Host login** (any email in mock mode) or skip ahead to the seeded dashboard.
2. **VT Hacks Closing Dinner** lives at `/events/demo-vt-hacks` with nine anonymous responses already in.
3. Guest form (no name field): `/r/demo-vt-hacks` or `/r/<event-id>`.
4. Create your own event at `/events/new` (Blacksburg landmarks geocode; default radius 2 miles).

## Matching

- A menu item is unsafe if any `hard_exclude` hits `estimated_ingredients` or flags (`contains_pork`, `contains_gluten`, `meat_dairy_combo`, …).
- High-severity (medical/allergy) guests are not covered by `confidence: "low"` items.
- Restaurant rank = weighted coverage: high severity ×3, religious/ethical ×2, taste ×1.
- Anyone with zero safe items in-radius and in-budget lands on the zero-match panel (anonymous label + optional email).

Yelp is not called at runtime. The 20-restaurant seed is the demo dataset.

## Stack

Next.js App Router, TypeScript, Tailwind, shadcn/ui. Firebase Auth for hosts only. MongoDB Atlas with JSON fallback. Gemini with mock parser.
