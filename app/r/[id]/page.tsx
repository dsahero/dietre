import { notFound } from "next/navigation";
import { ParticipantView } from "@/frontend/components/participant-view";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { ParticipantThemeToggle } from "@/frontend/components/participant-theme-toggle";
import { getEvent, getHost } from "@/backend/lib/db";

export const dynamic = "force-dynamic";

export default async function ResponderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  const host = await getHost(event.host_id).catch(() => null);
  const hostName = host?.name ?? "Event Host";
  const firstName = hostName.split(" ")[0];

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader quiet />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="paper-grain relative mb-6 rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-6 shadow-[0_4px_16px_rgba(25,12,6,0.12)] sm:p-7">
          <div className="mb-3 flex justify-end">
            <ParticipantThemeToggle />
          </div>
          <h1 className="font-heading text-2xl leading-snug font-bold text-[var(--dash-text)] sm:text-3xl">
            {firstName} invited you to
          </h1>
          <h2 className="font-heading mt-1.5 text-3xl leading-tight text-[var(--dash-accent-soft)] sm:text-4xl">
            {event.name}
          </h2>
          <p className="mt-2 font-serif text-xs text-[var(--dash-text-muted)]">
            {event.location} · {new Date(event.date).toLocaleDateString()}
          </p>
        </div>
        <ParticipantView eventId={event.id} eventName={event.name} hostName={hostName} />
      </main>
    </div>
  );
}
