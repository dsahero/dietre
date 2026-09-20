import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { createEvent, listEventsByHost } from "@/backend/lib/db";
import { resolveEventLocation } from "@/backend/lib/placesDiscovery";
import { discoverAndUpsertRestaurants, RESTAURANTS_VERSION } from "@/backend/lib/restaurantDiscovery";
import {
  budgetRangeFromPerPerson,
  DEFAULT_BUDGET_PER_PERSON,
} from "@/shared/lib/predictedCost";
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

  const body = (await request.json()) as Partial<DietreEvent> & {
    place_id?: string;
    budget_per_person?: number;
  };
  const name = body.name?.trim();
  const date = body.date?.trim();
  const location = body.location?.trim();
  const place_id = body.place_id?.trim();
  const radius = Number(body.radius);
  const expected_headcount = Number(body.expected_headcount);
  const rawBudget =
    body.budget_per_person !== undefined ? Number(body.budget_per_person) : Number.NaN;
  const legacyRange = body.budget_range as BudgetRange | undefined;

  if (!name || !date || !location) {
    return NextResponse.json({ error: "Name, date, and location are required." }, { status: 400 });
  }

  let budget_per_person: number;
  let budget_range: BudgetRange;
  if (Number.isFinite(rawBudget) && rawBudget > 0 && rawBudget <= 500) {
    budget_per_person = Math.round(rawBudget);
    budget_range = budgetRangeFromPerPerson(budget_per_person);
  } else if (legacyRange && ["$", "$$", "$$$"].includes(legacyRange)) {
    budget_range = legacyRange;
    budget_per_person =
      legacyRange === "$" ? 15 : legacyRange === "$$" ? DEFAULT_BUDGET_PER_PERSON : 75;
  } else {
    return NextResponse.json(
      { error: "Enter a max budget per person (dollars)." },
      { status: 400 }
    );
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
    budget_per_person,
    expected_headcount,
    created_at: new Date().toISOString(),
    google_place_id: googlePlaceId,
    candidate_restaurant_ids: candidateIds,
    restaurants_version: RESTAURANTS_VERSION,
  };

  await createEvent(event);
  return NextResponse.json({ event }, { status: 201 });
}
