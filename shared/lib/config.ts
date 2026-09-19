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

export function runtimeMode() {
  return {
    mongo: hasMongo() ? "mongodb" : "local-json",
    parser: hasGemini() ? "gemini" : "mock",
    auth: hasFirebase() ? "firebase" : "mock",
  } as const;
}
