# DietRe backend

Library used by the Next.js `app/` routes and server components. Not a standalone Express server.

## Store

| Env | Store |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` plus API key, service account, or `FIRESTORE_EMULATOR_HOST` | Firestore collections `organizers`, `events`, `guests`, `restaurants`, `menu_items`, `restaurant_scores` |
| none of the above | `.data/store.json` (starts empty — no placeholder restaurants/menus/guests) |

Credentials (first match wins for writes):

1. `FIRESTORE_EMULATOR_HOST`
2. `FIREBASE_SERVICE_ACCOUNT` (JSON string) or `GOOGLE_APPLICATION_CREDENTIALS` (path to admin JSON; relative paths resolve from repo root)
3. `NEXT_PUBLIC_FIREBASE_API_KEY` alone (only works with open rules)

Also read (optional): `GEMINI_API_KEY`, `PLACES_API_KEY`, `AUTH_SECRET`.

**No auto-seed.** `restaurants` / `menu_items` stay empty until acquisition writes them; `guests` only from submit/parse (always with `event_id`; `preference_vector` / `parsed_rules` stored on that guest); `restaurant_scores` only from live `matchEvent` for that event (empty guests → empty scores). Optional demo load: set `DIETRE_SEED=1` and call `seedDemoDataIfEnabled()` (never runs on API hit by itself).

`listResponses(eventId)` / `listRestaurantScores(eventId)` query by `event_id` only. `matchEvent` scores restaurants against those guests alone.

Organizer auth: Firebase Auth ID token (`firebaseToken` on `POST /api/auth/login`) when the frontend has `NEXT_PUBLIC_FIREBASE_*`. Mock email/password hosts otherwise (`password_hash` on `organizers`).

## Run (from repo root)

```bash
npm install
# copy .env.example → .env.local and fill Firebase + keys
npm run dev
```

http://127.0.0.1:4321 — JSON fallback if Firebase is unset.
