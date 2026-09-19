import { NextResponse } from "next/server";
import { DEMO_EVENT_ID } from "@/data/seed";
import { getSession } from "@/lib/auth";
import { getEvent, listMenuItems, listResponses, listRestaurants } from "@/lib/db";
import { matchEvent } from "@/lib/matching";

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
    listRestaurants(),
    listMenuItems(),
  ]);
  const match = matchEvent({ event, responses, restaurants, menuItems });
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
