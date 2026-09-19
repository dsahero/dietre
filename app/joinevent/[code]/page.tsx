import { notFound } from "next/navigation";
import { getEvent, getHost } from "@/backend/lib/db";
import { JoinEventChat } from "@/frontend/components/join-event-chat";
import { ParticipantThemeToggle } from "@/frontend/components/participant-theme-toggle";
import { UtensilsCrossed, MapPin, CalendarDays, Users } from "lucide-react";

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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--dash-accent-soft)] via-[var(--dash-accent)] to-[var(--dash-accent-deep)]">
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-wider text-[var(--dash-text)] font-heading">
              dietre
            </span>
          </div>
          <ParticipantThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        {/* Invite card */}
        <div className="mb-8 rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-surface-raised)] p-6">
          {/* Invite header */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--dash-accent)]">
            You&apos;re invited
          </div>
          <h1 className="text-2xl font-bold text-[var(--dash-text)] leading-snug">
            {firstName} invited you to
          </h1>
          <h2 className="mt-1 text-3xl font-bold text-[var(--dash-accent-soft)] leading-tight">
            {event.name}
          </h2>

          {/* Event details */}
          <div className="mt-5 flex flex-col gap-2 text-sm text-[var(--dash-text-muted)]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span>
                <span className="font-medium text-[var(--dash-text-soft)]">{dateStr}</span> at {timeStr}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span className="font-medium text-[var(--dash-text-soft)]">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[var(--dash-accent)]" />
              <span>
                Expecting around{" "}
                <span className="font-medium text-[var(--dash-text-soft)]">{event.expected_headcount} people</span>
              </span>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-5 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] px-4 py-3 text-xs text-[var(--dash-text-muted)] leading-relaxed">
            🔒 <strong className="text-[var(--dash-text-muted)]">100% anonymous.</strong> We only collect what you
            can&apos;t eat — never your name. The host sees dietary rules, not identities.
          </div>
        </div>

        {/* Chat section */}
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--dash-accent-soft)] via-[var(--dash-accent)] to-[var(--dash-accent-deep)]">
            <UtensilsCrossed className="h-3 w-3 text-white" />
          </div>
          <p className="text-sm font-semibold text-[var(--dash-text-soft)]">
            Chat with our AI to share your dietary needs
          </p>
        </div>

        <JoinEventChat
          eventId={event.id}
          eventName={event.name}
          hostName={hostName}
        />

        <p className="mt-4 text-center text-[11px] text-[var(--dash-text-muted)]">
          Powered by Gemini · Responses are anonymous · dietre never identifies you
        </p>
      </main>
    </div>
  );
}

