/**
 * Clears the preference-signals cache for a given event so the next
 * dashboard load triggers a fresh Gemini pass against the real candidate
 * restaurants (instead of reusing mock-injected `neutral(1)` values).
 *
 * Usage:
 *   npx tsx backend/scripts/reset_pref_cache.ts <eventId>
 *   npx tsx backend/scripts/reset_pref_cache.ts            # defaults to VT After-Party
 */
import { config } from "dotenv";
config({ path: "backend/.env" });

import { getEvent, updateEvent } from "@/backend/lib/db";

const DEFAULT_EVENT_ID = "7a616db9-0eef-4b9a-bc36-472b64afd824";

async function main() {
  const eventId = process.argv[2] ?? DEFAULT_EVENT_ID;
  const event = await getEvent(eventId);
  if (!event) {
    console.error(`Event ${eventId} not found.`);
    process.exit(1);
  }

  const prevGuests = Object.keys(event.preference_signals ?? {}).length;
  const prevSig = event.preference_signals_signature ?? "(none)";
  console.log(`Event: ${event.name} (${eventId})`);
  console.log(`  Previous cache: ${prevGuests} guests, signature=${prevSig.substring(0, 40)}...`);

  await updateEvent(eventId, {
    preference_signals: {},
    preference_signals_signature: "",
  });

  console.log("✓ Preference signals cache cleared.");
  console.log("  Reload the events page — first load kicks off the Gemini pass,");
  console.log("  second load renders varied Guest Fit scores.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
