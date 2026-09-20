import { withTimeout } from "@/backend/lib/with-timeout";
import { hasPlacesApiKey as hasPlacesApiKeyConfig } from "@/shared/lib/config";
import { haversineMiles } from "@/shared/lib/places";

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
  websiteUri?: string;
};

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby";
const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";

const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "DietRe/1.0 (https://dietre.us; event location search)",
};

export function hasPlacesApiKey(): boolean {
  return hasPlacesApiKeyConfig();
}

function isGooglePlaceId(placeId: string): boolean {
  const id = placeId.trim();
  return Boolean(id) && !id.startsWith("osm:") && !id.startsWith("geocode:");
}

function detailsPlaceId(placeId: string): string {
  return placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
}

export async function autocompletePlaces(input: string): Promise<PlaceSuggestion[]> {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey || !input.trim()) return [];
  const res = await withTimeout(
    fetch(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      // Worldwide — no locationBias / locationRestriction. input is the only
      // required Places Autocomplete (New) field.
      body: JSON.stringify({ input }),
    }),
    4000,
    "places autocomplete"
  );
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    throw new Error(`places autocomplete ${res.status}: ${detail}`);
  }
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
}

type NominatimHit = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  display_name?: string;
  name?: string;
  lat?: string;
  lon?: string;
};

function nominatimToSuggestion(hit: NominatimHit): PlaceSuggestion | null {
  if (hit.lat == null || hit.lon == null) return null;
  const display = hit.display_name ?? "";
  const main = hit.name || display.split(",")[0]?.trim() || display;
  const secondary = display.startsWith(main) ? display.slice(main.length).replace(/^,\s*/, "") : display;
  const placeId =
    hit.osm_id != null
      ? `osm:${(hit.osm_type ?? "place").toLowerCase()}:${hit.osm_id}`
      : `geocode:${hit.lat},${hit.lon}`;
  return { placeId, mainText: main, secondaryText: secondary };
}

async function nominatimSearch(input: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=${limit}&q=${encodeURIComponent(input)}`;
  const res = await withTimeout(fetch(url, { headers: NOMINATIM_HEADERS }), 4000, "nominatim search");
  if (!res.ok) throw new Error(`nominatim search ${res.status}`);
  const data = (await res.json()) as NominatimHit[];
  const out: PlaceSuggestion[] = [];
  for (const hit of data) {
    const suggestion = nominatimToSuggestion(hit);
    if (suggestion) out.push(suggestion);
  }
  return out;
}

async function nominatimGeocode(address: string): Promise<ResolvedPlace | null> {
  const url = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`;
  const res = await withTimeout(fetch(url, { headers: NOMINATIM_HEADERS }), 4000, "nominatim geocode");
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimHit[];
  const hit = data[0];
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    displayName: hit.name ?? hit.display_name ?? address,
    formattedAddress: hit.display_name ?? address,
    lat,
    lng,
  };
}

