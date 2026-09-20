import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_EVENT_ID, SEED_EVENT_2_ID, SEED_EVENT_3_ID } from "@/backend/data/seed";
import { getSession, hostIdFromEmail } from "@/backend/lib/auth";
import { getEvent, getHost, listMenuItems, listResponses, listRestaurants } from "@/backend/lib/db";
import { matchEvent } from "@/backend/lib/matching";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SharePanel } from "@/frontend/components/share-panel";
import { SiteHeader } from "@/frontend/components/site-header";
import { Button } from "@/frontend/components/ui/button";
import OverviewDashboard from "@/frontend/components/dashboard/OverviewDashboard";
import "@/frontend/components/dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default async function EventDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const session = await getSession();
  const isDemo =
    event.id === DEMO_EVENT_ID ||
    event.id === SEED_EVENT_2_ID ||
    event.id === SEED_EVENT_3_ID;

  let isHost = session?.host_id === event.host_id || isDemo;

  if (!isHost && session?.email) {
    const sessionEmail = session.email.trim().toLowerCase();
    if (event.host_id === hostIdFromEmail(sessionEmail)) {
      isHost = true;
    } else {
      const eventHost = await getHost(event.host_id);
      if (eventHost && eventHost.email.trim().toLowerCase() === sessionEmail) {
        isHost = true;
      }
    }
  }

  if (!isHost) {
    return (
      <div className="flex min-h-full flex-col">
        <ModeBanner />
        <SiteHeader />
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
          <h1 className="font-heading text-3xl">{event.name}</h1>
          <p className="mt-3 text-muted-foreground">
            This dashboard is for the host. If you were invited to eat, use the guest form.
          </p>
          <Button className="mt-6" asChild>
            <Link href={`/r/${event.id}`}>Open the anonymous form</Link>
          </Button>
        </main>
      </div>
    );
  }

  const [responses, restaurants, menuItems] = await Promise.all([
    listResponses(event.id),
    listRestaurants(),
    listMenuItems(),
  ]);
  const match = await matchEvent({ event, responses, restaurants, menuItems });

  return (
    <OverviewDashboard
      event={event}
      match={match}
      responses={responses}
      sharePanel={<SharePanel eventId={event.id} eventName={event.name} />}
    />
  );
}
