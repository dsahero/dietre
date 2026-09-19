/**
 * seed_from_menus.ts
 *
 * Reads .data/menus.json (output of places.ts scraper), converts raw items
 * into MenuItem[] with computed flags, then pushes everything to Firestore.
 *
 * Run with:
 *   npm run seed
 *
 * What it does:
 *   1. Deletes all existing docs in Firestore: restaurants, menu_items, restaurant_scores
 *   2. Writes the 10 scraped restaurants with real Blacksburg coordinates
 *   3. Converts each raw menu item (ingredients[]) → MenuItem (with flags{})
 *      using rawItemsToMenuItems() from ingredient_modeling.ts
 *   4. Writes all menu items to Firestore in batches
 */

import { promises as fs } from "fs";
import path from "path";
import { rawItemsToMenuItems, type RawMenuItem } from "@/backend/lib/ingredient_modeling";
import { menuItemToDoc, restaurantToDoc } from "@/backend/lib/collections";
import {
  COLLECTIONS,
  commitWrites,
  deleteDocument,
  listDocuments,
  setDocument,
} from "@/backend/lib/firestore";
import type { Restaurant } from "@/shared/lib/types";

// ---------------------------------------------------------------------------
// Real Blacksburg coordinates for each scraped restaurant
// ---------------------------------------------------------------------------

