import { withTimeout } from "@/backend/lib/with-timeout";
import { hasPlacesApiKey as hasPlacesApiKeyConfig } from "@/shared/lib/config";
import { DOWNTOWN_BLACKSBURG } from "@/shared/lib/places";

export type PlaceSuggestion = { placeId: string; mainText: string; secondaryText: string };
export type ResolvedPlace = { formattedAddress: string; lat: number; lng: number; displayName: string };
export type DiscoveredRestaurant = {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: 1 | 2 | 3;
  cuisine: string;
};

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

export function hasPlacesApiKey(): boolean {
  return hasPlacesApiKeyConfig();
}

export async function autocompletePlaces(input: string): Promise<PlaceSuggestion[]> {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey || !input.trim()) return [];
  try {
    const res = await withTimeout(
      fetch(AUTOCOMPLETE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
        },
        body: JSON.stringify({
          input,
          locationBias: {
            circle: {
              center: { latitude: DOWNTOWN_BLACKSBURG.lat, longitude: DOWNTOWN_BLACKSBURG.lng },
              radius: 50000,
            },
          },
        }),
      }),
      4000,
      "places autocomplete"
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
          text?: { text?: string };
        };
      }>;
    };
    const suggestions = data.suggestions ?? [];
    const out: PlaceSuggestion[] = [];
    for (const s of suggestions) {
      const pred = s.placePrediction;
      if (!pred?.placeId) continue;
      out.push({
        placeId: pred.placeId,
        mainText: pred.structuredFormat?.mainText?.text ?? pred.text?.text ?? "",
        secondaryText: pred.structuredFormat?.secondaryText?.text ?? "",
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function resolvePlace(placeId: string): Promise<ResolvedPlace | null> {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey || !placeId.trim()) return null;
  try {
    const res = await withTimeout(
      fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "displayName,formattedAddress,location",
        },
      }),
      4000,
      "places details"
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    };
    if (data.location?.latitude == null || data.location?.longitude == null) return null;
    return {
      displayName: data.displayName?.text ?? "",
      formattedAddress: data.formattedAddress ?? "",
      lat: data.location.latitude,
      lng: data.location.longitude,
    };
  } catch {
    return null;
  }
}

export function mapPriceLevel(googlePriceLevel: string | undefined): 1 | 2 | 3 {
  switch (googlePriceLevel) {
    case "PRICE_LEVEL_FREE":
    case "PRICE_LEVEL_INEXPENSIVE":
      return 1;
    case "PRICE_LEVEL_EXPENSIVE":
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return 3;
    case "PRICE_LEVEL_MODERATE":
    default:
      return 2;
  }
}

export function cuisineFromTypes(types: string[] | undefined): string {
  if (!types) return "Restaurant";
  const hit = types.find((t) => t !== "restaurant" && /_restaurant$/.test(t));
  if (!hit) return "Restaurant";
  const word = hit.replace(/_restaurant$/, "").replace(/_/g, " ");
  return word.replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function discoverNearbyRestaurants(
  center: { lat: number; lng: number },
  radiusMiles: number,
  maxResultCount = 20
): Promise<DiscoveredRestaurant[]> {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) return [];
  try {
    const radiusMeters = Math.min(50000, Math.max(1, radiusMiles) * 1609.34);
    const res = await withTimeout(
      fetch(NEARBY_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.priceLevel",
            "places.types",
            "places.location",
          ].join(","),
        },
        body: JSON.stringify({
          includedTypes: ["restaurant"],
          maxResultCount: Math.min(20, maxResultCount),
          locationRestriction: {
            circle: {
              center: { latitude: center.lat, longitude: center.lng },
              radius: radiusMeters,
            },
          },
        }),
      }),
      6000,
      "places nearby search"
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        priceLevel?: string;
        types?: string[];
        location?: { latitude?: number; longitude?: number };
      }>;
    };
    const places = data.places ?? [];
    const out: DiscoveredRestaurant[] = [];
    for (const p of places) {
      if (!p.id || !p.displayName?.text || p.location?.latitude == null || p.location?.longitude == null) continue;
      out.push({
        googlePlaceId: p.id,
        name: p.displayName.text,
        address: p.formattedAddress ?? "",
        lat: p.location.latitude,
        lng: p.location.longitude,
        priceLevel: mapPriceLevel(p.priceLevel),
        cuisine: cuisineFromTypes(p.types),
      });
    }
    return out;
  } catch {
    return [];
  }
}
