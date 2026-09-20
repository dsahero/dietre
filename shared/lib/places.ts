// Event locations resolve through Places Autocomplete, Google Geocoding, or
// Nominatim (see backend/lib/placesDiscovery.ts). Worldwide — no city bias.
// BLACKSBURG_PLACES / geocodeBlacksburg remain for seeded demo coords only.
export type Place = { lat: number; lng: number; label: string };

export const DOWNTOWN_BLACKSBURG: Place = {
  lat: 37.2296,
  lng: -80.4139,
  label: "Downtown Blacksburg",
};

export const BLACKSBURG_PLACES: Place[] = [
  DOWNTOWN_BLACKSBURG,
  { lat: 37.2294, lng: -80.4187, label: "Squires Student Center" },
  { lat: 37.2289, lng: -80.4233, label: "Graduate Life Center / GLC" },
  { lat: 37.2219, lng: -80.418, label: "Lane Stadium" },
  { lat: 37.2225, lng: -80.4228, label: "Cassell Coliseum" },
  { lat: 37.2318, lng: -80.4255, label: "The Inn at Virginia Tech" },
  { lat: 37.2364, lng: -80.4238, label: "University Mall" },
  { lat: 37.229, lng: -80.4144, label: "College Avenue" },
  { lat: 37.2162, lng: -80.4008, label: "South Main Street" },
];

export function geocodeBlacksburg(location: string): Place {
  const needle = location.trim().toLowerCase();
  if (!needle) return DOWNTOWN_BLACKSBURG;
  const hit = BLACKSBURG_PLACES.find(
    (place) =>
      needle.includes(place.label.toLowerCase()) ||
      place.label.toLowerCase().includes(needle)
  );
  if (hit) return hit;
  const tokens = needle.split(/[^a-z0-9]+/).filter(Boolean);
  const scored = BLACKSBURG_PLACES.map((place) => {
    const label = place.label.toLowerCase();
    const score = tokens.reduce(
      (sum, token) => (token.length > 2 && label.includes(token) ? sum + 1 : sum),
      0
    );
    return { place, score };
  }).sort((a, b) => b.score - a.score)[0];
  return scored && scored.score > 0 ? scored.place : DOWNTOWN_BLACKSBURG;
}

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function priceLevelFromBudget(budget: "$" | "$$" | "$$$"): 1 | 2 | 3 {
  if (budget === "$") return 1;
  if (budget === "$$") return 2;
  return 3;
}

export function budgetFromPriceLevel(level: 1 | 2 | 3): "$" | "$$" | "$$$" {
  return level === 1 ? "$" : level === 2 ? "$$" : "$$$";
}
