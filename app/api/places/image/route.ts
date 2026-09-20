import { NextResponse } from "next/server";
import { withTimeout } from "@/backend/lib/with-timeout";

const PLACE_DETAILS_URL = "https://places.googleapis.com/v1/places";
const TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

function detailsPlaceId(placeId: string): string {
  return placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
}

function isGooglePlaceId(placeId: string): boolean {
  const id = placeId.trim();
  return Boolean(id) && !id.startsWith("osm:") && !id.startsWith("geocode:");
}

const FALLBACK_CATEGORIES: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ["squires", "vt hacks", "hacks", "virginia tech", "university", "campus", "academic", "student center"],
    url: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["inn", "hotel", "ballroom", "banquet", "hall", "graduate", "conference", "center"],
    url: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["stadium", "lane", "cassell", "coliseum", "arena", "sports", "field"],
    url: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["pizza", "pizzeria", "italian", "pasta", "trattoria"],
    url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["burger", "grill", "bbq", "barbecue", "pub", "tavern", "taphouse"],
    url: "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["mexican", "taco", "burrito", "cantina", "salsa", "tex-mex"],
    url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["asian", "sushi", "ramen", "thai", "chinese", "japanese", "noodle", "pho", "bento"],
    url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["cafe", "coffee", "bakery", "breakfast", "brunch", "roaster", "espresso"],
    url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=800&auto=format&fit=crop",
  },
  {
    keywords: ["steak", "steakhouse", "bistro", "fine dining", "wine", "cellar"],
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
  },
];

const GENERAL_FALLBACKS = [
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=800&auto=format&fit=crop",
];

function getFallbackPhotoUrl(query: string, address: string, placeId: string): string {
  const combined = (query + " " + address).toLowerCase();
  for (const cat of FALLBACK_CATEGORIES) {
    if (cat.keywords.some((kw) => combined.includes(kw))) {
      return cat.url;
    }
  }
  let hash = 0;
  const str = query || address || placeId || "dietre";
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return GENERAL_FALLBACKS[hash % GENERAL_FALLBACKS.length];
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim() ?? "";
  const address = url.searchParams.get("address")?.trim() ?? "";
  const placeId = url.searchParams.get("place_id")?.trim() ?? "";

  const apiKey = process.env.PLACES_API_KEY;

  if (apiKey) {
    // 1. Try Google Place Details if a valid Google Place ID is provided
    if (placeId && isGooglePlaceId(placeId)) {
      try {
        const detailsRes = await withTimeout(
          fetch(`${PLACE_DETAILS_URL}/${encodeURIComponent(detailsPlaceId(placeId))}`, {
            method: "GET",
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "photos,displayName,formattedAddress",
            },
          }),
          3500,
          "places photo details"
        );
        if (detailsRes.ok) {
          const data = (await detailsRes.json()) as {
            photos?: Array<{ name?: string }>;
          };
          const photoName = data.photos?.[0]?.name;
          if (photoName) {
            const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=600&maxWidthPx=800&key=${encodeURIComponent(apiKey)}`;
            return NextResponse.redirect(mediaUrl, { status: 307 });
          }
        }
      } catch (err) {
        console.warn("Places details photo lookup failed:", err);
      }
    }

    // 2. Try Places Text Search if query or address is provided
    const textQuery = query || address;
    if (textQuery) {
      try {
        const searchRes = await withTimeout(
          fetch(TEXT_SEARCH_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask": "places.photos,places.id,places.displayName",
            },
            body: JSON.stringify({ textQuery }),
          }),
          3500,
          "places photo text search"
        );
        if (searchRes.ok) {
          const data = (await searchRes.json()) as {
            places?: Array<{
              photos?: Array<{ name?: string }>;
            }>;
          };
          const photoName = data.places?.[0]?.photos?.[0]?.name;
          if (photoName) {
            const mediaUrl = `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=600&maxWidthPx=800&key=${encodeURIComponent(apiKey)}`;
            return NextResponse.redirect(mediaUrl, { status: 307 });
          }
        }
      } catch (err) {
        console.warn("Places text search photo lookup failed:", err);
      }
    }
  }

  // 3. Fallback: Curated high-resolution location photo matched by category / keyword
  const fallbackUrl = getFallbackPhotoUrl(query, address, placeId);
  return NextResponse.redirect(fallbackUrl, { status: 307 });
}

