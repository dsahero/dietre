import { hasFirebase, hasGemini, runtimeMode } from "@/shared/lib/config";

export function ModeBanner() {
  // dietre.us (and any deploy with Firebase + Gemini) must not show a local-JSON warning.
  if (hasFirebase() && hasGemini()) return null;

  const mode = runtimeMode();
  const storeMissing = mode.mongo === "local-json";
  const usingMocks = storeMissing || mode.parser === "mock" || mode.auth === "mock";
  if (!usingMocks) return null;

  const bits = [
    mode.auth === "mock" ? "host login is a local email session" : null,
    mode.parser === "mock" ? "dietary parsing uses the built-in keyword parser" : null,
    storeMissing ? "events save to a local JSON file" : null,
  ].filter(Boolean);

  if (bits.length === 0) return null;

  return (
    <div className="border-b border-amber-700/15 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
      Running without cloud keys: {bits.join("; ")}. Add env vars to switch to Firebase or Gemini.
    </div>
  );
}
