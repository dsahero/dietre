import Link from "next/link";
import { redirect } from "next/navigation";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/frontend/components/ui/card";
import { getSession } from "@/backend/lib/auth";
import { listEventsByHost } from "@/backend/lib/db";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const events = await listEventsByHost(session.host_id);

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl">Your events</h1>
            <p className="mt-1 text-muted-foreground">Signed in as {session.email}</p>
          </div>
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        </div>
        {events.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No events yet</CardTitle>
              <CardDescription>
                Create one for a Blacksburg gathering, or inspect the seeded{" "}
                <Link className="underline" href="/events/demo-vt-hacks">
                  VT Hacks demo dashboard
                </Link>
                .
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.id}`} className="block">
                  <Card className="transition hover:ring-foreground/20">
                    <CardHeader>
                      <CardTitle>{event.name}</CardTitle>
                      <CardDescription>
                        {event.location} · {event.expected_headcount} expected · {event.budget_range}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
