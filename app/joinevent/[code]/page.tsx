import { notFound } from "next/navigation";
import { getEvent, getHost } from "@/backend/lib/db";
import { JoinEventChat } from "@/frontend/components/join-event-chat";
import { ParticipantThemeToggle } from "@/frontend/components/participant-theme-toggle";
import { DietreLogo } from "@/frontend/components/dietre-logo";
import { MapPin, CalendarDays, Users, Stamp, MessageSquareText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function JoinEventPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const event = await getEvent(code);
  if (!event) notFound();

  // Try to get the host's name for the invite message
  const host = await getHost(event.host_id).catch(() => null);
  const hostName = host?.name ?? "Someone";
  const firstName = hostName.split(" ")[0];

  const eventDate = new Date(event.date);
  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = eventDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[var(--dash-bg)] text-[var(--dash-text)]">
      {/* Top brand bar */}
      <header className="border-b border-[var(--dash-border)] bg-[var(--dash-surface)] px-6 py-3">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2.5">
          <div className="flex items-center">
            <DietreLogo className="h-7 w-auto text-[var(--dash-text)]" />
          </div>
          <ParticipantThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        {/* Invite card — a physical cardstock dinner invitation, not a login gate */}
        <div className="paper-grain relative mb-10 rounded-xs border-2 border-[var(--dash-border-strong)] bg-[var(--dash-surface-raised)] p-7 sm:p-8 shadow-[0_4px_12px_rgba(25,12,6,0.12),0_20px_40px_rgba(15,8,4,0.3)]">
          {/* Subtle embossed inner frame */}
          <div className="pointer-events-none absolute inset-2 border border-dashed border-[var(--dash-border)]" />

          <span className="ink-stamp absolute -top-3 right-6 flex items-center gap-1.5 bg-[var(--dash-surface-raised)] px-2.5 py-1 text-[9.5px] font-bold text-[var(--dash-accent)] border-[var(--dash-accent)] shadow-2xs">
            <Stamp className="h-3 w-3" />
            Confidential Banquet Manifest
          </span>

          {/* Invite header */}
          <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--dash-accent)]">
            Table Invitation
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl leading-snug text-[var(--dash-text)]">
            {firstName} invited you to
          </h1>
          <h2 className="font-heading mt-1.5 text-3xl sm:text-4xl leading-tight text-[var(--dash-accent-soft)]">
            {event.name}
          </h2>

          <hr className="deckle-divider my-6" />

          {/* Event details */}
          <div className="flex flex-col gap-2.5 text-sm text-[var(--dash-text-soft)]">
            <div className="flex items-center gap-2.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span className="font-serif">
                <strong className="text-[var(--dash-text)]">{dateStr}</strong> at {timeStr}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span className="font-serif text-[var(--dash-text)]">{event.location}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span className="font-serif">
                Expecting around <strong className="text-[var(--dash-text)]">{event.expected_headcount} guests</strong>
              </span>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-6 rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3.5 text-xs leading-relaxed text-[var(--dash-text-muted)] font-serif">
            <strong className="text-[var(--dash-text-soft)] font-sans">Zero names on file.</strong> DietRe records what you cannot eat, not who you are. The host sees dietary requirements, not identities.
          </div>
        </div>

        {/* Chat section */}
        <div className="mb-3 flex items-center gap-2 px-1">
          <MessageSquareText className="h-4 w-4 text-[var(--dash-accent)] stroke-[1.75]" />
          <p className="text-sm font-semibold text-[var(--dash-text-soft)] font-serif">
            A short intake conversation — no forms, no checkboxes
          </p>
        </div>

        <JoinEventChat
          eventId={event.id}
          eventName={event.name}
          hostName={hostName}
        />

        <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-wider text-[var(--dash-text-muted)]">
          Anonymous by design · dietre never identifies you
        </p>
      </main>
    </div>
  );
}

