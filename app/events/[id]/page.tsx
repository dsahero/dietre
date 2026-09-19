import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_EVENT_ID } from "@/backend/data/seed";
import { EventMap } from "@/frontend/components/event-map";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { RestaurantRank } from "@/frontend/components/restaurant-rank";
import { SharePanel } from "@/frontend/components/share-panel";
import { SiteHeader } from "@/frontend/components/site-header";
import { ZeroMatchPanel } from "@/frontend/components/zero-match-panel";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { getSession } from "@/backend/lib/auth";
import { getEvent, listMenuItems, listResponses, listRestaurants } from "@/backend/lib/db";
import { matchEvent } from "@/backend/lib/matching";

export const dynamic = "force-dynamic";

export default async function EventDashboard({
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
  const top = match.restaurants.find((item) => item.within_radius && item.within_budget);

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {event.id === DEMO_EVENT_ID ? <Badge>Seeded demo</Badge> : null}
              <Badge variant="outline">{event.budget_range}</Badge>
              <Badge variant="outline">{event.radius} mile radius</Badge>
            </div>
            <h1 className="font-heading text-3xl md:text-4xl">{event.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {event.location} · {new Date(event.date).toLocaleString()} · {event.expected_headcount} expected
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/map">Interactive Map Explorer</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/r/${event.id}`}>Preview guest form</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Responses in</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {match.response_count}
                <span className="text-base font-normal text-muted-foreground"> / {event.expected_headcount}</span>
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Top weighted cover</CardDescription>
              <CardTitle className="text-3xl tabular-nums">
                {top ? `${top.weighted_coverage_pct}%` : "—"}
              </CardTitle>
              <CardDescription>{top ? top.restaurant.name : "Waiting on responses"}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Zero-match guests</CardDescription>
              <CardTitle className="text-3xl tabular-nums">{match.zero_matches.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <SharePanel eventId={event.id} eventName={event.name} />
        <ZeroMatchPanel alerts={match.zero_matches} />
        <EventMap event={event} restaurants={match.restaurants} />

        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-2xl">Ranked restaurants</h2>
            <p className="text-sm text-muted-foreground">
              Weighted so high-severity restrictions count 3×, religious/ethical 2×, taste 1×. Low-confidence items do
              not cover medical allergies.
            </p>
          </div>
          {responses.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No responses yet</CardTitle>
                <CardDescription>Share the guest link. Rankings appear after the first submit.</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <RestaurantRank matches={match.restaurants} />
          )}
        </section>
      </main>
    </div>
  );
}
