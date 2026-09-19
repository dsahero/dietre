export function hasMongo(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function hasFirebase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function hasPlacesApiKey(): boolean {
  return Boolean(process.env.PLACES_API_KEY);
}

/** Firestore or Mongo is configured — not the local JSON fallback. */
export function hasCloudStore(): boolean {
  if (hasMongo()) return true;
  if (process.env.FIRESTORE_EMULATOR_HOST) return true;
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      (process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        process.env.FIREBASE_SERVICE_ACCOUNT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}

export function runtimeMode() {
  return {
    mongo: hasMongo() ? "mongodb" : hasCloudStore() ? "firestore" : "local-json",
    parser: hasGemini() ? "gemini" : "mock",
    auth: hasFirebase() ? "firebase" : "mock",
  } as const;
}
