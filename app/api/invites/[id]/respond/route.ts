import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { deleteInvite, getEventLean, getInvite, patchEventLean } from "@/backend/lib/db";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "accept" && body.action !== "decline") {
    return NextResponse.json({ error: "Choose accept or decline." }, { status: 400 });
  }

  const invite = await getInvite(decodeURIComponent(id));
  const email = session.email.trim().toLowerCase();
  if (!invite || invite.email !== email) {
    return NextResponse.json({ error: "That invitation isn't available." }, { status: 404 });
  }

  const event = await getEventLean(invite.event_id);
  if (event) {
    const pending = (event.pending_invites ?? []).filter((item) => item.email !== email);
    if (body.action === "accept") {
      const already = (event.collaborator_emails ?? []).includes(email);
      await patchEventLean(event.id, {
        pending_invites: pending,
        collaborators: already
          ? event.collaborators
          : [
              ...(event.collaborators ?? []),
              {
                email,
                host_id: session.host_id,
                name: session.name?.trim() || undefined,
                added_at: new Date().toISOString(),
                added_by: invite.invited_by_id,
              },
            ],
        collaborator_emails: already ? event.collaborator_emails : [...(event.collaborator_emails ?? []), email],
      });
    } else {
      await patchEventLean(event.id, { pending_invites: pending });
    }
  }
  await deleteInvite(invite.id);

  return NextResponse.json({ ok: true, event_id: body.action === "accept" && event ? event.id : null });
}
