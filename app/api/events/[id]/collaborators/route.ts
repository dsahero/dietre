import { NextResponse } from "next/server";
import { isEventMember, isEventOwner } from "@/backend/lib/access";
import { getSession, hostIdFromEmail } from "@/backend/lib/auth";
import { deleteInvite, getEventLean, getHost, inviteDocId, patchEventLean } from "@/backend/lib/db";

// Removes a collaborator or cancels a pending invite. Any member may do it,
// except that nobody can remove the owner.
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await context.params;
  const event = await getEventLean(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (!isEventMember(session, event)) {
    return NextResponse.json({ error: "You don't have access to this event." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });

  // The owner is protected: match by their account id and by their account email.
  if (hostIdFromEmail(email) === event.host_id) {
    return NextResponse.json({ error: "The owner can't be removed." }, { status: 403 });
  }
  const owner = await getHost(event.host_id).catch(() => null);
  if (owner && owner.email.trim().toLowerCase() === email) {
    return NextResponse.json({ error: "The owner can't be removed." }, { status: 403 });
  }
  if (isEventOwner(session, event) && email === session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "The owner can't be removed." }, { status: 403 });
  }

  const wasCollaborator = (event.collaborator_emails ?? []).includes(email);
  const wasPending = (event.pending_invites ?? []).some((invite) => invite.email === email);
  if (!wasCollaborator && !wasPending) {
    return NextResponse.json({ error: "That person isn't on this event." }, { status: 404 });
  }

  const updated = await patchEventLean(event.id, {
    collaborators: (event.collaborators ?? []).filter((c) => c.email !== email),
    collaborator_emails: (event.collaborator_emails ?? []).filter((e) => e !== email),
    pending_invites: (event.pending_invites ?? []).filter((invite) => invite.email !== email),
  });
  if (wasPending) await deleteInvite(inviteDocId(email, event.id));

  return NextResponse.json({
    ok: true,
    collaborators: updated?.collaborators ?? [],
    pending_invites: updated?.pending_invites ?? [],
  });
}