const RESTAURANT_META: Record<string, Omit<Restaurant, "id" | "name">> = {
  "mcdonald-s": {
    location: "110 Turner St NW, Blacksburg, VA",
    cuisine: "Fast Food",
    price_level: 1,
    lat: 37.2307,
    lng: -80.4132,
  },
  "buffalo-wild-wings": {
    location: "460 Turner St NW, Blacksburg, VA",
    cuisine: "American",
    price_level: 2,
    lat: 37.2313,
    lng: -80.4126,
  },
  "cellar-restaurant": {
    location: "302 N Main St, Blacksburg, VA",
    cuisine: "American",
    price_level: 3,
    lat: 37.2296,
    lng: -80.4165,
  },
  "hamro-kitchen": {
    location: "117 N Main St, Blacksburg, VA",
    cuisine: "Indian / Nepalese",
    price_level: 2,
    lat: 37.2301,
    lng: -80.4155,
  },
  "cabo-fish-taco": {
    location: "205 N Main St, Blacksburg, VA",
    cuisine: "Mexican / Seafood",
    price_level: 2,
    lat: 37.2289,
    lng: -80.4147,
  },
  "coffeeholics-cafe-bakery": {
    location: "220 N Main St, Blacksburg, VA",
    cuisine: "Cafe / Bakery",
    price_level: 1,
    lat: 37.2298,
    lng: -80.4162,
  },
  "mellow-mushroom-blacksburg": {
    location: "610 University City Blvd, Blacksburg, VA",
    cuisine: "Pizza",
    price_level: 2,
    lat: 37.2295,
    lng: -80.4153,
  },
  "taco-bell": {
    location: "1614 N Main St, Blacksburg, VA",
    cuisine: "Fast Food",
    price_level: 1,
    lat: 37.2354,
    lng: -80.4251,
  },
  "benny-marzano-s": {
    location: "101 Draper Rd, Blacksburg, VA",
    cuisine: "Italian / Pizza",
    price_level: 2,
    lat: 37.2302,
    lng: -80.4162,
  },
  "west-end-market": {
    location: "West Campus, Virginia Tech, Blacksburg, VA",
    cuisine: "American",
    price_level: 1,
    lat: 37.2284,
    lng: -80.4264,
  },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Load menus.json
  const menusPath = path.join(process.cwd(), ".data", "menus.json");
  const raw = JSON.parse(await fs.readFile(menusPath, "utf8")) as {
    restaurants: { id: string; name: string }[];
    menu_items: RawMenuItem[];
  };

  console.log(`Loaded menus.json: ${raw.restaurants.length} restaurants, ${raw.menu_items.length} items`);

  // ---------------------------------------------------------------------------
  // Step 1: Clear existing Firestore data
  // ---------------------------------------------------------------------------

  console.log("\n--- Clearing existing Firestore data ---");
  for (const collection of [COLLECTIONS.restaurants, COLLECTIONS.menu_items, COLLECTIONS.restaurant_scores]) {
    const existing = await listDocuments(collection);
    console.log(`  Deleting ${existing.length} docs from ${collection}...`);
    for (const doc of existing) {
      await deleteDocument(collection, doc.id);
    }
  }

  // ---------------------------------------------------------------------------
  // Step 2: Write restaurants
  // ---------------------------------------------------------------------------

  console.log("\n--- Writing restaurants ---");
  const restaurantWrites: Array<{ collection: string; id: string; data: Record<string, unknown> }> = [];
  const validRestaurantIds = new Set<string>();

  for (const r of raw.restaurants) {
    const meta = RESTAURANT_META[r.id];
    if (!meta) {
      console.warn(`  Skipping ${r.id} — no metadata`);
      continue;
    }
    const restaurant: Restaurant = { id: r.id, name: r.name, ...meta };
    // Count how many menu items this restaurant has
    const itemCount = raw.menu_items.filter((i) => i.restaurant_id === r.id).length;
    restaurantWrites.push({
      collection: COLLECTIONS.restaurants,
      id: r.id,
      data: restaurantToDoc(restaurant, []), // menu_item_ids filled in step 3
    });
    validRestaurantIds.add(r.id);
    console.log(`  ${r.name} (${r.id}) — ${itemCount} items`);
  }

  await commitWrites(restaurantWrites);
  console.log(`Wrote ${restaurantWrites.length} restaurants`);

  // ---------------------------------------------------------------------------
  // Step 3: Convert raw items → MenuItem[] with flags, then write to Firestore
  // ---------------------------------------------------------------------------

  console.log("\n--- Converting and writing menu items ---");

  // rawItemsToMenuItems() computes flags{} from ingredients[]:
  //   "mozzarella" → flags.contains_dairy = true
  //   "chicken"    → flags.contains_chicken = true, vegetarian = false
  //   "garlic bread" → flags.contains_gluten = true
  // Items with no ingredients get confidence="low" and empty flags (uncertain).
  const validRawItems = raw.menu_items.filter((i) => validRestaurantIds.has(i.restaurant_id));
  const menuItems = rawItemsToMenuItems(validRawItems);

  console.log(`  ${menuItems.length} items total`);
  console.log(`  ${menuItems.filter((i) => i.confidence === "high").length} with explicit ingredients (confident)`);
  console.log(`  ${menuItems.filter((i) => i.confidence === "low").length} without ingredients (uncertain flags)`);

  // Write in batches of 400 (Firestore commit limit)
  const menuWrites = menuItems.map((item) => ({
    collection: COLLECTIONS.menu_items,
    id: item.id,
    data: menuItemToDoc(item),
  }));

  const BATCH = 400;
  for (let i = 0; i < menuWrites.length; i += BATCH) {
    const slice = menuWrites.slice(i, i + BATCH);
    await commitWrites(slice);
    console.log(`  Wrote items ${i + 1}–${Math.min(i + BATCH, menuWrites.length)}`);
  }

  // ---------------------------------------------------------------------------
  // Step 4: Update each restaurant doc with its menu_item_ids
  // ---------------------------------------------------------------------------

  console.log("\n--- Updating restaurant menu_item_ids ---");
  const itemIdsByRestaurant = new Map<string, string[]>();
  for (const item of menuItems) {
    const list = itemIdsByRestaurant.get(item.restaurant_id) ?? [];
    list.push(item.id);
    itemIdsByRestaurant.set(item.restaurant_id, list);
  }

  for (const r of raw.restaurants) {
    if (!validRestaurantIds.has(r.id)) continue;
    const meta = RESTAURANT_META[r.id]!;
    const restaurant: Restaurant = { id: r.id, name: r.name, ...meta };
    const itemIds = itemIdsByRestaurant.get(r.id) ?? [];
    await setDocument(COLLECTIONS.restaurants, r.id, restaurantToDoc(restaurant, itemIds));
  }

  console.log("\n✓ Done.");
  console.log(`  ${restaurantWrites.length} restaurants`);
  console.log(`  ${menuItems.length} menu items with computed flags`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
