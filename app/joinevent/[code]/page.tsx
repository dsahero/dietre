import { notFound } from "next/navigation";
import { getEvent, getHost } from "@/backend/lib/db";
import { JoinEventChat } from "@/frontend/components/join-event-chat";
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
    <div className="min-h-screen bg-[#1a1210] text-white">
      {/* Top brand bar */}
      <header className="border-b border-[#2a1e1a] bg-[#160f0d] px-6 py-3">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#d98b58] via-[#b8744b] to-[#733f20]">
            <UtensilsCrossed className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wider text-white uppercase font-serif">
            DietRe
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-10">
        {/* Invite card */}
        <div className="mb-8 rounded-2xl border border-[#3a2822] bg-[#231a17] p-6">
          {/* Invite header */}
          <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#b8744b]">
            You&apos;re invited
          </div>
          <h1 className="text-2xl font-bold text-white leading-snug">
            {firstName} invited you to
          </h1>
          <h2 className="mt-1 text-3xl font-bold text-[#d88c5e] leading-tight">
            {event.name}
          </h2>

          {/* Event details */}
          <div className="mt-5 flex flex-col gap-2 text-sm text-[#a0928c]">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#b8744b]" />
              <span>
                <span className="font-medium text-[#ddd6d2]">{dateStr}</span> at {timeStr}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-[#b8744b]" />
              <span className="font-medium text-[#ddd6d2]">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[#b8744b]" />
              <span>
                Expecting around{" "}
                <span className="font-medium text-[#ddd6d2]">{event.expected_headcount} people</span>
              </span>
            </div>
          </div>

          {/* Privacy note */}
          <div className="mt-5 rounded-xl border border-[#2d1e19] bg-[#1a1210] px-4 py-3 text-xs text-[#8e7e78] leading-relaxed">
            🔒 <strong className="text-[#a0928c]">100% anonymous.</strong> We only collect what you
            can&apos;t eat — never your name. The host sees dietary rules, not identities.
          </div>
        </div>

        {/* Chat section */}
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#d98b58] via-[#b8744b] to-[#733f20]">
            <UtensilsCrossed className="h-3 w-3 text-white" />
          </div>
          <p className="text-sm font-semibold text-[#ded3cd]">
            Chat with our AI to share your dietary needs
          </p>
        </div>

        <JoinEventChat
          eventId={event.id}
          eventName={event.name}
          hostName={hostName}
        />

        <p className="mt-4 text-center text-[11px] text-[#5a4a44]">
          Powered by Gemini · Responses are anonymous · DietRe never identifies you
        </p>
      </main>
    </div>
  );
}

