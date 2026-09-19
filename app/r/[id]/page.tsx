import { notFound } from "next/navigation";
import { DietForm } from "@/frontend/components/diet-form";
import { ModeBanner } from "@/frontend/components/mode-banner";
import { SiteHeader } from "@/frontend/components/site-header";
import { ParticipantThemeToggle } from "@/frontend/components/participant-theme-toggle";
import { getEvent } from "@/backend/lib/db";

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
        <div className="paper-grain relative rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-6 sm:p-7 shadow-[0_4px_16px_rgba(25,12,6,0.12)] mb-8">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className="ink-stamp px-2 py-0.5 text-[9px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)]">
              Confidential Guest Manifest
            </span>
            <ParticipantThemeToggle />
          </div>
          <h1 className="font-heading mt-2 text-3xl font-bold text-[var(--dash-text)]">{event.name}</h1>
          <p className="mt-1.5 text-xs text-[var(--dash-text-muted)] font-serif">
            {event.location} · {new Date(event.date).toLocaleDateString()}
          </p>
          <div className="mt-4 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-xs text-[var(--dash-text-soft)] font-serif leading-relaxed">
            <strong className="text-[var(--dash-text)]">Zero names on file.</strong> DietRe records what you cannot eat, not who you are. Email is strictly optional and only used if the host has nothing that works for you.
          </div>
        </div>
        <DietForm eventId={event.id} />
      </main>
    </div>
  );
}
