import { redirect } from "next/navigation";
import { EventForm } from "@/frontend/components/event-form";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { getSession } from "@/backend/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <h1 className="font-heading text-3xl">Create an event</h1>
        <p className="mt-2 mb-8 text-muted-foreground">
          Location geocodes against known Blacksburg / VT landmarks. Restaurants outside the radius still appear, just
          demoted.
        </p>
        <EventForm />
      </main>
    </div>
  );
}
