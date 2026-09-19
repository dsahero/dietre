import { NextResponse } from "next/server";
import { decodeFirebaseJwt, hostIdFromEmail, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/backend/lib/auth";
import { hasFirebase } from "@/shared/lib/config";
import type { HostSession } from "@/shared/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    name?: string;
    firebaseToken?: string;
  };

  let session: HostSession | null = null;

  if (body.firebaseToken && hasFirebase()) {
    const decoded = decodeFirebaseJwt(body.firebaseToken);
    if (decoded?.email || decoded?.uid) {
      const email = decoded.email || `${decoded.uid}@firebase.local`;
      session = {
        host_id: decoded.uid,
        email,
        name: decoded.name || body.name,
        provider: "firebase",
      };
    }
  }

  if (!session) {
    const email = body.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email to continue as a host." }, { status: 400 });
    }
    session = {
      host_id: hostIdFromEmail(email),
      email,
      name: body.name,
      provider: "mock",
    };
  }

  const response = NextResponse.json({ host: session });
  response.cookies.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
  return response;
}
