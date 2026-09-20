import { NextResponse } from "next/server";
import { isEventMember } from "@/backend/lib/access";
import { getSession } from "@/backend/lib/auth";
import { createInvite, getEventLean, patchEventLean } from "@/backend/lib/db";
import { appUrl, sendCollaborationInvite } from "@/backend/lib/mailer";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await context.params;
  const event = await getEventLean(id);
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (!isEventMember(session, event)) {
    return NextResponse.json({ error: "Only people on this event can share it." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (email === session.email.trim().toLowerCase()) {
    return NextResponse.json({ error: "You already have access to this event." }, { status: 400 });
  }
  if ((event.collaborator_emails ?? []).includes(email)) {
    return NextResponse.json({ error: "That person already has access." }, { status: 409 });
  }
  if ((event.pending_invites ?? []).some((invite) => invite.email === email)) {
    return NextResponse.json({ error: "That person has already been invited." }, { status: 409 });
  }

  const inviterName = session.name?.trim() || session.email;
  const invitedAt = new Date().toISOString();

  await patchEventLean(event.id, {
    pending_invites: [
      ...(event.pending_invites ?? []),
      { email, invited_by_name: inviterName, invited_at: invitedAt },
    ],
  });
  await createInvite({
    email,
    event_id: event.id,
    event_name: event.name,
    invited_by_id: session.host_id,
    invited_by_name: inviterName,
    invited_at: invitedAt,
  });

  const mail = await sendCollaborationInvite({
    to: email,
    inviterName,
    eventName: event.name,
    baseUrl: appUrl(request),
  });

  return NextResponse.json({ ok: true, email_sent: mail.sent, email_note: mail.reason ?? null });
}
