# DietRe backend

Library used by the Next.js `app/` routes and server components. Not a standalone Express server.

## Store

| Env | Store |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` plus API key, service account, or `FIRESTORE_EMULATOR_HOST` | Firestore collections `organizers`, `events`, `guests`, `restaurants`, `menu_items`, `restaurant_scores` |
| none of the above | `.data/store.json` |

Organizer auth: Firebase Auth ID token (`firebaseToken` on `POST /api/auth/login`) when the frontend has `NEXT_PUBLIC_FIREBASE_*`. Mock email/password hosts otherwise (`password_hash` on `organizers`).

`MONGODB_URI` is ignored. Do not set it as the primary store.

## Run (from repo root)

```bash
npm install
npm run dev
```

http://127.0.0.1:4321 — JSON fallback if Firebase is unset. Optional: `GEMINI_API_KEY`, `AUTH_SECRET`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`, `FIREBASE_SERVICE_ACCOUNT` (JSON).
