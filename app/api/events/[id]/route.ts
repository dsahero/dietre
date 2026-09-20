import { NextResponse } from "next/server";
import { DEMO_EVENT_ID } from "@/backend/data/seed";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listResponses, listRestaurantsForEvent, updateEvent } from "@/backend/lib/db";
import {
  evaluateRestaurantsAgainstChecklist,
  extractLimitationsChecklist,
  suggestEventDetailsFromLimitations,
} from "@/backend/lib/limitations";
import { matchEvent } from "@/backend/lib/matching";
import { attachStoredScores } from "@/backend/lib/scoreConfidence";
import { resolveEventLocation } from "@/backend/lib/placesDiscovery";
import { discoverAndUpsertRestaurants, ensureEventRestaurants } from "@/backend/lib/restaurantDiscovery";
import type { BudgetRange, MenuItem } from "@/shared/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const session = await getSession();
  const isHost = session?.host_id === event.host_id || event.id === DEMO_EVENT_ID;
  if (!isHost) {
    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        date: event.date,
        location: event.location,
        expected_headcount: event.expected_headcount,
      },
      public: true,
    });
  }

  const [responses, restaurants, menuItems] = await Promise.all([
    listResponses(event.id),
    ensureEventRestaurants(event),
    listMenuItems(),
  ]);
  const match = await attachStoredScores(
    event,
    responses,
    await matchEvent({ event, responses, restaurants, menuItems })
  );
  return NextResponse.json({
    event,
    responses: responses.map((response, index) => ({
      id: response.id,
      submitted_at: response.submitted_at,
      parsed_rules: response.parsed_rules,
      has_email: Boolean(response.contact_email),
      contact_email: response.contact_email,
      anonymous_label:
        response.parsed_rules.severity === "high"
          ? `High-constraint guest ${index + 1}`
          : response.parsed_rules.severity === "medium"
            ? `Constrained guest ${index + 1}`
            : `Flexible guest ${index + 1}`,
    })),
    match,
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const session = await getSession();
  const isHost = session?.host_id === event.host_id || event.id === DEMO_EVENT_ID;
  if (!isHost) {
    return NextResponse.json({ error: "Only the host can edit this event." }, { status: 403 });
  }

  const body = (await request.json()) as {
    name?: string;
    location?: string;
    place_id?: string;
    radius?: number;
    budget_range?: BudgetRange;
    expected_headcount?: number;
    limitations?: string;
  };

  const patch: Parameters<typeof updateEvent>[1] = {};
  let locationChanged = false;
  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    patch.name = name;
  }
  if (body.location !== undefined) {
    const location = body.location.trim();
    if (!location) return NextResponse.json({ error: "Location can't be empty." }, { status: 400 });
    const place_id = body.place_id?.trim();
    locationChanged = location !== event.location || Boolean(place_id && place_id !== event.google_place_id);
    if (locationChanged) {
      const resolved = await resolveEventLocation(place_id, location);
      if (!resolved) {
        return NextResponse.json(
          { error: "Could not find that address. Pick a suggestion or try a more complete address." },
          { status: 400 }
        );
      }
      patch.lat = resolved.lat;
      patch.lng = resolved.lng;
      patch.google_place_id = place_id || null;
    }
    patch.location = location;
  }
  if (body.radius !== undefined) {
    const radius = Number(body.radius);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 30) {
      return NextResponse.json({ error: "Radius must be between 0 and 30 miles." }, { status: 400 });
    }
    patch.radius = radius;
  }
  if (body.budget_range !== undefined) {
    if (!["$", "$$", "$$$"].includes(body.budget_range)) {
      return NextResponse.json({ error: "Choose a valid budget range." }, { status: 400 });
    }
    patch.budget_range = body.budget_range;
  }
  if (body.expected_headcount !== undefined) {
    const expected_headcount = Number(body.expected_headcount);
    if (!Number.isFinite(expected_headcount) || expected_headcount < 1) {
      return NextResponse.json({ error: "Expected headcount must be at least 1." }, { status: 400 });
    }
    patch.expected_headcount = expected_headcount;
  }

  // The event's own restaurant list is regenerated whenever its address or
  // search radius changes; edits to anything else never touch Places.
  let discoveredKey: string | null = null;
  const regenerateRestaurants = async () => {
    const lat = patch.lat ?? event.lat;
    const lng = patch.lng ?? event.lng;
    const radius = patch.radius ?? event.radius;
    if (!locationChanged && radius === event.radius) return;
    const key = `${lat},${lng},${radius}`;
    if (key === discoveredKey) return;
    discoveredKey = key;
    const { ids } = await discoverAndUpsertRestaurants({ lat, lng }, radius);
    patch.candidate_restaurant_ids = ids;
    patch.checklist_notes_by_restaurant = {};
    patch.complex_notes_by_restaurant = {};
    patch.complex_notes_signature = "";
  };
  await regenerateRestaurants();

  // Limitations text drives three things, in order: (1) a Gemini-extracted
  // checklist, saved alongside the text; (2) auto-filled radius/budget —
  // but only for fields the host left matching the event's current value,
  // never overriding something they explicitly just typed in this same
  // save; (3) a one-time evaluation of every candidate restaurant against
  // the checklist, cached on the event so it isn't recomputed on every
  // dashboard load. All Gemini-only — with no GEMINI_API_KEY, the text is
  // still saved verbatim, just without the analysis.
  if (body.limitations !== undefined) {
    const limitations = body.limitations.trim();
    patch.limitations = limitations;

    if (limitations && limitations !== (event.limitations ?? "").trim()) {
      const [checklist, suggestions] = await Promise.all([
        extractLimitationsChecklist(limitations),
        suggestEventDetailsFromLimitations(limitations),
      ]);
      patch.limitations_checklist = checklist;

      if (suggestions.radius !== undefined && (body.radius === undefined || body.radius === event.radius)) {
        patch.radius = suggestions.radius;
      }
      if (
        suggestions.budget_range !== undefined &&
        (body.budget_range === undefined || body.budget_range === event.budget_range)
      ) {
        patch.budget_range = suggestions.budget_range;
      }

      // A limitations-suggested radius may itself change the restaurant list.
      await regenerateRestaurants();
    } else if (!limitations) {
      patch.limitations_checklist = [];
      patch.checklist_notes_by_restaurant = {};
    }
  }

  // Score this event's own restaurants against its checklist whenever the
  // checklist or the restaurant list changed in this save.
  const checklist = patch.limitations_checklist ?? event.limitations_checklist ?? [];
  if (checklist.length > 0 && (patch.limitations_checklist || patch.candidate_restaurant_ids)) {
    const merged = { ...event, ...patch };
    const [restaurants, menuItems] = await Promise.all([listRestaurantsForEvent(merged), listMenuItems()]);
    const menuItemsByRestaurant = new Map<string, MenuItem[]>();
    for (const item of menuItems) {
      const list = menuItemsByRestaurant.get(item.restaurant_id) ?? [];
      list.push(item);
      menuItemsByRestaurant.set(item.restaurant_id, list);
    }
    patch.checklist_notes_by_restaurant = await evaluateRestaurantsAgainstChecklist(
      checklist,
      restaurants,
      menuItemsByRestaurant
    );
  }

  const updated = await updateEvent(id, patch);
  return NextResponse.json({ event: updated });
}
