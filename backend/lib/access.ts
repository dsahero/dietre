import { DEMO_EVENT_ID } from "@/backend/data/seed";
import type { DietreEvent, HostSession } from "@/shared/lib/types";

function sessionEmail(session: HostSession | null): string {
  return session?.email?.trim().toLowerCase() ?? "";
}

/** The account that created the event. */
export function isEventOwner(session: HostSession | null, event: DietreEvent): boolean {
  return Boolean(session && session.host_id === event.host_id);
}

/** Owner or an accepted collaborator (same permissions, minus deleting the event / removing the owner). */
export function isEventMember(session: HostSession | null, event: DietreEvent): boolean {
  if (!session) return false;
  if (event.id === DEMO_EVENT_ID) return true;
  if (isEventOwner(session, event)) return true;
  const email = sessionEmail(session);
  return Boolean(email && (event.collaborator_emails ?? []).includes(email));
}
