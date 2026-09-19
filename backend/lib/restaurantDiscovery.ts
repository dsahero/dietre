import { discoverNearbyRestaurants, hasPlacesApiKey } from "@/backend/lib/placesDiscovery";
import { upsertRestaurants } from "@/backend/lib/db";
import type { Restaurant } from "@/shared/lib/types";

/**
 * Discovers real nearby restaurants for an event's location via Google
 * Places and upserts them into the shared restaurant pool. Best-effort:
 * never throws, so it can safely run after an event is created/updated
 * without risking that response.
 */
export async function discoverAndUpsertRestaurants(
  center: { lat: number; lng: number },
  radiusMiles: number
): Promise<{ discovered: number; upserted: number }> {
  if (!hasPlacesApiKey()) return { discovered: 0, upserted: 0 };
  try {
    const found = await discoverNearbyRestaurants(center, radiusMiles);
    if (!found.length) return { discovered: 0, upserted: 0 };
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
    return { discovered: found.length, upserted: restaurants.length };
  } catch (err) {
    console.error("discoverAndUpsertRestaurants failed:", err instanceof Error ? err.message : err);
    return { discovered: 0, upserted: 0 };
  }
}
