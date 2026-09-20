/**
 * delete_google_restaurants.ts
 *
 * Deletes every document in the `restaurants` Firestore collection whose
 * document ID starts with "google-".
 *
 * Run with:
 *   npx tsx backend/scripts/delete_google_restaurants.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load .env from backend/ directory
config({ path: resolve(process.cwd(), "backend/.env") });

import { COLLECTIONS, deleteDocument, listDocuments } from "@/backend/lib/firestore";
import type { Restaurant } from "@/shared/lib/types";

async function main() {
  console.log("Fetching all restaurants…");
  const all = await listDocuments<Restaurant>(COLLECTIONS.restaurants);
  console.log(`  Total restaurants found: ${all.length}`);

  const targets = all.filter((r) => r.id.startsWith("google-"));
  console.log(`  Restaurants with 'google-' prefix: ${targets.length}`);

  if (targets.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  console.log("Deleting…");
  let deleted = 0;
  for (const r of targets) {
    await deleteDocument(COLLECTIONS.restaurants, r.id);
    console.log(`  ✓ Deleted ${r.id}`);
    deleted++;
  }

  console.log(`\nDone. Deleted ${deleted} restaurant(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
