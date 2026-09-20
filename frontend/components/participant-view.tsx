"use client";

import { JoinEventChat } from "@/frontend/components/join-event-chat";

interface ParticipantViewProps {
  eventId: string;
  eventName: string;
  hostName: string;
}

export function ParticipantView({ eventId, eventName, hostName }: ParticipantViewProps) {
  return <JoinEventChat eventId={eventId} eventName={eventName} hostName={hostName} />;
}
