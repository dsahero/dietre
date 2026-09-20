/**
 * patch_event_restaurants.ts
 *
 * Sets candidate_restaurant_ids on an event to the 10 seeded restaurants.
 * Uses db.ts so it works on local JSON store and Firestore.
 *
 * Usage:
 *   npx tsx backend/scripts/patch_event_restaurants.ts [eventId]
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), "backend/.env") });
config({ path: resolve(process.cwd(), ".env") }); // fallback

import { getEvent, updateEvent } from "@/backend/lib/db";

const SEEDED_RESTAURANT_IDS = [
  "mcdonald-s",
  "buffalo-wild-wings",
  "cellar-restaurant",
  "hamro-kitchen",
  "cabo-fish-taco",
  "coffeeholics-cafe-bakery",
  "mellow-mushroom-blacksburg",
  "taco-bell",
  "benny-marzano-s",
  "west-end-market",
];

async function main() {
  const eventId = process.argv[2] ?? "demo-vt-hacks";

  const event = await getEvent(eventId);
  if (!event) {
    console.error(`Event "${eventId}" not found.`);
    process.exit(1);
  }

  console.log(`Event: ${event.name} (${eventId})`);
  console.log(`Current candidate_restaurant_ids: ${JSON.stringify(event.candidate_restaurant_ids ?? [])}`);

  await updateEvent(eventId, { candidate_restaurant_ids: SEEDED_RESTAURANT_IDS });

  console.log(`\n✓ Patched — candidate_restaurant_ids set to:`);
  SEEDED_RESTAURANT_IDS.forEach((id) => console.log(`  - ${id}`));
  console.log(`\nNow load the dashboard to trigger matchEvent → scores will appear.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
