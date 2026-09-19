# DietRe API

Backend-only dietary matching API for event catering. Hosts (organizers) authenticate; guests use a shareable `link_token` and never log in. A teammate owns the frontend.

## Run locally

```bash
cd backend
npm i
npm run dev
```

API binds to **http://127.0.0.1:4377** (not 3000 / 5173 / 8080).

No cloud keys are required. Missing env vars fall back:

| Missing | Fallback |
| --- | --- |
| `MONGODB_URI` | `backend/.data/store.json` plus seeded Blacksburg restaurants/menus |
| `GEMINI_API_KEY` | Deterministic keyword parser |

Copy `backend/.env.example` to `backend/.env` when you have credentials. `tsx` loads the process environment; export vars or use your shell.

```
PORT=4377
HOST=0.0.0.0
MONGODB_URI=          # MongoDB Atlas
MONGODB_DB=dietre
GEMINI_API_KEY=       # optional dietary parse
AUTH_SECRET=          # signs organizer tokens
```

## Collections

Indexes are created on Mongo connect.

1. **organizers** — email, name, password_hash, events. Unique `{ email: 1 }`.
2. **events** — organizer_id, mode, budget, `link_token`, fairness_mode, GeoJSON `location`, `radius_miles`. Unique `{ link_token: 1 }`, `{ organizer_id: 1 }`, `{ location: "2dsphere" }`.
3. **guests** — one per guest per event. `anon_token` session, optional name/email, transcript, preference_vector, confidence, conflict_followups. `{ event_id: 1 }`, unique `{ anon_token: 1 }`, sparse unique `{ event_id: 1, email: 1 }`.
4. **restaurants** — GeoJSON location, `data_source.tier` 1\|2\|3, preliminary dine-in accessibility, `menu_item_ids`. `{ location: "2dsphere" }`, `{ data_source.google_place_id: 1 }`, `{ data_source.yelp_id: 1 }`.
5. **menu_items** — ingredient rows, rolled-up `allergen_flags` (`confirmed`\|`inferred`\|`none`), `dietary_compatible`, stub `embedding: null`, `needs_human_review`. `{ restaurant_id: 1 }`, `{ needs_human_review: 1 }`.
6. **restaurant_scores** — cached per `(event_id, restaurant_id)`: `per_guest_scores`, `group_scores.utilitarian` / `rawlsian_min`, conflicts, ranks.

Vector search on `embedding` is not implemented. Live scraping, Yelp, and accessibility photo scoring are out of scope.

## REST

Organizer token: `Authorization: Bearer <token>` from register/login.

Guest session: `X-Guest-Token: <anon_token>` (or `Authorization: Guest <anon_token>`).

| Method | Path | Who | What |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | public | `{ email, name, password }` → organizer + token |
| POST | `/api/auth/login` | public | `{ email, password }` → organizer + token |
| GET | `/api/auth/me` | organizer | current organizer |
| GET | `/api/events` | organizer | list events |
| POST | `/api/events` | organizer | create event, returns `link_token` |
| GET | `/api/events/:id` | organizer | event + anonymous guests + scores + zero-matches |
| GET | `/api/events/:id/restaurants` | organizer | restaurants/menu + cached scores (utilitarian + Rawlsian) |
| GET | `/api/events/:id/scores` | organizer | cached `restaurant_scores` |
| GET | `/api/events/:id/zero-matches` | organizer | guests with no safe option in radius |
| GET | `/api/events/:id/conflicts` | organizer | per-restaurant guest/item conflicts |
| GET | `/api/g/:link_token` | guest | public event (+ guest if token present) |
| POST | `/api/g/:link_token/session` | guest | create/resume `anon_token` (no login) |
| POST | `/api/g/:link_token/parse` | guest | parse transcript → preference_vector + confidence; save guest |
| GET | `/health` | public | runtime mode |

Create-event body: `name`, `mode` (`delivery`\|`dine_in`), `budget_mode` (`event_pays`\|`individual_pays`), `event_budget` (number\|null), `fairness_mode` (`utilitarian`\|`rawlsian`), `event_date` (ISO), `guest_count_invited`, `radius_miles`, and `location` as GeoJSON Point, `{ lng, lat }`, or a Blacksburg place label.

CORS is open (`origin` reflected) for a local frontend.

## Matching

- A menu item is unsafe if a guest hard-exclude hits `allergen_flags` or ingredient names.
- High-severity guests are not covered by `needs_human_review` / low-confidence items.
- **Utilitarian** = severity-weighted mean of per-guest scores (1 if a certain-safe item exists, 0.4 if only uncertain-safe, else 0).
- **Rawlsian** = minimum per-guest score at that restaurant.
- Zero-match = max score across in-radius restaurants is 0 (anonymous label + optional email).

20 Blacksburg restaurants are seeded into `restaurants` + `menu_items`. Old boolean flags map to `allergen_flags`.
