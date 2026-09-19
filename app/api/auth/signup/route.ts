import { NextResponse } from "next/server";
import { hashPassword, hostIdFromEmail, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/backend/lib/auth";
import { createHost, getHost } from "@/backend/lib/db";
import type { HostRecord, HostSession } from "@/shared/lib/types";

// Local/mock account creation. Firebase sign-up goes through the Firebase
// client SDK directly and lands in /api/auth/login with a firebaseToken —
// this route only ever creates provider "mock" hosts.
export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const password = body.password ?? "";

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const host_id = hostIdFromEmail(email);
  const existing = await getHost(host_id);
  if (existing) {
    return NextResponse.json(
      { error: "An account already exists for that email. Sign in instead." },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const host: HostRecord = {
    host_id,
    email,
    name,
    provider: "mock",
    password_hash: hashPassword(password),
    created_at: now,
    updated_at: now,
  };
  await createHost(host);

  const session: HostSession = { host_id, email, name, provider: "mock" };
  const response = NextResponse.json({ host: session });
  response.cookies.set(SESSION_COOKIE, signSession(session), sessionCookieOptions());
  return response;
}
