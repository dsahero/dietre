import { DEMO_EVENT_ID, SEED_EVENT_2_ID, SEED_EVENT_3_ID } from "@/backend/data/seed";
import { discoverNearbyRestaurants, hasPlacesApiKey } from "@/backend/lib/placesDiscovery";
import { listRestaurantsForEvent, patchEventLean, upsertRestaurants } from "@/backend/lib/db";
import { acquireMenusInBackground } from "@/backend/lib/menuAcquisition";
import { haversineMiles } from "@/shared/lib/places";
import type { DietreEvent, Restaurant } from "@/shared/lib/types";

function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Readable, stable Firestore doc id, e.g. `bennys-marzanos--blacksburg--r1gjo4ohq`. */
export function restaurantDocId(name: string, address: string, googlePlaceId: string): string {
  const parts = address.split(",").map((p) => p.trim());
  const city = parts.length >= 3 ? parts[parts.length - 3] : parts.length === 2 ? parts[0] : "";
  const tail = googlePlaceId.replace(/[^A-Za-z0-9]/g, "").slice(-10).toLowerCase();
  return [slug(name) || "restaurant", slug(city), tail].filter(Boolean).join("--");
}

/**
 * Discovers real nearby restaurants for a location via Google Places, caches
 * them in the shared restaurant collection, and returns their ids so the
 * caller can attach exactly that list to one event. Never throws.
 */
export async function discoverAndUpsertRestaurants(
  center: { lat: number; lng: number },
  radiusMiles: number
): Promise<{ discovered: number; upserted: number; ids: string[] }> {
  const empty = { discovered: 0, upserted: 0, ids: [] as string[] };
  if (!hasPlacesApiKey()) return empty;
  try {
    const found = await discoverNearbyRestaurants(center, radiusMiles);
    if (!found.length) return empty;
    const restaurants: Restaurant[] = found.map((r) => ({
      id: restaurantDocId(r.name, r.address, r.googlePlaceId),
      name: r.name,
      location: r.address,
      cuisine: r.cuisine,
      price_level: r.priceLevel,
      lat: r.lat,
      lng: r.lng,
      google_place_id: r.googlePlaceId,
      alias_ids: [`google-${r.googlePlaceId}`],
      ...(r.websiteUri ? { website: r.websiteUri } : {}),
    }));
    const stored = await upsertRestaurants(restaurants);
    // Menus are found in the background (nearest first); never blocks the caller.
    acquireMenusInBackground(stored);
    return { discovered: found.length, upserted: restaurants.length, ids: restaurants.map((r) => r.id) };
  } catch (err) {
    console.error("discoverAndUpsertRestaurants failed:", err instanceof Error ? err.message : err);
    return empty;
  }
}

// Bump when discovery changes so existing events rebuild their lists once.
// v2: tiled search that covers the whole radius (earlier lists were only the
// nearest ~40 places, clustered around the centre).
export const RESTAURANTS_VERSION = 2;

const backfillAttempted = new Set<string>();

/**
 * Restaurants for one event. Events with no list, or one built by an older
 * discovery version, get a fresh list generated once per process from their
 * saved location and radius, then saved on the event.
 */
export async function ensureEventRestaurants(event: DietreEvent): Promise<Restaurant[]> {
  // The seeded demo events keep their curated restaurant lists.
  const isDemo = event.id === DEMO_EVENT_ID || event.id === SEED_EVENT_2_ID || event.id === SEED_EVENT_3_ID;
  const outdated = !isDemo && (event.restaurants_version ?? 0) < RESTAURANTS_VERSION;
  if ((!event.candidate_restaurant_ids?.length || outdated) && !backfillAttempted.has(event.id)) {
    backfillAttempted.add(event.id);
    const { ids } = await discoverAndUpsertRestaurants({ lat: event.lat, lng: event.lng }, event.radius);
    if (ids.length) {
      const saved = await patchEventLean(event.id, {
        candidate_restaurant_ids: ids,
        restaurants_version: RESTAURANTS_VERSION,
      });
      event = { ...event, candidate_restaurant_ids: ids, restaurants_version: RESTAURANTS_VERSION };
      void saved;
    }
  }
  const list = await listRestaurantsForEvent(event);
  // Older events: fill in menus for restaurants that haven't been checked yet.
  acquireMenusInBackground(
    [...list].sort((a, b) => haversineMiles(event, a) - haversineMiles(event, b))
  );
  return list;
}