async function googleGeocode(address: string, apiKey: string): Promise<ResolvedPlace | null> {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey)}`;
  const res = await withTimeout(fetch(url), 4000, "google geocode");
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  const first = data.results?.[0];
  const loc = first?.geometry?.location;
  if (loc?.lat == null || loc.lng == null) return null;
  return {
    displayName: first?.formatted_address ?? address,
    formattedAddress: first?.formatted_address ?? address,
    lat: loc.lat,
    lng: loc.lng,
  };
}

async function textSearchPlace(address: string, apiKey: string): Promise<ResolvedPlace | null> {
  const res = await withTimeout(
    fetch(TEXT_SEARCH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({ textQuery: address }),
    }),
    4000,
    "places text search"
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };
  const first = data.places?.[0];
  if (first?.location?.latitude == null || first.location.longitude == null) return null;
  return {
    displayName: first.displayName?.text ?? address,
    formattedAddress: first.formattedAddress ?? address,
    lat: first.location.latitude,
    lng: first.location.longitude,
  };
}

/** Places Autocomplete when the key works; Nominatim otherwise so the dropdown still fills. */
export async function autocompleteAddress(
  input: string
): Promise<{ suggestions: PlaceSuggestion[]; enabled: boolean; source: "google" | "osm" | "none" }> {
  const needle = input.trim();
  if (needle.length < 2) return { suggestions: [], enabled: true, source: "none" };

  if (hasPlacesApiKey()) {
    try {
      const suggestions = await autocompletePlaces(needle);
      if (suggestions.length > 0) return { suggestions, enabled: true, source: "google" };
    } catch (err) {
      // Places 4xx/timeout — fall back to a geocoder that does not need the key.
      console.warn("[places] Google autocomplete failed, falling back to OSM:", err instanceof Error ? err.message : err);
    }
  } else {
    console.warn("[places] PLACES_API_KEY not set, using OSM for address search");
  }

  try {
    const suggestions = await nominatimSearch(needle, 6);
    return { suggestions, enabled: true, source: "osm" };
  } catch (err) {
    console.warn("[places] OSM address search failed:", err instanceof Error ? err.message : err);
    return { suggestions: [], enabled: false, source: "none" };
  }
}

export async function geocodeAddress(address: string): Promise<ResolvedPlace | null> {
  const needle = address.trim();
  if (!needle) return null;
  const apiKey = process.env.PLACES_API_KEY;
  if (apiKey) {
    try {
      const googled = await googleGeocode(needle, apiKey);
      if (googled) return googled;
    } catch {
      // continue
    }
    try {
      const text = await textSearchPlace(needle, apiKey);
      if (text) return text;
    } catch {
      // continue
    }
  }
  try {
    return await nominatimGeocode(needle);
  } catch {
    return null;
  }
}

export async function resolveEventLocation(
  placeId: string | undefined,
  address: string
): Promise<ResolvedPlace | null> {
  const id = placeId?.trim() ?? "";
  if (id && isGooglePlaceId(id)) {
    const resolved = await resolvePlace(id);
    if (resolved) return resolved;
  }
  return geocodeAddress(address);
}

export async function resolvePlace(placeId: string): Promise<ResolvedPlace | null> {
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey || !placeId.trim() || !isGooglePlaceId(placeId)) return null;
  try {
    const res = await withTimeout(
      fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(detailsPlaceId(placeId))}`, {
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

const MAX_DISCOVERED = 250;
const METERS_PER_MILE = 1609.344;
const MAX_SEARCH_CALLS = 40;
const MIN_CELL_METERS = 150;
const DISCOVERY_BUDGET_MS = 25_000;
const SEARCH_PAGE_SIZE = 20;

type Cell = { center: { lat: number; lng: number }; radius: number };

function offsetPoint(center: { lat: number; lng: number }, meters: number, bearingRad: number) {
  const dLat = (meters * Math.cos(bearingRad)) / 111320;
  const dLng = (meters * Math.sin(bearingRad)) / (111320 * Math.cos((center.lat * Math.PI) / 180));
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

function metersBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  return haversineMiles(a, b) * METERS_PER_MILE;
}

/**
 * Finds the restaurants inside the whole radius, not just the nearest few.
 * Nearby Search returns at most 20 places per call, nearest first. A search
 * that comes back full ("saturated") has only covered the disc out to its
 * farthest result, so the uncovered ring beyond that is searched again with a
 * ring of smaller circles, recursively, until every cell is complete, cells
 * get tiny, or the call/time budget runs out. Results are de-duplicated by
 * place id and clipped to the exact radius.
 */
export async function discoverNearbyRestaurants(
  center: { lat: number; lng: number },
  radiusMiles: number,
  maxResultCount = MAX_DISCOVERED
): Promise<DiscoveredRestaurant[]> {
  const radiusMeters = Math.max(0.1, radiusMiles) * METERS_PER_MILE;
  const found = new Map<string, DiscoveredRestaurant>();
  const deadline = Date.now() + DISCOVERY_BUDGET_MS;
  let calls = 0;

  let level: Cell[] = [{ center, radius: Math.min(50000, radiusMeters) }];
  while (level.length > 0 && calls < MAX_SEARCH_CALLS && Date.now() < deadline) {
    const batch = level.slice(0, MAX_SEARCH_CALLS - calls);
    calls += batch.length;
    const results = await Promise.all(batch.map((cell) => searchNearbyOnce(cell.center, cell.radius, ["restaurant"])));

    const next: Cell[] = [];
    results.forEach((result, index) => {
      const cell = batch[index];
      for (const restaurant of result.items) found.set(restaurant.googlePlaceId, restaurant);
      if (result.rawCount < SEARCH_PAGE_SIZE) return; // complete: nothing left in this cell

      // Covered so far: the disc out to the farthest result. Search the ring beyond it.
      const covered = Math.max(0, ...result.items.map((item) => metersBetween(cell.center, item)));
      const ringWidth = cell.radius - covered;
      if (ringWidth < MIN_CELL_METERS) return;
      const offset = covered + ringWidth / 2;
      const subRadius = Math.max((ringWidth / 2) * 1.2, offset * 0.55);
      if (subRadius < MIN_CELL_METERS) return;
      for (let i = 0; i < 6; i++) {
        next.push({
          center: offsetPoint(cell.center, offset, (i * Math.PI) / 3),
          radius: Math.min(50000, subRadius),
        });
      }
    });
    level = next;
  }

  // One extra sweep for cafes / bakeries / fast food over the whole radius.
  if (Date.now() < deadline) {
    const extra = await searchNearbyOnce(center, Math.min(50000, radiusMeters), [
      "cafe",
      "bakery",
      "fast_food_restaurant",
    ]);
    for (const restaurant of extra.items) if (!found.has(restaurant.googlePlaceId)) found.set(restaurant.googlePlaceId, restaurant);
  }

  const inside: Array<DiscoveredRestaurant & { distance: number }> = [];
  for (const restaurant of found.values()) {
    const distance = haversineMiles(center, restaurant);
    if (distance <= radiusMiles) inside.push({ ...restaurant, distance });
  }
  return inside
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResultCount)
    .map((entry) => ({
      googlePlaceId: entry.googlePlaceId,
      name: entry.name,
      address: entry.address,
      lat: entry.lat,
      lng: entry.lng,
      priceLevel: entry.priceLevel,
      cuisine: entry.cuisine,
      websiteUri: entry.websiteUri,
    }));
}
async function searchNearbyOnce(
  center: { lat: number; lng: number },
  radiusMeters: number,
  includedTypes: string[]
): Promise<{ items: DiscoveredRestaurant[]; rawCount: number }> {
  const none = { items: [] as DiscoveredRestaurant[], rawCount: 0 };
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) return none;
  try {
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
            "places.websiteUri",
          ].join(","),
        },
        body: JSON.stringify({
          includedTypes,
          maxResultCount: 20,
          rankPreference: "DISTANCE",
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
    if (!res.ok) return none;
    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        priceLevel?: string;
        types?: string[];
        websiteUri?: string;
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
        websiteUri: p.websiteUri,
      });
    }
    return { items: out, rawCount: places.length };
  } catch {
    return none;
  }
}
