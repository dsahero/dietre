import { discoverNearbyRestaurants, hasPlacesApiKey } from "@/backend/lib/placesDiscovery";
import { listRestaurantsForEvent, updateEvent, upsertRestaurants } from "@/backend/lib/db";
import type { DietreEvent, Restaurant } from "@/shared/lib/types";

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
      id: `google-${r.googlePlaceId}`,
      name: r.name,
      location: r.address,
      cuisine: r.cuisine,
      price_level: r.priceLevel,
      lat: r.lat,
      lng: r.lng,
    }));
    await upsertRestaurants(restaurants);
    return { discovered: found.length, upserted: restaurants.length, ids: restaurants.map((r) => r.id) };
  } catch (err) {
    console.error("discoverAndUpsertRestaurants failed:", err instanceof Error ? err.message : err);
    return empty;
  }
}

const backfillAttempted = new Set<string>();

/**
 * Restaurants for one event. Legacy events with no list of their own get one
 * generated once per process from their saved location, then saved on the event.
 */
export async function ensureEventRestaurants(event: DietreEvent): Promise<Restaurant[]> {
  if (!event.candidate_restaurant_ids?.length && !backfillAttempted.has(event.id)) {
    backfillAttempted.add(event.id);
    const { ids } = await discoverAndUpsertRestaurants({ lat: event.lat, lng: event.lng }, event.radius);
    if (ids.length) {
      await updateEvent(event.id, { candidate_restaurant_ids: ids });
      event = { ...event, candidate_restaurant_ids: ids };
    }
  }
  return listRestaurantsForEvent(event);
}
