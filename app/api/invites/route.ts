import { NextResponse } from "next/server";
import { getSession } from "@/backend/lib/auth";
import { listInvitesForEmail } from "@/backend/lib/db";

// One query by email; signed-out visitors never reach the database.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ invites: [] }, { status: 401 });
  try {
    const invites = await listInvitesForEmail(session.email);
    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        event_id: invite.event_id,
        event_name: invite.event_name,
        invited_by_name: invite.invited_by_name,
        invited_at: invite.invited_at,
      })),
    });
  } catch (err) {
    console.error("invites list failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ invites: [] });
  }
}
