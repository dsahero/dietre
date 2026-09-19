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

  return (
    <div className="flex min-h-full flex-col">
      <ModeBanner />
      <SiteHeader quiet />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <div className="paper-grain relative rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-6 sm:p-7 shadow-[0_4px_16px_rgba(25,12,6,0.12)] mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="ink-stamp px-2 py-0.5 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)]">
              Guest Dietary Intake
            </span>
            <ParticipantThemeToggle />
          </div>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--dash-text)]">{event.name}</h1>
          <p className="mt-1.5 text-xs text-[var(--dash-text-muted)] font-serif">
            {event.location} · {new Date(event.date).toLocaleDateString()}
          </p>
          <div className="mt-4 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-xs text-[var(--dash-text-soft)] font-serif leading-relaxed">
            Choose your preferred intake method below: converse with the <strong>Concierge Chatbot</strong> or use the <strong>Direct Form</strong>. We&apos;ll record your requirements so the host can find catering that accommodates you safely.
          </div>
        </div>
        <ParticipantView eventId={event.id} eventName={event.name} hostName={hostName} />
      </main>
    </div>
  );
}
