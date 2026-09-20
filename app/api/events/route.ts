import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { createEvent, listEventsByHost } from "@/backend/lib/db";
import { resolveEventLocation } from "@/backend/lib/placesDiscovery";
import { discoverAndUpsertRestaurants } from "@/backend/lib/restaurantDiscovery";
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
  if (!budget_range || !["$", "$$", "$$$"].includes(budget_range)) {
    return NextResponse.json({ error: "Choose a budget range." }, { status: 400 });
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > 30) {
    return NextResponse.json({ error: "Radius must be between 0 and 30 miles." }, { status: 400 });
  }
  if (!Number.isFinite(expected_headcount) || expected_headcount < 1) {
    return NextResponse.json({ error: "Expected headcount must be at least 1." }, { status: 400 });
  }

  const resolved = await resolveEventLocation(place_id, location);
  if (!resolved) {
    return NextResponse.json(
      { error: "Could not find that address. Pick a suggestion or try a more complete address." },
      { status: 400 }
    );
  }
  const lat = resolved.lat;
  const lng = resolved.lng;
  const googlePlaceId = place_id || null;

  const { ids: candidateIds } = await discoverAndUpsertRestaurants({ lat, lng }, radius);

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
    candidate_restaurant_ids: candidateIds,
  };

  await createEvent(event);
  return NextResponse.json({ event }, { status: 201 });
}
