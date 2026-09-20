import { isEventMember } from "@/backend/lib/access";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listResponses, updateEvent } from "@/backend/lib/db";
import { ensureEventRestaurants } from "@/backend/lib/restaurantDiscovery";
import { matchEvent } from "@/backend/lib/matching";
import { attachStoredScores } from "@/backend/lib/scoreConfidence";
import {
  fromEventAiOverview,
  generateEventAiOverview,
  overviewSignature,
  toEventAiOverview,
} from "@/backend/lib/aiOverview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Host-facing AI narration for the dashboard: an event-level "why these
// venues + next steps" overview plus per-restaurant summaries.
//
// Spending is deliberately minimal: the result is cached on the event doc
// keyed by a cheap signature of the guest responses + candidate restaurants.
// A plain dashboard reload whose data hasn't changed returns the cached copy
// WITHOUT recomputing the match or calling Gemini. A fresh call only happens
// when that signature changes or the host explicitly passes force=1
// (the "Regenerate" button).
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) return json({ error: "Event not found." }, 404);

  const session = await getSession();
  if (!isEventMember(session, event)) {
    return json({ error: "Unauthorized." }, 403);
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "1";

  try {
    const responses = await listResponses(event.id);
    const signature = overviewSignature(event, responses);

    // Cache hit: no match recompute, no Gemini call.
    if (!force && event.ai_overview && event.ai_overview_signature === signature) {
      return json({ ...fromEventAiOverview(event.ai_overview), cached: true });
    }

    const [restaurants, menuItems] = await Promise.all([
      ensureEventRestaurants(event),
      listMenuItems(),
    ]);

    const match = await attachStoredScores(
      event,
      responses,
      await matchEvent({ event, responses, restaurants, menuItems })
    );

    const overview = await generateEventAiOverview(event, match, responses);

    // Persist so the next reload is free. Failure here is non-fatal — we
    // still return the freshly generated payload.
    try {
      await updateEvent(event.id, {
        ai_overview: toEventAiOverview(overview),
        ai_overview_signature: signature,
      });
    } catch {
      /* ignore persistence errors; the payload is still valid this request */
    }

    return json({ ...overview, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
}
