"use client";

import { JoinEventChat } from "@/frontend/components/join-event-chat";

interface ParticipantViewProps {
  eventId: string;
  eventName: string;
  hostName: string;
}

export function ParticipantView({ eventId, eventName, hostName }: ParticipantViewProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="font-serif italic text-xs text-[var(--dash-text-muted)]">
          A short conversation with Concierge — we&apos;ll take down your dietary parameters and
          complex restrictions.
        </p>
        <span className="hidden sm:inline-flex items-center rounded-xs border border-[var(--dash-border)] bg-[var(--dash-surface)] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--dash-accent)]">
          Concierge
        </span>
      </div>
      <JoinEventChat eventId={eventId} eventName={eventName} hostName={hostName} />
    </div>
  );
}
