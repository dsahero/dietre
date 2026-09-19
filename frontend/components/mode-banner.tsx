import { runtimeMode } from "@/shared/lib/config";

export function ModeBanner() {
  const mode = runtimeMode();
  const usingMocks = mode.mongo === "local-json" || mode.parser === "mock" || mode.auth === "mock";
  if (!usingMocks) return null;

  const bits = [
    mode.auth === "mock" ? "host login is a local email session" : null,
    mode.parser === "mock" ? "dietary parsing uses the built-in keyword parser" : null,
    mode.mongo === "local-json" ? "events save to a local JSON file" : null,
  ].filter(Boolean);

  return (
    <div className="border-b border-amber-700/15 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950">
      Running without cloud keys: {bits.join("; ")}. Add env vars to switch to Firebase, Gemini, or MongoDB Atlas.
    </div>
  );
}
