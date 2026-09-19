import { notFound } from "next/navigation";
import { DietForm } from "@/components/diet-form";
import { ModeBanner } from "@/components/mode-banner";
import { SiteHeader } from "@/components/site-header";
import { getEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader quiet />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <p className="text-sm font-medium tracking-wide text-primary uppercase">Anonymous guest form</p>
        <h1 className="font-heading mt-2 text-3xl">{event.name}</h1>
        <p className="mt-2 text-muted-foreground">
          {event.location} · {new Date(event.date).toLocaleString()}
        </p>
        <p className="mt-4 mb-8 rounded-lg bg-secondary/80 p-3 text-sm">
          There is no name field. DietRe stores what you cannot eat, not who you are. Email is optional and only used if
          the host has nothing that works.
        </p>
        <DietForm eventId={event.id} />
      </main>
    </div>
  );
}
