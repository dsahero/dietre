import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { createEvent, listEventsByHost } from "@/backend/lib/db";
import { resolvePlace } from "@/backend/lib/placesDiscovery";
import { discoverAndUpsertRestaurants } from "@/backend/lib/restaurantDiscovery";
import { geocodeBlacksburg } from "@/shared/lib/places";
import type { BudgetRange, DietreEvent } from "@/shared/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to see your events." }, { status: 401 });
  }
  const events = await listEventsByHost(session.host_id, session.email);
  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in as a host to create an event." }, { status: 401 });
  }

  const body = (await request.json()) as Partial<DietreEvent> & { place_id?: string };
  const name = body.name?.trim();
  const date = body.date?.trim();
  const location = body.location?.trim();
  const place_id = body.place_id?.trim();
  const radius = Number(body.radius);
  const expected_headcount = Number(body.expected_headcount);
  const budget_range = body.budget_range as BudgetRange | undefined;

  if (!name || !date || !location) {
    return NextResponse.json({ error: "Name, date, and location are required." }, { status: 400 });
  }
  if (!place_id) {
    return NextResponse.json(
      { error: "Pick a location from the suggestions before creating the event." },
      { status: 400 }
    );
  }
  if (!budget_range || !["$", "$$", "$$$"].includes(budget_range)) {
    return NextResponse.json({ error: "Choose a budget range." }, { status: 400 });
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 30) {
    return NextResponse.json({ error: "Radius must be between 0 and 30 miles." }, { status: 400 });
  }
  if (!Number.isFinite(expected_headcount) || expected_headcount < 1) {
    return NextResponse.json({ error: "Expected headcount must be at least 1." }, { status: 400 });
  }

  let lat: number;
  let lng: number;
  let googlePlaceId: string | null = null;
  if (place_id.startsWith("landmark:")) {
    const place = geocodeBlacksburg(place_id.slice("landmark:".length));
    lat = place.lat;
    lng = place.lng;
  } else {
    const resolved = await resolvePlace(place_id);
    if (resolved) {
      lat = resolved.lat;
      lng = resolved.lng;
      googlePlaceId = place_id;
    } else {
      const place = geocodeBlacksburg(location);
      lat = place.lat;
      lng = place.lng;
    }
  }

  const event: DietreEvent = {
    id: crypto.randomUUID(),
    host_id: session.host_id,
    name,
    date,
    location,
    lat,
    lng,
    radius,
    budget_range,
    expected_headcount,
    created_at: new Date().toISOString(),
    google_place_id: googlePlaceId,
  };

  await createEvent(event);
  discoverAndUpsertRestaurants({ lat, lng }, radius).catch(() => {});
  return NextResponse.json({ event }, { status: 201 });
}
