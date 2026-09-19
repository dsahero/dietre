import { NextResponse } from "next/server";
import {
  decodeFirebaseJwt,
  hostIdFromEmail,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
  verifyPassword,
} from "@/backend/lib/auth";
import { createHost, getHost } from "@/backend/lib/db";
import { hasFirebase } from "@/shared/lib/config";
import type { HostSession } from "@/shared/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    firebaseToken?: string;
  };

  let session: HostSession | null = null;

  if (body.firebaseToken && hasFirebase()) {
    const decoded = decodeFirebaseJwt(body.firebaseToken);
    if (decoded?.email || decoded?.uid) {
      const email = decoded.email || `${decoded.uid}@firebase.local`;
      const name = decoded.name || body.name;
      session = {
        host_id: decoded.uid,
        email,
        name,
        provider: "firebase",
      };

      // Firebase owns the credential; we still keep a HostRecord so
      // profile data (display name, avatar) has somewhere to live.
      const existing = await getHost(decoded.uid);
      if (!existing) {
        const now = new Date().toISOString();
        await createHost({
          host_id: decoded.uid,
          email,
          name: name || email,
          provider: "firebase",
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  if (!session) {
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email to continue as a host." }, { status: 400 });
    }
    if (!body.password) {
      return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    }

    const host = await getHost(hostIdFromEmail(email));
    if (!host) {
      return NextResponse.json(
        { error: "No account found for that email. Create one first." },
        { status: 404 }
      );
    }
    if (!verifyPassword(body.password, host.password_hash)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    session = {
      host_id: host.host_id,
      email: host.email,
      name: host.name,
      provider: "mock",
    };
  }

  const response = NextResponse.json({ host: session });
  response.cookies.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
  return response;
}
