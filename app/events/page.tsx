import { redirect } from "next/navigation";
import { EventsDashboardView, type EventWithResponseCount } from "@/frontend/components/map-view/EventsDashboardView";
import { getSession } from "@/backend/lib/auth";
import { getHost, listEventsByHost, listResponses } from "@/backend/lib/db";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [events, profile] = await Promise.all([
    listEventsByHost(session.host_id, session.email),
    getHost(session.host_id),
  ]);
  const eventsWithCounts: EventWithResponseCount[] = await Promise.all(
    events.map(async (event) => ({
      ...event,
      responseCount: (await listResponses(event.id)).length,
    }))
  );

  return (
    <EventsDashboardView
      events={eventsWithCounts}
      hostEmail={session.email}
      profileName={profile?.name}
      profileAvatarUrl={profile?.avatar_data_url}
    />
  );
}
