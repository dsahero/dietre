import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_EVENT_ID } from "@/backend/data/seed";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listResponses, listRestaurants } from "@/backend/lib/db";
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
  const isHost = session?.host_id === event.host_id || event.id === DEMO_EVENT_ID;

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
  const match = matchEvent({ event, responses, restaurants, menuItems });

  return (
    <OverviewDashboard
      event={event}
      match={match}
      responses={responses}
      sharePanel={<SharePanel eventId={event.id} eventName={event.name} />}
    />
  );
}
