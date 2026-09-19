import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE, sessionCookieOptions, signSession, verifyPassword } from "@/backend/lib/auth";
import { createHost, deleteHost, getHost, updateHost } from "@/backend/lib/db";
import type { HostRecord } from "@/shared/lib/types";

function omitPasswordHash(host: HostRecord): Omit<HostRecord, "password_hash"> {
  const rest: Partial<HostRecord> = { ...host };
  delete rest.password_hash;
  return rest as Omit<HostRecord, "password_hash">;
}

// Data URLs are base64, ~4/3 the size of the original file. Cap around 1.5MB
// of encoded text, so the underlying image stays well under ~1MB — small
// enough for a MongoDB document or the local JSON store, plenty for an
// avatar the client already resizes before upload.
const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;

async function requireSession() {
  const session = await getSession();
  if (!session) return null;
  return session;
}

export async function GET() {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let host = await getHost(session.host_id);
  if (!host) {
    // Legacy or edge-case session with no profile record yet — create one.
    const now = new Date().toISOString();
    host = await createHost({
      host_id: session.host_id,
      email: session.email,
      name: session.name || session.email,
      provider: session.provider,
      created_at: now,
      updated_at: now,
    });
  }

  return NextResponse.json({ profile: omitPasswordHash(host) });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json()) as { name?: string; avatar_data_url?: string | null };
  const patch: Parameters<typeof updateHost>[1] = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name can't be empty." }, { status: 400 });
    patch.name = name;
  }
  if (body.avatar_data_url !== undefined) {
    if (body.avatar_data_url && body.avatar_data_url.length > MAX_AVATAR_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "That image is too large. Try a smaller photo." }, { status: 400 });
    }
    patch.avatar_data_url = body.avatar_data_url ?? undefined;
  }

  const updated = await updateHost(session.host_id, patch);
  if (!updated) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  // Keep the session cookie's display name in sync so it's fresh without a
  // fresh login.
  if (patch.name) {
    const newSession = { ...session, name: patch.name };
    const response = NextResponse.json({ profile: omitPasswordHash(updated) });
    response.cookies.set(SESSION_COOKIE, signSession(newSession), sessionCookieOptions());
    return response;
  }

  return NextResponse.json({ profile: omitPasswordHash(updated) });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (session.provider === "mock") {
    const body = (await request.json().catch(() => ({}))) as { password?: string };
    const host = await getHost(session.host_id);
    if (!host || !verifyPassword(body.password ?? "", host.password_hash)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
  }

  await deleteHost(session.host_id);
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
