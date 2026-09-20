/**
 * Inject mock preference signals with the correct cache key so matchEvent
 * reads them. Run: npx tsx backend/scripts/inject_pref_signals.ts
 */
import { config } from "dotenv";
config({ path: "backend/.env" });

import { listResponses, listRestaurants, listMenuItems, updateEvent } from "@/backend/lib/db";
import type { PreferenceSignal } from "@/shared/lib/types";

const EVENT_ID = "demo-vt-hacks";

type Dir = PreferenceSignal["direction"];
type Str = PreferenceSignal["strength"];
function sig(direction: Dir, strength: Str): PreferenceSignal {
  return { direction, strength };
}

// What Gemini would plausibly return given each guest's prefs vs. cuisine
function buildSignals(
  restaurantIds: string[],
  guestId: string,
): Record<string, PreferenceSignal> {
  const neutral = (): PreferenceSignal => sig("neutral", 1);
  const base: Record<string, PreferenceSignal> = {};
  for (const rid of restaurantIds) base[rid] = neutral();

  // Actual restaurant IDs from Firestore:
  // benny-marzano-s, buffalo-wild-wings, cabo-fish-taco,
  // cellar-restaurant, coffeeholics-cafe-bakery, taco-bell
  const overrides: Record<string, Record<string, PreferenceSignal>> = {
    // Tariq: "spicy", "halal"
    "resp-demo-3": { "cabo-fish-taco": sig("positive", 2) },
    // Lucas: "no cilantro"
    "resp-demo-5": { "taco-bell": sig("negative", 1), "cabo-fish-taco": sig("negative", 2) },
    // Eli: "kosher"
    "resp-demo-6": { "buffalo-wild-wings": sig("negative", 1), "taco-bell": sig("negative", 2) },
    // Priya: "light", "vegetarian"
    "resp-demo-7": {
      "benny-marzano-s": sig("positive", 1), "coffeeholics-cafe-bakery": sig("positive", 2),
      "buffalo-wild-wings": sig("negative", 2), "taco-bell": sig("negative", 1),
      "cabo-fish-taco": sig("positive", 1),
    },
    // Maya: "plant-based"
    "resp-demo-2": {
      "coffeeholics-cafe-bakery": sig("positive", 1), "buffalo-wild-wings": sig("negative", 2),
      "taco-bell": sig("positive", 1),
    },
    // Alex T.: "spicy", "Indian", "Vietnamese"
    "synth-01": { "buffalo-wild-wings": sig("positive", 1), "cabo-fish-taco": sig("positive", 2) },
    // Jordan P.: "Italian", "pasta", "pizza"
    "synth-02": { "benny-marzano-s": sig("positive", 3) },
    // Mia C.: "Mexican", "bold flavors"
    "synth-04": {
      "buffalo-wild-wings": sig("positive", 1), "taco-bell": sig("positive", 2),
      "cabo-fish-taco": sig("positive", 3),
    },
    // Riley K.: "Greek", "Mediterranean"
    "synth-05": { "buffalo-wild-wings": sig("negative", 1), "taco-bell": sig("negative", 2) },
    // Devon R.: "sushi", "Japanese"
    "synth-07": { "buffalo-wild-wings": sig("negative", 1), "taco-bell": sig("negative", 2) },
    // Avery M.: "Indian", "spicy"
    "synth-09": { "buffalo-wild-wings": sig("positive", 1), "cabo-fish-taco": sig("positive", 2) },
    // Blake D.: "burgers", "sports bar", "wings"
    "synth-10": {
      "coffeeholics-cafe-bakery": sig("negative", 1), "buffalo-wild-wings": sig("positive", 3),
      "cellar-restaurant": sig("positive", 2),
    },
    // Taylor H.: "Vietnamese", "pho"
    "synth-11": { "buffalo-wild-wings": sig("negative", 1), "taco-bell": sig("negative", 1) },
    // Drew L.: "Cajun", "Southern"
    "synth-13": { "buffalo-wild-wings": sig("positive", 1), "cellar-restaurant": sig("positive", 1) },
    // Skyler N.: "unique cuisines", "ethnic restaurants"
    "synth-14": {
      "buffalo-wild-wings": sig("negative", 2), "taco-bell": sig("negative", 3),
      "cabo-fish-taco": sig("positive", 2),
    },
    // Charlie V.: "Chinese", "dumplings" — none match
    "synth-15": {},
  };

  const o = overrides[guestId];
  if (o) {
    for (const [rid, s] of Object.entries(o)) {
      if (base[rid]) base[rid] = s;
    }
  }
  return base;
}

async function main() {
  const [allResponses, allRestaurants, allItems] = await Promise.all([
    listResponses(EVENT_ID),
    listRestaurants(),
    listMenuItems(),
  ]);

  const responses = allResponses.filter((r) => r.event_id === EVENT_ID);

  // Only include restaurants that have menu items (matches matchEvent logic)
  const itemsByRestaurant = new Map<string, number>();
  for (const item of allItems) {
    itemsByRestaurant.set(item.restaurant_id, (itemsByRestaurant.get(item.restaurant_id) ?? 0) + 1);
  }
  const restaurantsWithMenus = allRestaurants.filter(
    (r) => (itemsByRestaurant.get(r.id) ?? 0) > 0,
  );
  const restaurantIds = restaurantsWithMenus.map((r) => r.id);

  console.log(`Event: ${EVENT_ID}`);
  console.log(`Guests: ${responses.length}`);
  console.log(`Restaurants with menus: ${restaurantsWithMenus.length}`);
  restaurantsWithMenus.forEach((r) => console.log(`  ${r.id}: ${r.name} (${r.cuisine})`));

  // Compute the correct cache key (same logic as preferenceSignalsCacheKey)
  const respPart = responses
    .filter((r) => r.parsed_rules.soft_preferences?.length)
    .map((r) => `${r.id}:${r.parsed_rules.soft_preferences.join(",")}`)
    .sort()
    .join("|");
  const restPart = allRestaurants.map((r) => r.id).sort().join(",");
  const cacheKey = `pref##${respPart}##${restPart}`;
  console.log(`\nCache key: ${cacheKey.substring(0, 80)}...`);

  // Build signals for each guest with preferences
  const signals: Record<string, Record<string, PreferenceSignal>> = {};
  for (const response of responses) {
    if (!response.parsed_rules.soft_preferences?.length) continue;
    signals[response.id] = buildSignals(restaurantIds, response.id);
  }

  console.log(`\nGuests with preference signals: ${Object.keys(signals).length}`);
  for (const [gid, sigs] of Object.entries(signals)) {
    const nonNeutral = Object.entries(sigs)
      .filter(([, s]) => s.direction !== "neutral")
      .map(([rid, s]) => `${rid.replace("rest-", "")}=${s.direction}(${s.strength})`)
      .join(", ");
    console.log(`  ${gid}: ${nonNeutral || "(all neutral)"}`);
  }

  await updateEvent(EVENT_ID, {
    preference_signals: signals,
    preference_signals_signature: cacheKey,
  });

  console.log("\n✓ Signals injected with correct cache key.");
}

main();
